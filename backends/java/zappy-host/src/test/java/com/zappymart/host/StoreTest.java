package com.zappymart.host;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.reactive.server.WebTestClient;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles({"development", "test"})
abstract class StoreTest {

    static final String THE_SEED_PASSWORD = "correct horse battery staple";

    @Value("${local.server.port}")
    private int port;

    StoreClient store;

    @BeforeEach
    void startFromTheSeed() {
        store = new StoreClient(WebTestClient.bindToServer()
                .baseUrl("http://localhost:" + port)
                .build());
        store.send("mutation { resetSeed { success loadedProducts } }")
                .jsonPath("$.data.resetSeed.success").isEqualTo(true)
                .jsonPath("$.data.resetSeed.loadedProducts").isEqualTo(20);
        store.forgetEverythingTheBrowserRemembered();
    }

    String logInAsJane() {
        String token = store.valueOf("""
                mutation {
                  login(input: {
                    email: "jane@example.com",
                    password: "%s",
                    device: "Chrome on Windows"
                  }) { accessToken errors { code } }
                }
                """.formatted(THE_SEED_PASSWORD), "$.data.login.accessToken");
        store.signInWith(token);
        return token;
    }
}
