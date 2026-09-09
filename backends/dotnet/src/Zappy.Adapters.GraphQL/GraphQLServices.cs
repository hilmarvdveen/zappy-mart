using HotChocolate.Execution.Configuration;
using HotChocolate.Types;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Zappy.Adapters.GraphQL;

public static class GraphQLServices
{
    public static IServiceCollection AddZappyGraphQL(this IServiceCollection services, IConfiguration configuration)
    {
        var settings = new GraphQLSettings();
        configuration.GetSection(GraphQLSettings.Section).Bind(settings);

        services.AddSingleton(settings);
        services.AddHttpContextAccessor();
        services.AddScoped<VisitorOfTheRequest>();

        var graphQL = services
            .AddGraphQLServer()
            .AddQueryType<Query>()
            .AddMutationType<Mutation>()
            .AddType(new DateTimeType(new DateTimeOptions { OutputPrecision = 0 }))
            .AddType<MoneyType>()
            .AddType<CategoryType>()
            .AddType<ProductType>()
            .AddType<CartLineType>()
            .AddType<AppliedPromotionType>()
            .AddType<CartType>()
            .AddType<OrderLineType>()
            .AddType<OrderType>()
            .AddType<SessionType>()
            .AddType<CustomerType>()
            .AddType<UserErrorType>()
            .AddType<ProductFilterType>()
            .ModifyCostOptions(options =>
            {
                options.ApplyCostDefaults = false;
                options.ApplySlicingArgumentDefaultValue = false;
                options.EnforceCostLimits = false;
            })
            .ModifyRequestOptions(options => options.IncludeExceptionDetails = settings.IncludeExceptionDetails);

        if (settings.ExposeResetSeed)
        {
            graphQL.AddTypeExtension<DevelopmentMutation>();
        }

        return services;
    }
}
