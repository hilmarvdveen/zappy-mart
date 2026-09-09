package com.zappymart.domain.shared;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ResultTest {

    @Test
    void carriesAValueOnSuccess() {
        Result<String> result = Result.of("a value");

        assertThat(result.succeeded()).isTrue();
        assertThat(result.asOptional()).contains("a value");
        assertThat(result.errors()).isEmpty();
        assertThat(result.valueOrThrow()).isEqualTo("a value");
        assertThat(result.orElse("another")).isEqualTo("a value");
    }

    @Test
    void carriesReasonsOnRefusal() {
        Result<String> result = Result.refuse(UserErrorCode.CART_EMPTY, "Nothing to order");

        assertThat(result.succeeded()).isFalse();
        assertThat(result.asOptional()).isEmpty();
        assertThat(result.errors()).singleElement().satisfies(error ->
                assertThat(error.code()).isEqualTo(UserErrorCode.CART_EMPTY));
        assertThat(result.orElseGet(() -> "fallback")).isEqualTo("fallback");
        assertThatThrownBy(result::valueOrThrow).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void mapsASuccessAndCarriesARefusalThrough() {
        assertThat(Result.of(2).map(number -> number * 3).valueOrThrow()).isEqualTo(6);

        Result<Integer> refused = Result.refuse(UserErrorCode.OUT_OF_STOCK, "No stock", "quantity");

        assertThat(refused.map(number -> number * 3).errors()).hasSize(1);
        assertThat(refused.<String>carryRefusal().errors()).hasSize(1);
        assertThatThrownBy(() -> Result.of(1).carryRefusal()).isInstanceOf(IllegalStateException.class);
    }
}
