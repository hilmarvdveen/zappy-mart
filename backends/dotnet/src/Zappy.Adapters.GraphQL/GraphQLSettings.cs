namespace Zappy.Adapters.GraphQL;

public sealed class GraphQLSettings
{
    public const string Section = "GraphQL";

    public string Path { get; set; } = "/graphql";

    public string[] AllowedOrigins { get; set; } =
    [
        "http://localhost:5173",
        "http://localhost:3001",
        "http://localhost:4200"
    ];

    public bool ExposeResetSeed { get; set; }

    public bool IncludeExceptionDetails { get; set; }
}
