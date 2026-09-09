using Zappy.Domain;

namespace Zappy.Application;

public sealed class LogIn(
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
        string password,
        string device,
        string clientAddress,
        CancellationToken cancellationToken) =>
        unitOfWork.RunInOneTransaction(
            async token =>
            {
                var now = clock.Now;
                if (!rateLimiter.AllowsAttempt($"login:{clientAddress}", now) ||
                    !rateLimiter.AllowsAttempt($"login:{email.Trim().ToLowerInvariant()}", now))
                {
                    return Result<Authentication>.Failure(
                        UserErrorCode.RateLimited,
                        "Too many attempts in a short time. Wait a moment and try again.");
                }

                var emailAddress = EmailAddress.Create(email);
                var customer = emailAddress is null ? null : await customers.WithEmail(emailAddress, token);
                if (customer is null)
                {
                    passwordHasher.Hash(password);
                    return WrongCredentials();
                }

                if (!passwordHasher.Matches(password, customer.PasswordHash))
                {
                    return WrongCredentials();
                }

                var authentication = await startSession.Execute(customer, device, token);
                await mergeAnonymousWishlist.Execute(customer, visitor, token);
                await mergeAnonymousCart.Execute(customer, visitor, token);
                return Result<Authentication>.Success(authentication);
            },
            cancellationToken);

    private static Result<Authentication> WrongCredentials() =>
        Result<Authentication>.Failure(
            UserErrorCode.CredentialsInvalid,
            "The email address and the password together do not match a customer.");
}
