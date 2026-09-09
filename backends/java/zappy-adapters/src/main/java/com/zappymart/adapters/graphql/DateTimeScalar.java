package com.zappymart.adapters.graphql;

import graphql.GraphQLContext;
import graphql.execution.CoercedVariables;
import graphql.language.StringValue;
import graphql.language.Value;
import graphql.schema.Coercing;
import graphql.schema.CoercingParseLiteralException;
import graphql.schema.CoercingParseValueException;
import graphql.schema.CoercingSerializeException;
import graphql.schema.GraphQLScalarType;

import java.time.DateTimeException;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.Locale;

public final class DateTimeScalar {

    public static final DateTimeFormatter FORMAT =
            DateTimeFormatter.ofPattern("uuuu-MM-dd'T'HH:mm:ss'Z'").withZone(ZoneOffset.UTC);

    private DateTimeScalar() {
    }

    public static GraphQLScalarType type() {
        return GraphQLScalarType.newScalar()
                .name("DateTime")
                .description("A moment in time as an ISO 8601 string in UTC with second precision")
                .coercing(new InstantCoercing())
                .build();
    }

    private static final class InstantCoercing implements Coercing<Instant, String> {

        @Override
        public String serialize(Object input, GraphQLContext context, Locale locale) {
            if (input instanceof Instant moment) {
                return FORMAT.format(moment.truncatedTo(ChronoUnit.SECONDS));
            }
            throw new CoercingSerializeException("A DateTime field answers with an Instant, not with "
                    + input.getClass().getName());
        }

        @Override
        public Instant parseValue(Object input, GraphQLContext context, Locale locale) {
            if (input instanceof String text) {
                return parse(text, CoercingParseValueException::new);
            }
            throw new CoercingParseValueException("A DateTime value arrives as a string");
        }

        @Override
        public Instant parseLiteral(Value<?> input, CoercedVariables variables, GraphQLContext context,
                                    Locale locale) {
            if (input instanceof StringValue text) {
                return parse(text.getValue(), CoercingParseLiteralException::new);
            }
            throw new CoercingParseLiteralException("A DateTime literal is a string");
        }

        private static Instant parse(String text, java.util.function.Function<String, RuntimeException> refusal) {
            try {
                return Instant.parse(text);
            } catch (DateTimeException unreadable) {
                throw refusal.apply("A DateTime reads as 2026-09-09T14:30:00Z, not as " + text);
            }
        }
    }
}
