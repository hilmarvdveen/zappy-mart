namespace Zappy.Adapters.Tests;

public sealed class ContractSchemaTests(ZappyServer server) : IClassFixture<ZappyServer>
{
    [Fact]
    public async Task TheStoreServesEveryTypeOfTheContract()
    {
        var contract = SchemaShape.Of(await File.ReadAllTextAsync(
            Path.Combine(TheRepository.Root, "contract", "schema.graphql"),
            TestContext.Current.CancellationToken));
        var served = SchemaShape.Of(await server.ServedSchema());

        foreach (var type in contract)
        {
            Assert.True(served.ContainsKey(type.Key), $"The served schema has no type {type.Key}.");

            foreach (var member in type.Value)
            {
                Assert.True(
                    served[type.Key].ContainsKey(member.Key),
                    $"The served type {type.Key} has no member {member.Key}.");
                Assert.Equal($"{type.Key}.{member.Key}{member.Value}", $"{type.Key}.{member.Key}{served[type.Key][member.Key]}");
            }
        }
    }

    [Fact]
    public async Task TheDevelopmentProfileAddsResetSeed()
    {
        var development = SchemaShape.Of(await File.ReadAllTextAsync(
            Path.Combine(TheRepository.Root, "contract", "schema.development.graphql"),
            TestContext.Current.CancellationToken));
        var served = SchemaShape.Of(await server.ServedSchema());

        foreach (var type in development)
        {
            foreach (var member in type.Value)
            {
                Assert.True(
                    served[type.Key].ContainsKey(member.Key),
                    $"The served type {type.Key} has no member {member.Key}.");
                Assert.Equal(member.Value, served[type.Key][member.Key]);
            }
        }
    }
}
