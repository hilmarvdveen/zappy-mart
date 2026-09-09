namespace Zappy.Adapters.Persistence;

public sealed class ProductCatalogueVersion
{
    private long current;

    public long Current => Interlocked.Read(ref current);

    public void Bump() => Interlocked.Increment(ref current);
}
