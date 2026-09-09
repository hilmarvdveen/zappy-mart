using HotChocolate.Types;
using Zappy.Application;
using Zappy.Domain;

namespace Zappy.Adapters.GraphQL;

public sealed class CustomerType : ObjectType<Customer>
{
    protected override void Configure(IObjectTypeDescriptor<Customer> descriptor)
    {
        descriptor.Name("Customer");
        descriptor.BindFieldsExplicitly();
        descriptor.Field(customer => customer.Id).Type<NonNullType<IdType>>();
        descriptor
            .Field("email")
            .Type<NonNullType<StringType>>()
            .Resolve(context => context.Parent<Customer>().Email.Value);
        descriptor.Field(customer => customer.Name).Type<NonNullType<StringType>>();
        descriptor.Field(customer => customer.CreatedAt).Type<NonNullType<DateTimeType>>();
        descriptor
            .Field("sessions")
            .Type<NonNullType<ListType<NonNullType<SessionType>>>>()
            .Resolve(context => context
                .Service<ListSessions>()
                .Execute(context.Parent<Customer>().Id, context.RequestAborted));
        descriptor
            .Field("wishlist")
            .Type<NonNullType<ListType<NonNullType<ProductType>>>>()
            .Resolve(context => context
                .Service<ReadWishlist>()
                .Execute(context.Parent<Customer>().Id, context.RequestAborted));
    }
}
