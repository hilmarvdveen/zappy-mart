package com.zappymart.domain.shared;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class EmailAddressTest {

    @Test
    void normalisesCaseAndSurroundingSpaces() {
        assertThat(EmailAddress.parse("  JANE@Example.COM ")).contains(new EmailAddress("jane@example.com"));
    }

    @Test
    void refusesTextThatIsNotAnAddress() {
        assertThat(EmailAddress.parse("jane")).isEmpty();
        assertThat(EmailAddress.parse("jane@example")).isEmpty();
        assertThat(EmailAddress.parse("jane example@test.com")).isEmpty();
        assertThat(EmailAddress.parse(null)).isEmpty();
    }
}
