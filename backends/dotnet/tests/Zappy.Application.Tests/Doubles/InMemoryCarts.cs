using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Application.Tests;

public sealed class InMemoryCarts : ICartRepository
{
    public List<Cart> Carts { get; } = [];

    public Task<Cart?> WithId(string id, CancellationToken cancellationToken) =>
        Task.FromResult(Carts.SingleOrDefault(cart => cart.Id == id));

    public Task<Cart?> OfCustomer(string customerId, CancellationToken cancellationToken) =>
        Task.FromResult(Carts.FirstOrDefault(cart => cart.CustomerId == customerId));

    public Task Add(Cart cart, CancellationToken cancellationToken)
    {
        Carts.Add(cart);
        return Task.CompletedTask;
    }

    public Task Remove(Cart cart, CancellationToken cancellationToken)
    {
        Carts.Remove(cart);
        return Task.CompletedTask;
    }
}
