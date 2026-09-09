using Zappy.Domain;

namespace Zappy.Application;

public sealed class RegisterCustomer(
    ICustomerRepository customers,
    IPasswordHasher passwordHasher,
    IRateLimiter rateLimiter,
    StartSession startSession,
    MergeAnonymousCart mergeAnonymousCart,
    MergeAnonymousWishlist mergeAnonymousWishlist,
    IUnitOfWork unitOfWork,
    IClock clock)
{
    public Task<Result<Authentication>> Execute(
        Visitor visitor,
        string email,
        string name,
        string password,
        string device,
        string clientAddress,
        CancellationToken cancellationToken) =>
        unitOfWork.RunInOneTransaction(
            async token =>
            {
                var now = clock.Now;
                if (!rateLimiter.AllowsAttempt($"register:{clientAddress}", now) ||
                    !rateLimiter.AllowsAttempt($"register:{email.Trim().ToLowerInvariant()}", now))
                {
                    return Result<Authentication>.Failure(
                        UserErrorCode.RateLimited,
                        "Too many attempts in a short time. Wait a moment and try again.");
                }

                var emailAddress = EmailAddress.Create(email);
                if (emailAddress is null)
                {
                    return Result<Authentication>.Failure(
                        UserErrorCode.EmailInvalid,
                        "The email address is not a valid address.",
                        "input.email");
                }

                var passwordErrors = PasswordPolicy.Check(password);
                if (passwordErrors.Count > 0)
                {
                    return Result<Authentication>.Failure(passwordErrors);
                }

                if (await customers.WithEmail(emailAddress, token) is not null)
                {
                    return Result<Authentication>.Failure(
                        UserErrorCode.EmailTaken,
                        "A customer with that email address is already registered.",
                        "input.email");
                }

                var customer = new Customer(
                    Identifier.New(),
                    emailAddress,
                    name.Trim(),
                    passwordHasher.Hash(password),
                    now);

                await customers.Add(customer, token);
                var authentication = await startSession.Execute(customer, device, token);
                await mergeAnonymousWishlist.Execute(customer, visitor, token);
                await mergeAnonymousCart.Execute(customer, visitor, token);
                return Result<Authentication>.Success(authentication);
            },
            cancellationToken);
}
