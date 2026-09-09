using Zappy.Domain;

namespace Zappy.Application;

public interface ICustomerRepository
{
    Task<Customer?> WithEmail(EmailAddress email, CancellationToken cancellationToken);

    Task<Customer?> WithId(string id, CancellationToken cancellationToken);

    Task Add(Customer customer, CancellationToken cancellationToken);
}
