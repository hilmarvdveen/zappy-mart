namespace Zappy.Domain;

public sealed record Result<TValue>
{
    private Result(TValue? value, IReadOnlyList<UserError> errors)
    {
        Value = value;
        Errors = errors;
    }

    public TValue? Value { get; }

    public IReadOnlyList<UserError> Errors { get; }

    public bool Succeeded => Errors.Count == 0;

    public static Result<TValue> Success(TValue value) => new(value, []);

    public static Result<TValue> Failure(UserErrorCode code, string message, string? field = null) =>
        new(default, [new UserError(code, message, field)]);

    public static Result<TValue> Failure(IReadOnlyList<UserError> errors) => new(default, errors);

    public static Result<TValue> Refused(TValue value, UserErrorCode code, string message, string? field = null) =>
        new(value, [new UserError(code, message, field)]);

    public static Result<TValue> Refused(TValue value, IReadOnlyList<UserError> errors) => new(value, errors);
}
