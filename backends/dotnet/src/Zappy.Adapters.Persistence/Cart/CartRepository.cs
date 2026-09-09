using Microsoft.EntityFrameworkCore;
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Adapters.Persistence;

public sealed class CartRepository(ZappyDbContext database) : ICartRepository
{
    public async Task<Cart?> WithId(string id, CancellationToken cancellationToken) =>
        await WithLinesAndPromotion().SingleOrDefaultAsync(cart => cart.Id == id, cancellationToken);

    public async Task<Cart?> OfCustomer(string customerId, CancellationToken cancellationToken) =>
        await WithLinesAndPromotion().FirstOrDefaultAsync(cart => cart.CustomerId == customerId, cancellationToken);

    public async Task Add(Cart cart, CancellationToken cancellationToken) =>
        await database.Carts.AddAsync(cart, cancellationToken);

    public Task Remove(Cart cart, CancellationToken cancellationToken)
    {
        database.Carts.Remove(cart);
        return Task.CompletedTask;
    }

    private IQueryable<Cart> WithLinesAndPromotion() =>
        database.Carts
            .Include(cart => cart.Lines)
            .ThenInclude(line => line.Product)
            .ThenInclude(product => product.Category)
            .Include(cart => cart.AppliedPromotionCode);
}
