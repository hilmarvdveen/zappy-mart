package com.zappymart.domain.promotions;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PromotionCodeTest {

    @Test
    void normalisesToUpperCaseWithoutSurroundingSpaces() {
        assertThat(PromotionCode.parse("  welcome10 ")).contains(new PromotionCode("WELCOME10"));
        assertThat(PromotionCode.parse("WELCOME10").orElseThrow().toString()).isEqualTo("WELCOME10");
    }

    @Test
    void refusesBlankText() {
        assertThat(PromotionCode.parse("   ")).isEmpty();
        assertThat(PromotionCode.parse(null)).isEmpty();
    }
}
