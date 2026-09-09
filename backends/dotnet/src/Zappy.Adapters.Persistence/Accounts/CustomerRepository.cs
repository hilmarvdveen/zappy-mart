using Microsoft.EntityFrameworkCore;
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Adapters.Persistence;

public sealed class CustomerRepository(ZappyDbContext database) : ICustomerRepository
{
    public async Task<Customer?> WithEmail(EmailAddress email, CancellationToken cancellationToken) =>
        await database.Customers.SingleOrDefaultAsync(customer => customer.Email == email, cancellationToken);

    public async Task<Customer?> WithId(string id, CancellationToken cancellationToken) =>
        await database.Customers.SingleOrDefaultAsync(customer => customer.Id == id, cancellationToken);

    public async Task Add(Customer customer, CancellationToken cancellationToken) =>
        await database.Customers.AddAsync(customer, cancellationToken);
}
