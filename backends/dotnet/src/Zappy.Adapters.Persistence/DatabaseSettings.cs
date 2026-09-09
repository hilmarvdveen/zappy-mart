namespace Zappy.Adapters.Persistence;

public sealed class DatabaseSettings
{
    public const string Section = "Database";

    public const string Sqlite = "Sqlite";

    public const string PostgreSql = "PostgreSql";

    public string Provider { get; set; } = Sqlite;

    public string ConnectionString { get; set; } = "Data Source=zappy-mart.db";

    public bool RunsOnPostgreSql => string.Equals(Provider, PostgreSql, StringComparison.OrdinalIgnoreCase);
}
