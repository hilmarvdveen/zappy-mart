using Zappy.Application;

namespace Zappy.Application.Tests;

public sealed class FixedClock(DateTimeOffset now) : IClock
{
    public DateTimeOffset Now { get; set; } = now;
}
