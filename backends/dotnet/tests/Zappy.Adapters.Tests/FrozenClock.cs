using Zappy.Application;

namespace Zappy.Adapters.Tests;

public sealed class FrozenClock(DateTimeOffset now) : IClock
{
    public DateTimeOffset Now { get; } = now;
}
