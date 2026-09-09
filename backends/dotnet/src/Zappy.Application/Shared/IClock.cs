namespace Zappy.Application;

public interface IClock
{
    DateTimeOffset Now { get; }
}
