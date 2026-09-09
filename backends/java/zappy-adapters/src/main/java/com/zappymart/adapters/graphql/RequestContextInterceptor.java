package com.zappymart.adapters.graphql;

import com.zappymart.application.Visitor;
import com.zappymart.application.accounts.IdentifyVisitor;
import org.springframework.graphql.server.WebGraphQlInterceptor;
import org.springframework.graphql.server.WebGraphQlRequest;
import org.springframework.graphql.server.WebGraphQlResponse;
import org.springframework.http.HttpCookie;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

public final class RequestContextInterceptor implements WebGraphQlInterceptor {

    private static final String BEARER_PREFIX = "Bearer ";

    private final IdentifyVisitor identifyVisitor;

    public RequestContextInterceptor(IdentifyVisitor identifyVisitor) {
        this.identifyVisitor = identifyVisitor;
    }

    @Override
    public Mono<WebGraphQlResponse> intercept(WebGraphQlRequest request, Chain chain) {
        Visitor visitor = identifyVisitor.execute(
                bearerTokenOf(request),
                cookieValue(request, SecuritySettings.CART_COOKIE),
                request.getHeaders().getFirst(HttpHeaders.USER_AGENT),
                request.getHeaders().getFirst(HttpHeaders.ORIGIN));
        RequestContext context = new RequestContext(visitor, cookieValue(request, SecuritySettings.REFRESH_COOKIE));
        request.configureExecutionInput((executionInput, builder) ->
                builder.graphQLContext(Map.of(RequestContext.class, context)).build());
        return chain.next(request).doOnNext(response -> writeCookies(context, response));
    }

    private static void writeCookies(RequestContext context, WebGraphQlResponse response) {
        for (ResponseCookie cookie : context.cookiesToSet()) {
            response.getResponseHeaders().add(HttpHeaders.SET_COOKIE, cookie.toString());
        }
    }

    private static String bearerTokenOf(WebGraphQlRequest request) {
        String header = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (header == null || !header.startsWith(BEARER_PREFIX)) {
            return null;
        }
        return header.substring(BEARER_PREFIX.length()).trim();
    }

    private static String cookieValue(WebGraphQlRequest request, String name) {
        List<HttpCookie> cookies = request.getCookies().get(name);
        if (cookies == null || cookies.isEmpty()) {
            return null;
        }
        return cookies.getFirst().getValue();
    }
}
