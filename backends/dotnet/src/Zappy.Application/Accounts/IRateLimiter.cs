namespace Zappy.Application;

public interface IRateLimiter
{
    bool AllowsAttempt(string key, DateTimeOffset moment);

    void Forget();
}
