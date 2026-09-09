using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Application.Tests;

public sealed class AccountUseCaseTests
{
    private readonly Store store = new(Store.AProduct());

    [Fact]
    public async Task ARegistrationSignsTheCustomerIn()
    {
        var result = await Register();

        Assert.True(result.Succeeded);
        Assert.Equal("jane@example.com", result.Value!.Customer.Email.Value);
        Assert.Equal(Store.Moment.AddMinutes(15), result.Value.AccessTokenExpiresAt);
        Assert.Single(store.Sessions.Sessions);
    }

    [Fact]
    public async Task APasswordIsNeverStoredInClear()
    {
        await Register();

        Assert.DoesNotContain("correct horse battery staple", store.Customers.Customers.Single().PasswordHash, StringComparison.Ordinal);
    }

    [Fact]
    public async Task AnAddressThatIsNotAnAddressIsRefused()
    {
        var result = await Register(email: "not-an-address");

        Assert.Equal(UserErrorCode.EmailInvalid, result.Errors.Single().Code);
        Assert.Equal("input.email", result.Errors.Single().Field);
    }

    [Fact]
    public async Task AShortPasswordIsRefused()
    {
        var result = await Register(password: "short");

        Assert.Equal(UserErrorCode.PasswordTooShort, result.Errors.Single().Code);
    }

    [Fact]
    public async Task ATakenAddressIsRefused()
    {
        await Register();

        var result = await Register(email: "JANE@example.com");

        Assert.Equal(UserErrorCode.EmailTaken, result.Errors.Single().Code);
    }

    [Fact]
    public async Task AWrongPasswordAnswersOneCodeAndCostsTheSameWork()
    {
        await Register();
        var hashesAfterRegistration = store.PasswordHasher.TimesHashed;

        var wrongPassword = await store.LogIn.Execute(
            Visitor.Anonymous, "jane@example.com", "a wrong password", "a device", "127.0.0.1", CancellationToken.None);
        var unknownCustomer = await store.LogIn.Execute(
            Visitor.Anonymous, "nobody@example.com", "a wrong password", "a device", "127.0.0.1", CancellationToken.None);

        Assert.Equal(UserErrorCode.CredentialsInvalid, wrongPassword.Errors.Single().Code);
        Assert.Equal(UserErrorCode.CredentialsInvalid, unknownCustomer.Errors.Single().Code);
        Assert.Equal(hashesAfterRegistration + 1, store.PasswordHasher.TimesHashed);
    }

    [Fact]
    public async Task TooManyAttemptsAreRateLimited()
    {
        for (var attempt = 0; attempt < 5; attempt += 1)
        {
            await store.LogIn.Execute(
                Visitor.Anonymous, "jane@example.com", "a wrong password", "a device", "127.0.0.1", CancellationToken.None);
        }

        var result = await store.LogIn.Execute(
            Visitor.Anonymous, "jane@example.com", "a wrong password", "a device", "127.0.0.1", CancellationToken.None);

        Assert.Equal(UserErrorCode.RateLimited, result.Errors.Single().Code);
    }

    [Fact]
    public async Task LoggingInTakesOverTheAnonymousCartAndWishlist()
    {
        await Register();
        var customer = store.Customers.Customers.Single();
        await store.AddToCart.Execute(Visitor.Anonymous, "product-18", 2, CancellationToken.None);
        var anonymousCart = store.Carts.Carts.Single(cart => cart.CustomerId is null);
        var anonymousVisitor = new Visitor(null, null, anonymousCart.Id);
        await store.AddToWishlist.Execute(anonymousVisitor, "product-18", CancellationToken.None);

        await store.LogIn.Execute(
            anonymousVisitor,
            "jane@example.com",
            "correct horse battery staple",
            "a device",
            "127.0.0.1",
            CancellationToken.None);

        Assert.Equal(customer.Id, store.Carts.Carts.Single().CustomerId);
        Assert.Equal(customer.Id, store.Wishlist.Entries.Single().OwnerId);
    }

    [Fact]
    public async Task AMergedWishlistAddsAndNeverReplaces()
    {
        await Register();
        var customer = store.Customers.Customers.Single();
        await store.Wishlist.Add(new WishlistEntry(customer.Id, "product-18", Store.Moment), CancellationToken.None);
        var anonymousCart = new Cart("anonymous-cart", null, Store.Moment);
        await store.Carts.Add(anonymousCart, CancellationToken.None);
        await store.Wishlist.Add(new WishlistEntry("anonymous-cart", "product-18", Store.Moment), CancellationToken.None);

        await store.LogIn.Execute(
            new Visitor(null, null, "anonymous-cart"),
            "jane@example.com",
            "correct horse battery staple",
            "a device",
            "127.0.0.1",
            CancellationToken.None);

        Assert.Single(store.Wishlist.Entries);
        Assert.Equal(customer.Id, store.Wishlist.Entries.Single().OwnerId);
    }

    private Task<Result<Authentication>> Register(
        string email = "jane@example.com",
        string password = "correct horse battery staple") =>
        store.RegisterCustomer.Execute(
            Visitor.Anonymous,
            email,
            "Jane Doe",
            password,
            "Chrome on Windows",
            "127.0.0.1",
            CancellationToken.None);
}
