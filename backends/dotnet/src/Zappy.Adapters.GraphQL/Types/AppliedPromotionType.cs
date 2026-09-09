using HotChocolate.Types;
using Zappy.Domain;

namespace Zappy.Adapters.GraphQL;

public sealed class AppliedPromotionType : ObjectType<AppliedPromotion>
{
    protected override void Configure(IObjectTypeDescriptor<AppliedPromotion> descriptor)
    {
        descriptor.Name("AppliedPromotion");
        descriptor.BindFieldsExplicitly();
        descriptor.Field(promotion => promotion.Code).Type<NonNullType<StringType>>();
        descriptor.Field(promotion => promotion.Kind).Type<NonNullType<EnumType<PromotionKind>>>();
        descriptor.Field(promotion => promotion.Discount).Type<NonNullType<MoneyType>>();
    }
}
