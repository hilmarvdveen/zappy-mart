using HotChocolate.Types;
using Zappy.Domain;

namespace Zappy.Adapters.GraphQL;

public sealed class SessionType : ObjectType<Session>
{
    protected override void Configure(IObjectTypeDescriptor<Session> descriptor)
    {
        descriptor.Name("Session");
        descriptor.BindFieldsExplicitly();
        descriptor.Field(session => session.Id).Type<NonNullType<IdType>>();
        descriptor.Field(session => session.Device).Type<NonNullType<StringType>>();
        descriptor.Field(session => session.CreatedAt).Type<NonNullType<DateTimeType>>();
        descriptor.Field(session => session.LastUsedAt).Type<NonNullType<DateTimeType>>();
        descriptor
            .Field("current")
            .Type<NonNullType<BooleanType>>()
            .Resolve(context =>
                context.Service<VisitorOfTheRequest>().Current.SessionId == context.Parent<Session>().Id);
    }
}
