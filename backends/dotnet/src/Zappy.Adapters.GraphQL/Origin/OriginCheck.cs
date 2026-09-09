using System.Text;
using System.Text.Json;
using HotChocolate.Language;
using Microsoft.AspNetCore.Http;

namespace Zappy.Adapters.GraphQL;

public sealed class OriginCheck(RequestDelegate next, GraphQLSettings settings)
{
    private const string Refusal =
        "{\"errors\":[{\"message\":\"A mutation needs an Origin header that names an allowed origin.\","
        + "\"extensions\":{\"code\":\"ORIGIN_NOT_ALLOWED\"}}]}";

    public async Task InvokeAsync(HttpContext context)
    {
        if (!IsGraphQLPost(context))
        {
            await next(context);
            return;
        }

        context.Request.EnableBuffering();
        var carriesAMutation = await CarriesAMutation(context.Request);
        context.Request.Body.Position = 0;

        if (carriesAMutation && !OriginIsAllowed(context))
        {
            context.Response.StatusCode = StatusCodes.Status200OK;
            context.Response.ContentType = "application/json; charset=utf-8";
            await context.Response.WriteAsync(Refusal, Encoding.UTF8, context.RequestAborted);
            return;
        }

        await next(context);
    }

    private bool IsGraphQLPost(HttpContext context) =>
        HttpMethods.IsPost(context.Request.Method)
        && context.Request.Path.Equals(settings.Path, StringComparison.OrdinalIgnoreCase)
        && context.Request.ContentType is not null
        && context.Request.ContentType.Contains("json", StringComparison.OrdinalIgnoreCase);

    private bool OriginIsAllowed(HttpContext context)
    {
        var origin = context.Request.Headers.Origin.ToString().TrimEnd('/');
        return !string.IsNullOrWhiteSpace(origin)
            && settings.AllowedOrigins.Any(allowed =>
                string.Equals(allowed.TrimEnd('/'), origin, StringComparison.OrdinalIgnoreCase));
    }

    private static async Task<bool> CarriesAMutation(HttpRequest request)
    {
        try
        {
            using var body = await JsonDocument.ParseAsync(request.Body, default, request.HttpContext.RequestAborted);
            return body.RootElement.ValueKind switch
            {
                JsonValueKind.Array => body.RootElement.EnumerateArray().Any(HasMutation),
                JsonValueKind.Object => HasMutation(body.RootElement),
                _ => false
            };
        }
        catch (JsonException)
        {
            return false;
        }
    }

    private static bool HasMutation(JsonElement request)
    {
        if (!request.TryGetProperty("query", out var query) || query.ValueKind != JsonValueKind.String)
        {
            return false;
        }

        var asked = request.TryGetProperty("operationName", out var operationName)
            && operationName.ValueKind == JsonValueKind.String
                ? operationName.GetString()
                : null;

        try
        {
            var document = Utf8GraphQLParser.Parse(query.GetString() ?? string.Empty);
            return document.Definitions
                .OfType<OperationDefinitionNode>()
                .Where(operation => asked is null || operation.Name?.Value == asked)
                .Any(operation => operation.Operation == OperationType.Mutation);
        }
        catch (SyntaxException)
        {
            return false;
        }
    }
}
