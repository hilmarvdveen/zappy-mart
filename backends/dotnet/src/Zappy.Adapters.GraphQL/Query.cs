using HotChocolate;
using HotChocolate.Types;
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Adapters.GraphQL;

public sealed class Query
{
    public async Task<ProductConnection> Products(
        ProductFilter? filter,
        [GraphQLType<IntType>][DefaultValue(ListProducts.DefaultPageSize)] int? first,
        string? after,
        ListProducts listProducts,
        CancellationToken cancellationToken) =>
        ProductConnection.From(await listProducts.Execute(
            new ProductSpecification(filter?.CategorySlug, filter?.NameContains, filter?.InStockOnly ?? false),
            first,
            after,
            cancellationToken));

    public Task<Product?> Product(string slug, FindProduct findProduct, CancellationToken cancellationToken) =>
        findProduct.Execute(slug, cancellationToken);

    public Task<IReadOnlyList<Category>> Categories(
        ListCategories listCategories,
        CancellationToken cancellationToken) =>
        listCategories.Execute(cancellationToken);

    public Task<Cart> Cart(
        ReadCart readCart,
        VisitorOfTheRequest visitor,
        CancellationToken cancellationToken) =>
        readCart.Execute(visitor.Current, cancellationToken);

    public async Task<IReadOnlyList<Product>> Wishlist(
        ReadWishlist readWishlist,
        WishlistOwner wishlistOwner,
        VisitorOfTheRequest visitor,
        CancellationToken cancellationToken) =>
        await readWishlist.Execute(
            await wishlistOwner.Find(visitor.Current, cancellationToken),
            cancellationToken);

    public Task<Customer?> Me(
        ReadCustomer readCustomer,
        VisitorOfTheRequest visitor,
        CancellationToken cancellationToken) =>
        readCustomer.Execute(visitor.Current, cancellationToken);

    public async Task<OrderConnection> Orders(
        [GraphQLType<IntType>][DefaultValue(ListOrders.DefaultPageSize)] int? first,
        string? after,
        ListOrders listOrders,
        VisitorOfTheRequest visitor,
        CancellationToken cancellationToken) =>
        OrderConnection.From(await listOrders.Execute(visitor.Current, first, after, cancellationToken));

    public Task<Order?> Order(
        [GraphQLType<NonNullType<IdType>>] string id,
        FindOrder findOrder,
        VisitorOfTheRequest visitor,
        CancellationToken cancellationToken) =>
        findOrder.Execute(visitor.Current, id, cancellationToken);
}
