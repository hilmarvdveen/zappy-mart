using System.Globalization;
using System.Text;
using HotChocolate.Language;

namespace Zappy.Adapters.Tests;

public static class SchemaShape
{
    public static Dictionary<string, Dictionary<string, string>> Of(string schemaText)
    {
        var shape = new Dictionary<string, Dictionary<string, string>>(StringComparer.Ordinal);

        foreach (var definition in Utf8GraphQLParser.Parse(schemaText).Definitions)
        {
            switch (definition)
            {
                case ObjectTypeDefinitionNode objectType:
                    Merge(shape, objectType.Name.Value, FieldsOf(objectType.Fields));
                    break;
                case ObjectTypeExtensionNode objectTypeExtension:
                    Merge(shape, objectTypeExtension.Name.Value, FieldsOf(objectTypeExtension.Fields));
                    break;
                case InputObjectTypeDefinitionNode inputType:
                    Merge(shape, inputType.Name.Value, InputFieldsOf(inputType.Fields));
                    break;
                case EnumTypeDefinitionNode enumType:
                    Merge(shape, enumType.Name.Value, enumType.Values.ToDictionary(
                        value => value.Name.Value,
                        _ => "enum value",
                        StringComparer.Ordinal));
                    break;
                case ScalarTypeDefinitionNode scalarType:
                    Merge(shape, scalarType.Name.Value, []);
                    break;
            }
        }

        return shape;
    }

    private static void Merge(
        Dictionary<string, Dictionary<string, string>> shape,
        string name,
        Dictionary<string, string> members)
    {
        if (!shape.TryGetValue(name, out var known))
        {
            shape[name] = members;
            return;
        }

        foreach (var member in members)
        {
            known[member.Key] = member.Value;
        }
    }

    private static Dictionary<string, string> FieldsOf(IReadOnlyList<FieldDefinitionNode> fields) =>
        fields.ToDictionary(field => field.Name.Value, Signature, StringComparer.Ordinal);

    private static Dictionary<string, string> InputFieldsOf(IReadOnlyList<InputValueDefinitionNode> fields) =>
        fields.ToDictionary(field => field.Name.Value, Signature, StringComparer.Ordinal);

    private static string Signature(FieldDefinitionNode field)
    {
        var signature = new StringBuilder();
        if (field.Arguments.Count > 0)
        {
            signature.Append('(');
            signature.AppendJoin(", ", field.Arguments.Select(argument =>
                string.Create(CultureInfo.InvariantCulture, $"{argument.Name.Value}: {Signature(argument)}")));
            signature.Append(')');
        }

        signature.Append(": ").Append(field.Type.ToString(false));
        return signature.ToString();
    }

    private static string Signature(InputValueDefinitionNode field)
    {
        var signature = field.Type.ToString(false);
        return field.DefaultValue is null or NullValueNode
            ? signature
            : $"{signature} = {field.DefaultValue.ToString(false)}";
    }
}
