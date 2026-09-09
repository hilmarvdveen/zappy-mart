using HotChocolate.Types;

namespace Zappy.Adapters.GraphQL;

public sealed class ProductFilterType : InputObjectType<ProductFilter>
{
    protected override void Configure(IInputObjectTypeDescriptor<ProductFilter> descriptor) =>
        descriptor.Name("ProductFilter");
}
