package com.zappymart.host;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseCookie;
import org.springframework.test.web.reactive.server.EntityExchangeResult;
import org.springframework.test.web.reactive.server.WebTestClient;
import org.springframework.util.MultiValueMap;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

final class StoreClient {

    static final String AN_ALLOWED_ORIGIN = "http://localhost:5173";

    private final WebTestClient webTestClient;
    private final Map<String, String> cookies = new LinkedHashMap<>();

    private String accessToken;

    StoreClient(WebTestClient webTestClient) {
        this.webTestClient = webTestClient;
    }

    WebTestClient.BodyContentSpec send(String document) {
        return sendWithOrigin(AN_ALLOWED_ORIGIN, document)
                .expectStatus().isOk()
                .expectBody()
                .consumeWith(this::rememberCookies);
    }

    WebTestClient.ResponseSpec sendWithOrigin(String origin, String document) {
        WebTestClient.RequestBodySpec request = webTestClient.post()
                .uri("/graphql")
                .contentType(MediaType.APPLICATION_JSON)
                .header(HttpHeaders.USER_AGENT, "The conformance client");
        if (origin != null) {
            request = request.header(HttpHeaders.ORIGIN, origin);
        }
        if (accessToken != null) {
            request = request.header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken);
        }
        cookies.forEach(request::cookie);
        return request.bodyValue(bodyFor(document)).exchange();
    }

    String valueOf(String document, String path) {
        AtomicReference<String> found = new AtomicReference<>();
        send(document).jsonPath(path).value(value -> found.set(value == null ? null : String.valueOf(value)));
        return found.get();
    }

    void signInWith(String token) {
        this.accessToken = token;
    }

    void forgetTheAccessToken() {
        this.accessToken = null;
    }

    String cookie(String name) {
        return cookies.get(name);
    }

    void setCookie(String name, String value) {
        cookies.put(name, value);
    }

    void forgetEverythingTheBrowserRemembered() {
        cookies.clear();
        accessToken = null;
    }

    private void rememberCookies(EntityExchangeResult<byte[]> result) {
        MultiValueMap<String, ResponseCookie> received = result.getResponseCookies();
        received.forEach((name, values) -> {
            ResponseCookie cookie = values.getFirst();
            if (cookie.getValue().isEmpty()) {
                cookies.remove(name);
            } else {
                cookies.put(name, cookie.getValue());
            }
        });
    }

    private static String bodyFor(String document) {
        return "{\"query\":" + quoted(document) + "}";
    }

    private static String quoted(String text) {
        StringBuilder quoted = new StringBuilder("\"");
        for (char character : text.toCharArray()) {
            switch (character) {
                case '"' -> quoted.append("\\\"");
                case '\\' -> quoted.append("\\\\");
                case '\n' -> quoted.append("\\n");
                case '\r' -> quoted.append("\\r");
                case '\t' -> quoted.append("\\t");
                default -> quoted.append(character);
            }
        }
        return quoted.append('"').toString();
    }
}
