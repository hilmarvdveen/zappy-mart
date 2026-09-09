package com.zappymart.host;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AccountsGraphQlTest extends StoreTest {

    @Test
    void meIsNullUntilSomebodySignsIn() {
        store.send("{ me { id } }").jsonPath("$.data.me").doesNotExist();
    }

    @Test
    void logsInAndSetsTheRefreshCookieWhileTheAccessTokenTravelsInThePayload() {
        store.send("""
                mutation { login(input: {
                    email: "JANE@example.com", password: "%s", device: "Chrome on Windows"
                }) {
                    customer { id email name createdAt sessions { device current } }
                    accessToken accessTokenExpiresAt errors { code }
                } }
                """.formatted(THE_SEED_PASSWORD))
                .jsonPath("$.data.login.errors.length()").isEqualTo(0)
                .jsonPath("$.data.login.customer.id").isEqualTo("customer-01")
                .jsonPath("$.data.login.customer.email").isEqualTo("jane@example.com")
                .jsonPath("$.data.login.customer.name").isEqualTo("Jane Doe")
                .jsonPath("$.data.login.customer.createdAt").isEqualTo("2026-01-15T09:00:00Z")
                .jsonPath("$.data.login.customer.sessions[0].device").isEqualTo("Chrome on Windows")
                .jsonPath("$.data.login.customer.sessions[0].current").isEqualTo(true)
                .jsonPath("$.data.login.accessToken").isNotEmpty();

        assertThat(store.cookie("zappy_refresh")).isNotBlank();
    }

    @Test
    void answersOneReasonForEveryWrongLogin() {
        store.send("mutation { login(input: { email: \"jane@example.com\", password: \"a wrong password\" }) "
                + "{ customer { id } errors { code } } }")
                .jsonPath("$.data.login.customer").doesNotExist()
                .jsonPath("$.data.login.errors[0].code").isEqualTo("CREDENTIALS_INVALID");
        store.send("mutation { login(input: { email: \"nobody@example.com\", password: \"%s\" }) "
                .formatted(THE_SEED_PASSWORD) + "{ errors { code } } }")
                .jsonPath("$.data.login.errors[0].code").isEqualTo("CREDENTIALS_INVALID");
    }

    @Test
    void registersAndSignsTheNewCustomerInAtOnce() {
        store.send("""
                mutation { register(input: {
                    email: "New@Example.com", name: "New Customer", password: "a long enough password"
                }) { customer { email name } accessToken errors { code } } }
                """)
                .jsonPath("$.data.register.errors.length()").isEqualTo(0)
                .jsonPath("$.data.register.customer.email").isEqualTo("new@example.com")
                .jsonPath("$.data.register.accessToken").isNotEmpty();
    }

    @Test
    void refusesARegistrationThatBreaksARule() {
        store.send("mutation { register(input: { email: \"jane@example.com\", name: \"Jane\", "
                + "password: \"a long enough password\" }) { errors { code field } } }")
                .jsonPath("$.data.register.errors[0].code").isEqualTo("EMAIL_TAKEN")
                .jsonPath("$.data.register.errors[0].field").isEqualTo("input.email");
        store.send("mutation { register(input: { email: \"not an address\", name: \"Jane\", "
                + "password: \"a long enough password\" }) { errors { code } } }")
                .jsonPath("$.data.register.errors[0].code").isEqualTo("EMAIL_INVALID");
        store.send("mutation { register(input: { email: \"other@example.com\", name: \"Jane\", "
                + "password: \"short\" }) { errors { code field } } }")
                .jsonPath("$.data.register.errors[0].code").isEqualTo("PASSWORD_TOO_SHORT")
                .jsonPath("$.data.register.errors[0].field").isEqualTo("input.password");
    }

    @Test
    void rotatesTheRefreshTokenAndRevokesTheFamilyWhenAnOldOneComesBack() {
        logInAsJane();
        String firstRefreshToken = store.cookie("zappy_refresh");

        store.send("mutation { refreshSession { customer { email } accessToken errors { code } } }")
                .jsonPath("$.data.refreshSession.errors.length()").isEqualTo(0)
                .jsonPath("$.data.refreshSession.customer.email").isEqualTo("jane@example.com");

        assertThat(store.cookie("zappy_refresh")).isNotEqualTo(firstRefreshToken);

        String rotatedRefreshToken = store.cookie("zappy_refresh");
        store.setCookie("zappy_refresh", firstRefreshToken);

        store.send("mutation { refreshSession { accessToken errors { code } } }")
                .jsonPath("$.data.refreshSession.accessToken").doesNotExist()
                .jsonPath("$.data.refreshSession.errors[0].code").isEqualTo("SESSION_INVALID");

        store.setCookie("zappy_refresh", rotatedRefreshToken);

        store.send("mutation { refreshSession { errors { code } } }")
                .jsonPath("$.data.refreshSession.errors[0].code").isEqualTo("SESSION_INVALID");
    }

    @Test
    void refusesARefreshWithoutACookie() {
        store.send("mutation { refreshSession { errors { code } } }")
                .jsonPath("$.data.refreshSession.errors[0].code").isEqualTo("SESSION_INVALID");
    }

    @Test
    void aLoggedOutSessionIsRefusedAtOnceEvenThoughTheAccessTokenStillReads() {
        logInAsJane();

        store.send("{ me { email } }").jsonPath("$.data.me.email").isEqualTo("jane@example.com");

        store.send("mutation { logout { success errors { code } } }")
                .jsonPath("$.data.logout.success").isEqualTo(true)
                .jsonPath("$.data.logout.errors.length()").isEqualTo(0);

        store.send("{ me { email } }").jsonPath("$.data.me").doesNotExist();
        store.send("mutation { logout { success } }").jsonPath("$.data.logout.success").isEqualTo(true);
    }

    @Test
    void revokesOneSessionAndAnswersTheOnesThatStayOpen() {
        logInAsJane();
        String currentSessionId = store.valueOf("{ me { sessions { id current } } }",
                "$.data.me.sessions[0].id");

        store.send("mutation { revokeSession(sessionId: \"%s\") { sessions { id } errors { code } } }"
                .formatted(currentSessionId))
                .jsonPath("$.data.revokeSession.errors.length()").isEqualTo(0)
                .jsonPath("$.data.revokeSession.sessions.length()").isEqualTo(0);
        store.send("mutation { revokeSession(sessionId: \"%s\") { errors { code field } } }"
                .formatted(currentSessionId))
                .jsonPath("$.data.revokeSession.errors[0].code").isEqualTo("NOT_AUTHENTICATED");
    }

    @Test
    void refusesToRevokeASessionThatIsNotTheCustomersOwn() {
        logInAsJane();

        store.send("mutation { revokeSession(sessionId: \"a-session-nobody-opened\") { errors { code field } } }")
                .jsonPath("$.data.revokeSession.errors[0].code").isEqualTo("SESSION_NOT_FOUND")
                .jsonPath("$.data.revokeSession.errors[0].field").isEqualTo("sessionId");
    }
}
