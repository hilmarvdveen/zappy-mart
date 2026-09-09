using Zappy.Application;

namespace Zappy.Adapters.Security;

public sealed class InMemoryRateLimiter(SecuritySettings settings) : IRateLimiter
{
    private readonly Dictionary<string, List<DateTimeOffset>> attemptsByKey = [];

    private readonly Lock guard = new();

    public bool AllowsAttempt(string key, DateTimeOffset moment)
    {
        var window = TimeSpan.FromMinutes(settings.LoginAttemptWindowMinutes);

        lock (guard)
        {
            if (!attemptsByKey.TryGetValue(key, out var attempts))
            {
                attempts = [];
                attemptsByKey[key] = attempts;
            }

            attempts.RemoveAll(attempt => moment - attempt > window);
            if (attempts.Count >= settings.LoginAttemptsAllowed)
            {
                return false;
            }

            attempts.Add(moment);
            return true;
        }
    }

    public void Forget()
    {
        lock (guard)
        {
            attemptsByKey.Clear();
        }
    }
}
