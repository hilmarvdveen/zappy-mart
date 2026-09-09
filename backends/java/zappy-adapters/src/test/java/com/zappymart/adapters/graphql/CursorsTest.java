package com.zappymart.adapters.graphql;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CursorsTest {

    @Test
    void hidesTheIdentifierAndGivesItBack() {
        String cursor = Cursors.encode("product-07");

        assertThat(cursor).isNotEqualTo("product-07");
        assertThat(Cursors.decode(cursor)).isEqualTo("product-07");
    }

    @Test
    void answersNothingForNothing() {
        assertThat(Cursors.decode(null)).isNull();
    }

    @Test
    void handsBackTextThatIsNotACursorSoTheCallerCanRefuseIt() {
        assertThat(Cursors.decode("not a cursor at all!!")).isEqualTo("not a cursor at all!!");
    }
}
