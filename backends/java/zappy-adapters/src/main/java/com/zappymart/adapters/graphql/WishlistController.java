package com.zappymart.adapters.graphql;

import com.zappymart.application.accounts.AddToWishlist;
import com.zappymart.application.accounts.RemoveFromWishlist;
import com.zappymart.application.accounts.ViewWishlist;
import com.zappymart.domain.catalogue.Product;
import com.zappymart.domain.shared.Result;
import graphql.GraphQLContext;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import java.util.List;

@Controller
public class WishlistController {

    private final ViewWishlist viewWishlist;
    private final AddToWishlist addToWishlist;
    private final RemoveFromWishlist removeFromWishlist;
    private final SecuritySettings securitySettings;

    public WishlistController(ViewWishlist viewWishlist, AddToWishlist addToWishlist,
                              RemoveFromWishlist removeFromWishlist, SecuritySettings securitySettings) {
        this.viewWishlist = viewWishlist;
        this.addToWishlist = addToWishlist;
        this.removeFromWishlist = removeFromWishlist;
        this.securitySettings = securitySettings;
    }

    @QueryMapping
    public List<Product> wishlist(GraphQLContext graphQlContext) {
        return viewWishlist.execute(RequestContext.from(graphQlContext).visitor());
    }

    @MutationMapping
    public WishlistPayload addToWishlist(@Argument String productId, GraphQLContext graphQlContext) {
        RequestContext context = RequestContext.from(graphQlContext);
        return payloadOf(context, addToWishlist.execute(context.visitor(), productId));
    }

    @MutationMapping
    public WishlistPayload removeFromWishlist(@Argument String productId, GraphQLContext graphQlContext) {
        RequestContext context = RequestContext.from(graphQlContext);
        return payloadOf(context, removeFromWishlist.execute(context.visitor(), productId));
    }

    private WishlistPayload payloadOf(RequestContext context, Result<List<Product>> result) {
        if (!context.visitor().isSignedIn() && context.visitor().cartId() != null) {
            context.setCookie(Cookies.cart(context.visitor().cartId(), securitySettings.cookiesAreSecure()));
        }
        if (!result.succeeded()) {
            return new WishlistPayload(viewWishlist.execute(context.visitor()), result.errors());
        }
        return new WishlistPayload(result.valueOrThrow(), List.of());
    }
}
