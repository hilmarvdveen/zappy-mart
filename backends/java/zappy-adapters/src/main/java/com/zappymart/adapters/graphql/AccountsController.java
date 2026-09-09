package com.zappymart.adapters.graphql;

import com.zappymart.application.accounts.Authentication;
import com.zappymart.application.accounts.FindSignedInCustomer;
import com.zappymart.application.accounts.ListOpenSessions;
import com.zappymart.application.accounts.LogInCustomer;
import com.zappymart.application.accounts.LogOut;
import com.zappymart.application.accounts.RefreshSession;
import com.zappymart.application.accounts.RegisterCustomer;
import com.zappymart.application.accounts.RevokeSession;
import com.zappymart.application.accounts.ViewWishlist;
import com.zappymart.domain.accounts.Customer;
import com.zappymart.domain.accounts.Session;
import com.zappymart.domain.catalogue.Product;
import com.zappymart.domain.shared.Result;
import graphql.GraphQLContext;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.graphql.data.method.annotation.SchemaMapping;
import org.springframework.stereotype.Controller;

import java.util.List;

@Controller
public class AccountsController {

    private final RegisterCustomer registerCustomer;
    private final LogInCustomer logInCustomer;
    private final RefreshSession refreshSession;
    private final LogOut logOut;
    private final RevokeSession revokeSession;
    private final FindSignedInCustomer findSignedInCustomer;
    private final ListOpenSessions listOpenSessions;
    private final ViewWishlist viewWishlist;
    private final SecuritySettings securitySettings;

    public AccountsController(RegisterCustomer registerCustomer, LogInCustomer logInCustomer,
                              RefreshSession refreshSession, LogOut logOut, RevokeSession revokeSession,
                              FindSignedInCustomer findSignedInCustomer, ListOpenSessions listOpenSessions,
                              ViewWishlist viewWishlist, SecuritySettings securitySettings) {
        this.registerCustomer = registerCustomer;
        this.logInCustomer = logInCustomer;
        this.refreshSession = refreshSession;
        this.logOut = logOut;
        this.revokeSession = revokeSession;
        this.findSignedInCustomer = findSignedInCustomer;
        this.listOpenSessions = listOpenSessions;
        this.viewWishlist = viewWishlist;
        this.securitySettings = securitySettings;
    }

    @QueryMapping
    public Customer me(GraphQLContext graphQlContext) {
        return findSignedInCustomer.execute(RequestContext.from(graphQlContext).visitor()).orElse(null);
    }

    @MutationMapping
    public AuthenticationPayload register(@Argument RegisterInput input, GraphQLContext graphQlContext) {
        RequestContext context = RequestContext.from(graphQlContext);
        return authenticationPayload(context, registerCustomer.execute(context.visitor(),
                input.email(), input.name(), input.password()));
    }

    @MutationMapping
    public AuthenticationPayload login(@Argument LoginInput input, GraphQLContext graphQlContext) {
        RequestContext context = RequestContext.from(graphQlContext);
        return authenticationPayload(context, logInCustomer.execute(context.visitor(),
                input.email(), input.password(), input.device()));
    }

    @MutationMapping
    public AuthenticationPayload refreshSession(GraphQLContext graphQlContext) {
        RequestContext context = RequestContext.from(graphQlContext);
        return authenticationPayload(context, refreshSession.execute(context.presentedRefreshToken()));
    }

    @MutationMapping
    public LogoutPayload logout(GraphQLContext graphQlContext) {
        RequestContext context = RequestContext.from(graphQlContext);
        logOut.execute(context.visitor(), context.presentedRefreshToken());
        context.setCookie(Cookies.clearedRefresh(securitySettings.cookiesAreSecure()));
        return new LogoutPayload(true, List.of());
    }

    @MutationMapping
    public RevokeSessionPayload revokeSession(@Argument String sessionId, GraphQLContext graphQlContext) {
        RequestContext context = RequestContext.from(graphQlContext);
        Result<List<Session>> result = revokeSession.execute(context.visitor(), sessionId);
        if (!result.succeeded()) {
            return new RevokeSessionPayload(List.of(), result.errors());
        }
        return new RevokeSessionPayload(result.valueOrThrow(), List.of());
    }

    @SchemaMapping(typeName = "Customer", field = "email")
    public String customerEmail(Customer customer) {
        return customer.email().value();
    }

    @SchemaMapping(typeName = "Customer", field = "sessions")
    public List<Session> customerSessions(Customer customer) {
        return listOpenSessions.execute(customer.id());
    }

    @SchemaMapping(typeName = "Customer", field = "wishlist")
    public List<Product> customerWishlist(Customer customer) {
        return viewWishlist.forOwner(customer.id());
    }

    @SchemaMapping(typeName = "Session", field = "current")
    public boolean sessionIsCurrent(Session session, GraphQLContext graphQlContext) {
        return session.id().equals(RequestContext.from(graphQlContext).currentSessionId());
    }

    private AuthenticationPayload authenticationPayload(RequestContext context, Result<Authentication> result) {
        if (!result.succeeded()) {
            return AuthenticationPayload.refused(result.errors());
        }
        Authentication authentication = result.valueOrThrow();
        context.rememberSessionOpenedByThisRequest(authentication.sessionId());
        context.setCookie(Cookies.refresh(authentication.refreshToken(), securitySettings.cookiesAreSecure()));
        return new AuthenticationPayload(authentication.customer(), authentication.accessToken().value(),
                authentication.accessToken().expiresAt(), List.of());
    }
}
