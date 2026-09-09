using Zappy.Domain;

namespace Zappy.Application;

public sealed class ReadCustomer(ICustomerRepository customers)
{
    public async Task<Customer?> Execute(Visitor visitor, CancellationToken cancellationToken) =>
        visitor.CustomerId is null ? null : await customers.WithId(visitor.CustomerId, cancellationToken);
}
