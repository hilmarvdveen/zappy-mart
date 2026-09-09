using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Adapters.Persistence;

public sealed class SeedLoader(
    ZappyDbContext database,
    IPasswordHasher passwordHasher,
    ProductCatalogueVersion catalogueVersion,
    SeedSettings settings) : ISeedLoader
{
    private static readonly JsonSerializerOptions ReadingOptions = new(JsonSerializerDefaults.Web);

    public async Task<int> LoadFreshSeed(CancellationToken cancellationToken)
    {
        await EmptyTheStore(cancellationToken);

        var folder = SeedDirectory.Find(settings.Directory);
        var categories = await Read<SeedCategory>(Path.Combine(folder, "categories.json"), cancellationToken);
        var products = await Read<SeedProduct>(Path.Combine(folder, "products.json"), cancellationToken);
        var promotionCodes = await Read<SeedPromotionCode>(Path.Combine(folder, "promotion-codes.json"), cancellationToken);
        var customers = await Read<SeedCustomer>(Path.Combine(folder, "customers.json"), cancellationToken);

        for (var position = 0; position < categories.Count; position += 1)
        {
            var category = categories[position];
            database.Categories.Add(new Category(category.Id, category.Name, category.Slug, position + 1));
        }

        for (var position = 0; position < products.Count; position += 1)
        {
            var product = products[position];
            database.Products.Add(new Product(
                product.Id,
                product.Name,
                product.Slug,
                product.Description,
                new Money(product.Price.Amount, product.Price.Currency),
                product.CategorySlug,
                product.Stock,
                product.ImageUrl,
                position + 1));
        }

        foreach (var promotionCode in promotionCodes)
        {
            database.PromotionCodes.Add(new PromotionCode(
                promotionCode.Code,
                KindOf(promotionCode.Kind),
                promotionCode.Percentage,
                MoneyOf(promotionCode.Amount),
                MoneyOf(promotionCode.MinimumSubtotal),
                promotionCode.ValidFrom,
                promotionCode.ValidUntil,
                promotionCode.UsageLimit,
                promotionCode.TimesUsed));
        }

        foreach (var customer in customers)
        {
            var email = EmailAddress.Create(customer.Email)
                ?? throw new InvalidOperationException($"The seed customer {customer.Id} has an invalid email address.");

            database.Customers.Add(new Customer(
                customer.Id,
                email,
                customer.Name,
                passwordHasher.Hash(customer.Password),
                customer.CreatedAt));

            foreach (var productId in customer.Wishlist)
            {
                database.WishlistEntries.Add(new WishlistEntry(customer.Id, productId, customer.CreatedAt));
            }
        }

        await database.SaveChangesAsync(cancellationToken);
        catalogueVersion.Bump();
        return products.Count;
    }

    private async Task EmptyTheStore(CancellationToken cancellationToken)
    {
        await database.OrderLines.ExecuteDeleteAsync(cancellationToken);
        await database.Orders.ExecuteDeleteAsync(cancellationToken);
        await database.CartLines.ExecuteDeleteAsync(cancellationToken);
        await database.Carts.ExecuteDeleteAsync(cancellationToken);
        await database.WishlistEntries.ExecuteDeleteAsync(cancellationToken);
        await database.RefreshTokens.ExecuteDeleteAsync(cancellationToken);
        await database.Sessions.ExecuteDeleteAsync(cancellationToken);
        await database.Customers.ExecuteDeleteAsync(cancellationToken);
        await database.Products.ExecuteDeleteAsync(cancellationToken);
        await database.PromotionCodes.ExecuteDeleteAsync(cancellationToken);
        await database.Categories.ExecuteDeleteAsync(cancellationToken);
        database.ChangeTracker.Clear();
    }

    private static async Task<IReadOnlyList<TSeed>> Read<TSeed>(string path, CancellationToken cancellationToken)
    {
        await using var file = File.OpenRead(path);
        return await JsonSerializer.DeserializeAsync<List<TSeed>>(file, ReadingOptions, cancellationToken)
            ?? throw new InvalidOperationException($"The seed file {path} holds no list.");
    }

    private static Money? MoneyOf(SeedMoney? money) => money is null ? null : new Money(money.Amount, money.Currency);

    private static PromotionKind KindOf(string kind) => kind switch
    {
        "PERCENTAGE" => PromotionKind.Percentage,
        "FIXED_AMOUNT" => PromotionKind.FixedAmount,
        "FREE_SHIPPING" => PromotionKind.FreeShipping,
        _ => throw new InvalidOperationException($"The seed names the unknown promotion kind {kind}.")
    };
}
