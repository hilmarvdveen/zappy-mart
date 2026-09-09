using HotChocolate.Types;
using Zappy.Domain;

namespace Zappy.Adapters.GraphQL;

public sealed class UserErrorType : ObjectType<UserError>
{
    protected override void Configure(IObjectTypeDescriptor<UserError> descriptor)
    {
        descriptor.Name("UserError");
        descriptor.BindFieldsExplicitly();
        descriptor.Field(error => error.Code).Type<NonNullType<EnumType<UserErrorCode>>>();
        descriptor.Field(error => error.Message).Type<NonNullType<StringType>>();
        descriptor.Field(error => error.Field).Type<StringType>();
    }
}
