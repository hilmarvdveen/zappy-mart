package com.zappymart.host;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.reactive.server.WebTestClient;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles({"development", "test"})
class HealthEndpointTest {

    @Value("${local.server.port}")
    private int port;

    @Test
    void theStoreReportsThatItAndItsDatabaseAreUp() {
        WebTestClient.bindToServer().baseUrl("http://localhost:" + port).build()
                .get().uri("/actuator/health")
                .exchange()
                .expectStatus().isOk()
                .expectBody()
                .jsonPath("$.status").isEqualTo("UP")
                .jsonPath("$.components.db.status").isEqualTo("UP");
    }
}
