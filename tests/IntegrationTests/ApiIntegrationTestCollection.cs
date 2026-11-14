using Xunit;

namespace IntegrationTests;

[CollectionDefinition(Name, DisableParallelization = true)]
public sealed class ApiIntegrationTestCollection
{
    public const string Name = "API integration tests";
}
