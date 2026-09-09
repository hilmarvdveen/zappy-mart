package com.zappymart.adapters.graphql;

import graphql.GraphQLContext;
import graphql.execution.CoercedVariables;
import graphql.language.IntValue;
import graphql.language.StringValue;
import graphql.schema.Coercing;
import graphql.schema.CoercingParseLiteralException;
import graphql.schema.CoercingParseValueException;
import graphql.schema.CoercingSerializeException;
import graphql.schema.GraphQLScalarType;
import org.junit.jupiter.api.Test;

import java.math.BigInteger;
import java.time.Instant;
import java.util.Locale;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DateTimeScalarTest {

    private final GraphQLScalarType dateTime = DateTimeScalar.type();

    private final Coercing<?, ?> coercing = dateTime.getCoercing();

    private final GraphQLContext context = GraphQLContext.newContext().build();

    @Test
    void isNamedAfterTheContract() {
        assertThat(dateTime.getName()).isEqualTo("DateTime");
    }

    @Test
    void writesUtcWithSecondPrecisionEvenWhenTheSecondsAreZero() {
        assertThat(coercing.serialize(Instant.parse("2026-09-09T14:30:00Z"), context, Locale.ROOT))
                .isEqualTo("2026-09-09T14:30:00Z");
        assertThat(coercing.serialize(Instant.parse("2026-09-09T14:30:12.987Z"), context, Locale.ROOT))
                .isEqualTo("2026-09-09T14:30:12Z");
    }

    @Test
    void refusesToWriteSomethingThatIsNotAMoment() {
        assertThatThrownBy(() -> coercing.serialize("not a moment", context, Locale.ROOT))
                .isInstanceOf(CoercingSerializeException.class);
    }

    @Test
    void readsAValueAndALiteral() {
        assertThat(coercing.parseValue("2026-09-09T14:30:00Z", context, Locale.ROOT))
                .isEqualTo(Instant.parse("2026-09-09T14:30:00Z"));
        assertThat(coercing.parseLiteral(StringValue.of("2026-09-09T14:30:00Z"),
                CoercedVariables.emptyVariables(), context, Locale.ROOT))
                .isEqualTo(Instant.parse("2026-09-09T14:30:00Z"));
    }

    @Test
    void refusesToReadWhatIsNotAMoment() {
        assertThatThrownBy(() -> coercing.parseValue(42, context, Locale.ROOT))
                .isInstanceOf(CoercingParseValueException.class);
        assertThatThrownBy(() -> coercing.parseValue("yesterday", context, Locale.ROOT))
                .isInstanceOf(CoercingParseValueException.class);
        assertThatThrownBy(() -> coercing.parseLiteral(new IntValue(BigInteger.ONE),
                CoercedVariables.emptyVariables(), context, Locale.ROOT))
                .isInstanceOf(CoercingParseLiteralException.class);
        assertThatThrownBy(() -> coercing.parseLiteral(StringValue.of("yesterday"),
                CoercedVariables.emptyVariables(), context, Locale.ROOT))
                .isInstanceOf(CoercingParseLiteralException.class);
    }
}
