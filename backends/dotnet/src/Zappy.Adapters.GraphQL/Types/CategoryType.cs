using HotChocolate.Types;
using Zappy.Domain;

namespace Zappy.Adapters.GraphQL;

public sealed class CategoryType : ObjectType<Category>
{
    protected override void Configure(IObjectTypeDescriptor<Category> descriptor)
    {
        descriptor.Name("Category");
        descriptor.BindFieldsExplicitly();
        descriptor.Field(category => category.Id).Type<NonNullType<IdType>>();
        descriptor.Field(category => category.Name).Type<NonNullType<StringType>>();
        descriptor.Field(category => category.Slug).Type<NonNullType<StringType>>();
    }
}
