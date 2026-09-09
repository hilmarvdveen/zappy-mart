using HotChocolate.Types;
using Zappy.Domain;

namespace Zappy.Adapters.GraphQL;

public sealed class ProductType : ObjectType<Product>
{
    protected override void Configure(IObjectTypeDescriptor<Product> descriptor)
    {
        descriptor.Name("Product");
        descriptor.BindFieldsExplicitly();
        descriptor.Field(product => product.Id).Type<NonNullType<IdType>>();
        descriptor.Field(product => product.Name).Type<NonNullType<StringType>>();
        descriptor.Field(product => product.Slug).Type<NonNullType<StringType>>();
        descriptor.Field(product => product.Description).Type<NonNullType<StringType>>();
        descriptor.Field(product => product.Price).Type<NonNullType<MoneyType>>();
        descriptor.Field(product => product.Category).Type<NonNullType<CategoryType>>();
        descriptor.Field(product => product.Stock).Type<NonNullType<IntType>>();
        descriptor.Field(product => product.ImageUrl).Type<StringType>();
    }
}
