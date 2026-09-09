using HotChocolate.Types;
using Zappy.Domain;

namespace Zappy.Adapters.GraphQL;

public sealed class MoneyType : ObjectType<Money>
{
    protected override void Configure(IObjectTypeDescriptor<Money> descriptor)
    {
        descriptor.Name("Money");
        descriptor.BindFieldsExplicitly();
        descriptor.Field(money => money.Amount).Type<NonNullType<IntType>>();
        descriptor.Field(money => money.Currency).Type<NonNullType<StringType>>();
    }
}
