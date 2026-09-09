package com.zappymart.domain.accounts;

import com.zappymart.domain.shared.UserErrorCode;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PasswordPolicyTest {

    @Test
    void acceptsAPasswordOfTwelveCharactersOrMore() {
        assertThat(PasswordPolicy.check("correct horse battery staple").succeeded()).isTrue();
        assertThat(PasswordPolicy.check("a".repeat(12)).succeeded()).isTrue();
    }

    @Test
    void refusesAPasswordBelowTwelveCharacters() {
        assertThat(PasswordPolicy.check("a".repeat(11)).errors().getFirst().code())
                .isEqualTo(UserErrorCode.PASSWORD_TOO_SHORT);
        assertThat(PasswordPolicy.check(null).errors().getFirst().code())
                .isEqualTo(UserErrorCode.PASSWORD_TOO_SHORT);
    }

    @Test
    void refusesAPasswordAboveOneHundredAndTwentyEightCharacters() {
        assertThat(PasswordPolicy.check("a".repeat(129)).errors().getFirst().code())
                .isEqualTo(UserErrorCode.PASSWORD_TOO_LONG);
    }
}
