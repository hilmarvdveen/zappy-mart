using HotChocolate.Types;
using Zappy.Domain;

namespace Zappy.Adapters.GraphQL;

public sealed class OrderType : ObjectType<Order>
{
    protected override void Configure(IObjectTypeDescriptor<Order> descriptor)
    {
        descriptor.Name("Order");
        descriptor.BindFieldsExplicitly();
        descriptor.Field(order => order.Id).Type<NonNullType<IdType>>();
        descriptor.Field(order => order.Number).Type<NonNullType<StringType>>();
        descriptor.Field(order => order.Status).Type<NonNullType<EnumType<OrderStatus>>>();
        descriptor.Field(order => order.Lines).Type<NonNullType<ListType<NonNullType<OrderLineType>>>>();
        descriptor.Field(order => order.PromotionCode).Type<StringType>();
        descriptor.Field(order => order.Subtotal).Type<NonNullType<MoneyType>>();
        descriptor.Field(order => order.Discount).Type<NonNullType<MoneyType>>();
        descriptor.Field(order => order.Shipping).Type<NonNullType<MoneyType>>();
        descriptor.Field(order => order.Total).Type<NonNullType<MoneyType>>();
        descriptor.Field(order => order.PlacedAt).Type<NonNullType<DateTimeType>>();
    }
}
