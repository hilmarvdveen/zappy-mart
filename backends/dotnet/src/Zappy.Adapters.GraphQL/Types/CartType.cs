using HotChocolate.Types;
using Zappy.Domain;

namespace Zappy.Adapters.GraphQL;

public sealed class CartType : ObjectType<Cart>
{
    protected override void Configure(IObjectTypeDescriptor<Cart> descriptor)
    {
        descriptor.Name("Cart");
        descriptor.BindFieldsExplicitly();
        descriptor.Field(cart => cart.Id).Type<NonNullType<IdType>>();
        descriptor.Field(cart => cart.Lines).Type<NonNullType<ListType<NonNullType<CartLineType>>>>();
        descriptor.Field(cart => cart.Promotion).Type<AppliedPromotionType>();
        descriptor.Field("subtotal").Type<NonNullType<MoneyType>>().Resolve(context => context.Parent<Cart>().Totals.Subtotal);
        descriptor.Field("shipping").Type<NonNullType<MoneyType>>().Resolve(context => context.Parent<Cart>().Totals.Shipping);
        descriptor.Field("total").Type<NonNullType<MoneyType>>().Resolve(context => context.Parent<Cart>().Totals.Total);
        descriptor.Field(cart => cart.UpdatedAt).Type<NonNullType<DateTimeType>>();
    }
}
