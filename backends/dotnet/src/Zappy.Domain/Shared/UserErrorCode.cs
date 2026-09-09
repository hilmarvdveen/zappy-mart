namespace Zappy.Domain;

public enum UserErrorCode
{
    ProductNotFound,
    OutOfStock,
    QuantityInvalid,
    CartLineNotFound,
    CartEmpty,
    CodeUnknown,
    CodeExpired,
    CodeExhausted,
    CodeMinimumNotMet,
    EmailTaken,
    EmailInvalid,
    PasswordTooShort,
    PasswordTooLong,
    CredentialsInvalid,
    RateLimited,
    SessionInvalid,
    SessionNotFound,
    NotAuthenticated,
    OrderNotFound
}
