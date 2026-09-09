namespace Zappy.Domain;

public static class PasswordPolicy
{
    public const int MinimumLength = 12;

    public const int MaximumLength = 128;

    public static IReadOnlyList<UserError> Check(string password)
    {
        if (password.Length < MinimumLength)
        {
            return
            [
                new UserError(
                    UserErrorCode.PasswordTooShort,
                    $"A password is at least {MinimumLength} characters.",
                    "input.password")
            ];
        }

        if (password.Length > MaximumLength)
        {
            return
            [
                new UserError(
                    UserErrorCode.PasswordTooLong,
                    $"A password is at most {MaximumLength} characters.",
                    "input.password")
            ];
        }

        return [];
    }
}
