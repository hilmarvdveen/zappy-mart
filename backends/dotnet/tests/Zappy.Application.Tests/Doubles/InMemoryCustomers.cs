using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Application.Tests;

public sealed class InMemoryCustomers(params Customer[] customers) : ICustomerRepository
{
    public List<Customer> Customers { get; } = [.. customers];

    public Task<Customer?> WithEmail(EmailAddress email, CancellationToken cancellationToken) =>
        Task.FromResult(Customers.SingleOrDefault(customer => customer.Email == email));

    public Task<Customer?> WithId(string id, CancellationToken cancellationToken) =>
        Task.FromResult(Customers.SingleOrDefault(customer => customer.Id == id));

    public Task Add(Customer customer, CancellationToken cancellationToken)
    {
        Customers.Add(customer);
        return Task.CompletedTask;
    }
}
