using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Host;

public static class UseCases
{
    public static IServiceCollection AddZappyUseCases(this IServiceCollection services)
    {
        services.AddSingleton<IClock, SystemClock>();

        services.AddScoped<ListProducts>();
        services.AddScoped<FindProduct>();
        services.AddScoped<ListCategories>();

        services.AddScoped<VisitorCart>();
        services.AddScoped<ReadCart>();
        services.AddScoped<AddToCart>();
        services.AddScoped<ChangeCartLineQuantity>();
        services.AddScoped<RemoveCartLine>();
        services.AddScoped<ApplyPromotionCode>();
        services.AddScoped<RemovePromotionCode>();

        services.AddScoped<WishlistOwner>();
        services.AddScoped<WishlistProducts>();
        services.AddScoped<ReadWishlist>();
        services.AddScoped<AddToWishlist>();
        services.AddScoped<RemoveFromWishlist>();
        services.AddScoped<StartSession>();
        services.AddScoped<MergeAnonymousCart>();
        services.AddScoped<MergeAnonymousWishlist>();
        services.AddScoped<RegisterCustomer>();
        services.AddScoped<LogIn>();
        services.AddScoped<RefreshSession>();
        services.AddScoped<LogOut>();
        services.AddScoped<RevokeSession>();
        services.AddScoped<ReadCustomer>();
        services.AddScoped<ListSessions>();

        services.AddScoped<PlaceOrder>();
        services.AddScoped<ListOrders>();
        services.AddScoped<FindOrder>();
        services.AddScoped<ResetSeed>();

        services.AddScoped<IDomainEventDispatcher, DomainEventDispatcher>();
        services.AddScoped<IDomainEventHandler<OrderPlaced>, SendOrderConfirmation>();
        services.AddScoped<IDomainEventHandler<OrderPlaced>, RecordPromotionUse>();

        return services;
    }
}
