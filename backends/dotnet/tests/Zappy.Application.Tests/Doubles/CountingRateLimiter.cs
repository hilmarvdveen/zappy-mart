using Zappy.Application;

namespace Zappy.Application.Tests;

public sealed class CountingRateLimiter(int attemptsAllowed) : IRateLimiter
{
    private readonly Dictionary<string, int> attempts = [];

    public bool AllowsAttempt(string key, DateTimeOffset moment)
    {
        attempts[key] = attempts.GetValueOrDefault(key) + 1;
        return attempts[key] <= attemptsAllowed;
    }

    public void Forget() => attempts.Clear();
}
