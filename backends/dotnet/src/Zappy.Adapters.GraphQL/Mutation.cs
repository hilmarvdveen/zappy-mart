using HotChocolate;
using HotChocolate.Types;
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Adapters.GraphQL;

public sealed class Mutation
{
    public async Task<AuthenticationPayload> Register(
        RegisterInput input,
        RegisterCustomer registerCustomer,
        VisitorOfTheRequest visitor,
        CancellationToken cancellationToken)
    {
        var result = await registerCustomer.Execute(
            visitor.Current,
            input.Email,
            input.Name,
            input.Password,
            visitor.DeviceFor(null),
            visitor.ClientAddress,
            cancellationToken);

        RememberSignedInCustomer(visitor, result);
        return AuthenticationPayload.From(result);
    }

    public async Task<AuthenticationPayload> Login(
        LoginInput input,
        LogIn logIn,
        VisitorOfTheRequest visitor,
        CancellationToken cancellationToken)
    {
        var result = await logIn.Execute(
            visitor.Current,
            input.Email,
            input.Password,
            visitor.DeviceFor(input.Device),
            visitor.ClientAddress,
            cancellationToken);

        RememberSignedInCustomer(visitor, result);
        return AuthenticationPayload.From(result);
    }

    public async Task<AuthenticationPayload> RefreshSession(
        RefreshSession refreshSession,
        VisitorOfTheRequest visitor,
        CancellationToken cancellationToken)
    {
        var result = await refreshSession.Execute(visitor.PresentedRefreshToken, cancellationToken);
        if (result.Value is null)
        {
            visitor.ForgetRefreshToken();
        }
        else
        {
            visitor.RememberSession(result.Value.SessionId);
            visitor.RememberRefreshToken(result.Value.RefreshToken, result.Value.RefreshTokenExpiresAt);
        }

        return AuthenticationPayload.From(result);
    }

    public async Task<LogoutPayload> Logout(
        LogOut logOut,
        VisitorOfTheRequest visitor,
        CancellationToken cancellationToken)
    {
        var success = await logOut.Execute(visitor.Current, visitor.PresentedRefreshToken, cancellationToken);
        visitor.ForgetRefreshToken();
        return new LogoutPayload(success, []);
    }

    public async Task<RevokeSessionPayload> RevokeSession(
        [GraphQLType<NonNullType<IdType>>] string sessionId,
        Zappy.Application.RevokeSession revokeSession,
        VisitorOfTheRequest visitor,
        CancellationToken cancellationToken)
    {
        var current = visitor.Current;
        var result = await revokeSession.Execute(current, sessionId, cancellationToken);
        if (result.Succeeded && current.SessionId == sessionId)
        {
            visitor.ForgetRefreshToken();
        }

        return RevokeSessionPayload.From(result);
    }

    public async Task<CartPayload> AddToCart(
        [GraphQLType<NonNullType<IdType>>] string productId,
        [GraphQLType<IntType>][DefaultValue(1)] int? quantity,
        AddToCart addToCart,
        VisitorOfTheRequest visitor,
        CancellationToken cancellationToken) =>
        RememberCart(visitor, await addToCart.Execute(visitor.Current, productId, quantity, cancellationToken));

    public async Task<CartPayload> ChangeCartLineQuantity(
        [GraphQLType<NonNullType<IdType>>] string lineId,
        int quantity,
        ChangeCartLineQuantity changeCartLineQuantity,
        VisitorOfTheRequest visitor,
        CancellationToken cancellationToken) =>
        RememberCart(visitor, await changeCartLineQuantity.Execute(visitor.Current, lineId, quantity, cancellationToken));

    public async Task<CartPayload> RemoveCartLine(
        [GraphQLType<NonNullType<IdType>>] string lineId,
        RemoveCartLine removeCartLine,
        VisitorOfTheRequest visitor,
        CancellationToken cancellationToken) =>
        RememberCart(visitor, await removeCartLine.Execute(visitor.Current, lineId, cancellationToken));

    public async Task<CartPayload> ApplyPromotionCode(
        string code,
        ApplyPromotionCode applyPromotionCode,
        VisitorOfTheRequest visitor,
        CancellationToken cancellationToken) =>
        RememberCart(visitor, await applyPromotionCode.Execute(visitor.Current, code, cancellationToken));

    public async Task<CartPayload> RemovePromotionCode(
        RemovePromotionCode removePromotionCode,
        VisitorOfTheRequest visitor,
        CancellationToken cancellationToken) =>
        RememberCart(visitor, await removePromotionCode.Execute(visitor.Current, cancellationToken));

    public async Task<WishlistPayload> AddToWishlist(
        [GraphQLType<NonNullType<IdType>>] string productId,
        AddToWishlist addToWishlist,
        VisitorOfTheRequest visitor,
        CancellationToken cancellationToken) =>
        RememberWishlistOwner(visitor, await addToWishlist.Execute(visitor.Current, productId, cancellationToken));

    public async Task<WishlistPayload> RemoveFromWishlist(
        [GraphQLType<NonNullType<IdType>>] string productId,
        RemoveFromWishlist removeFromWishlist,
        VisitorOfTheRequest visitor,
        CancellationToken cancellationToken) =>
        RememberWishlistOwner(visitor, await removeFromWishlist.Execute(visitor.Current, productId, cancellationToken));

    public async Task<OrderPayload> PlaceOrder(
        string? idempotencyKey,
        PlaceOrder placeOrder,
        VisitorOfTheRequest visitor,
        CancellationToken cancellationToken) =>
        OrderPayload.From(await placeOrder.Execute(visitor.Current, idempotencyKey, cancellationToken));

    private static CartPayload RememberCart(VisitorOfTheRequest visitor, CartResult result)
    {
        if (!visitor.Current.IsSignedIn)
        {
            visitor.RememberCart(result.Cart.Id);
        }

        return CartPayload.From(result);
    }

    private static WishlistPayload RememberWishlistOwner(VisitorOfTheRequest visitor, WishlistResult result)
    {
        if (result.AnonymousCartId is not null)
        {
            visitor.RememberCart(result.AnonymousCartId);
        }

        return WishlistPayload.From(result);
    }

    private static void RememberSignedInCustomer(
        VisitorOfTheRequest visitor,
        Zappy.Domain.Result<Authentication> result)
    {
        if (result.Value is null)
        {
            return;
        }

        visitor.RememberSession(result.Value.SessionId);
        visitor.RememberRefreshToken(result.Value.RefreshToken, result.Value.RefreshTokenExpiresAt);
        visitor.ForgetCart();
    }
}
