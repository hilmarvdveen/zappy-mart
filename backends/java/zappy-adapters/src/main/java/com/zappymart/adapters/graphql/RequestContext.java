package com.zappymart.adapters.graphql;

import com.zappymart.application.Visitor;
import graphql.GraphQLContext;
import org.springframework.http.ResponseCookie;

import java.util.ArrayList;
import java.util.List;

public final class RequestContext {

    private final Visitor visitor;
    private final String presentedRefreshToken;
    private final List<ResponseCookie> cookiesToSet = new ArrayList<>();
    private String sessionOpenedByThisRequest;

    public RequestContext(Visitor visitor, String presentedRefreshToken) {
        this.visitor = visitor;
        this.presentedRefreshToken = presentedRefreshToken;
    }

    public static RequestContext from(GraphQLContext graphQlContext) {
        RequestContext context = graphQlContext.get(RequestContext.class);
        if (context == null) {
            throw new IllegalStateException("Every request passes through the RequestContextInterceptor");
        }
        return context;
    }

    public Visitor visitor() {
        return visitor;
    }

    public String presentedRefreshToken() {
        return presentedRefreshToken;
    }

    public void setCookie(ResponseCookie cookie) {
        cookiesToSet.add(cookie);
    }

    public List<ResponseCookie> cookiesToSet() {
        return List.copyOf(cookiesToSet);
    }

    public void rememberSessionOpenedByThisRequest(String sessionId) {
        this.sessionOpenedByThisRequest = sessionId;
    }

    public String currentSessionId() {
        return sessionOpenedByThisRequest == null ? visitor.sessionId() : sessionOpenedByThisRequest;
    }
}
