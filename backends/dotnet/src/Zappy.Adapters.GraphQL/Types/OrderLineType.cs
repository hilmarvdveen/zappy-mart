using HotChocolate.Types;
using Zappy.Domain;

namespace Zappy.Adapters.GraphQL;

public sealed class OrderLineType : ObjectType<OrderLine>
{
    protected override void Configure(IObjectTypeDescriptor<OrderLine> descriptor)
    {
        descriptor.Name("OrderLine");
        descriptor.BindFieldsExplicitly();
        descriptor.Field(line => line.ProductName).Type<NonNullType<StringType>>();
        descriptor.Field(line => line.UnitPrice).Type<NonNullType<MoneyType>>();
        descriptor.Field(line => line.Quantity).Type<NonNullType<IntType>>();
        descriptor.Field(line => line.LineTotal).Type<NonNullType<MoneyType>>();
    }
}
