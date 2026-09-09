using HotChocolate.Types;
using Zappy.Domain;

namespace Zappy.Adapters.GraphQL;

public sealed class CartLineType : ObjectType<CartLine>
{
    protected override void Configure(IObjectTypeDescriptor<CartLine> descriptor)
    {
        descriptor.Name("CartLine");
        descriptor.BindFieldsExplicitly();
        descriptor.Field(line => line.Id).Type<NonNullType<IdType>>();
        descriptor.Field(line => line.Product).Type<NonNullType<ProductType>>();
        descriptor.Field(line => line.Quantity).Type<NonNullType<IntType>>();
        descriptor.Field(line => line.LineTotal).Type<NonNullType<MoneyType>>();
    }
}
