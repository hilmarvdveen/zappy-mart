using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Zappy.Adapters.Persistence;

public sealed class MomentAsTicks : ValueConverter<DateTimeOffset, long>
{
    public MomentAsTicks()
        : base(moment => moment.UtcTicks, ticks => new DateTimeOffset(ticks, TimeSpan.Zero))
    {
    }
}
