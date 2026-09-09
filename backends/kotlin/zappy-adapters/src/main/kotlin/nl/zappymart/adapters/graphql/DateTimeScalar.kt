package nl.zappymart.adapters.graphql

import graphql.GraphQLContext
import graphql.execution.CoercedVariables
import graphql.language.StringValue
import graphql.language.Value
import graphql.schema.Coercing
import graphql.schema.CoercingParseLiteralException
import graphql.schema.CoercingParseValueException
import graphql.schema.CoercingSerializeException
import graphql.schema.GraphQLScalarType
import java.time.Instant
import java.time.format.DateTimeParseException
import java.time.temporal.ChronoUnit
import java.util.Locale

object DateTimeScalar {

    val TYPE: GraphQLScalarType = GraphQLScalarType.newScalar()
        .name("DateTime")
        .description("A moment in time as an ISO 8601 string in UTC with second precision.")
        .coercing(InstantCoercing())
        .build()

    private class InstantCoercing : Coercing<Instant, String> {

        override fun serialize(dataFetcherResult: Any, graphQLContext: GraphQLContext, locale: Locale): String =
            when (dataFetcherResult) {
                is Instant -> dataFetcherResult.truncatedTo(ChronoUnit.SECONDS).toString()
                is String -> dataFetcherResult
                else -> throw CoercingSerializeException("A DateTime is an Instant, not ${dataFetcherResult::class}")
            }

        override fun parseValue(input: Any, graphQLContext: GraphQLContext, locale: Locale): Instant = try {
            Instant.parse(input.toString())
        } catch (malformed: DateTimeParseException) {
            throw CoercingParseValueException("A DateTime is an ISO 8601 moment in UTC", malformed)
        }

        override fun parseLiteral(
            input: Value<*>,
            variables: CoercedVariables,
            graphQLContext: GraphQLContext,
            locale: Locale,
        ): Instant {
            if (input !is StringValue) {
                throw CoercingParseLiteralException("A DateTime literal is a string")
            }
            return try {
                Instant.parse(input.value)
            } catch (malformed: DateTimeParseException) {
                throw CoercingParseLiteralException("A DateTime is an ISO 8601 moment in UTC", malformed)
            }
        }

        override fun valueToLiteral(input: Any, graphQLContext: GraphQLContext, locale: Locale): Value<*> =
            StringValue.of(serialize(input, graphQLContext, locale))
    }
}
