package com.zappymart.adapters.graphql;

import com.zappymart.application.cart.AddToCart;
import com.zappymart.application.cart.ChangeCartLineQuantity;
import com.zappymart.application.cart.RemoveCartLine;
import com.zappymart.application.cart.ViewCart;
import com.zappymart.application.catalogue.FindProductById;
import com.zappymart.application.promotions.ApplyPromotionCode;
import com.zappymart.application.promotions.RemovePromotionCode;
import com.zappymart.domain.cart.Cart;
import com.zappymart.domain.cart.CartLine;
import com.zappymart.domain.catalogue.Product;
import com.zappymart.domain.shared.Result;
import com.zappymart.domain.shared.UserError;
import com.zappymart.domain.shared.UserErrorCode;
import graphql.GraphQLContext;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import java.util.function.Function;

@Controller
public class CartController {

    private final ViewCart viewCart;
    private final AddToCart addToCart;
    private final ChangeCartLineQuantity changeCartLineQuantity;
    private final RemoveCartLine removeCartLine;
    private final ApplyPromotionCode applyPromotionCode;
    private final RemovePromotionCode removePromotionCode;
    private final FindProductById findProductById;
    private final SecuritySettings securitySettings;

    public CartController(ViewCart viewCart, AddToCart addToCart,
                          ChangeCartLineQuantity changeCartLineQuantity, RemoveCartLine removeCartLine,
                          ApplyPromotionCode applyPromotionCode, RemovePromotionCode removePromotionCode,
                          FindProductById findProductById, SecuritySettings securitySettings) {
        this.viewCart = viewCart;
        this.addToCart = addToCart;
        this.changeCartLineQuantity = changeCartLineQuantity;
        this.removeCartLine = removeCartLine;
        this.applyPromotionCode = applyPromotionCode;
        this.removePromotionCode = removePromotionCode;
        this.findProductById = findProductById;
        this.securitySettings = securitySettings;
    }

    @QueryMapping
    public Cart cart(GraphQLContext graphQlContext) {
        return viewCart.execute(RequestContext.from(graphQlContext).visitor());
    }

    @MutationMapping
    public CartPayload addToCart(@Argument String productId, @Argument Integer quantity,
                                 GraphQLContext graphQlContext) {
        RequestContext context = RequestContext.from(graphQlContext);
        Result<Cart> result = addToCart.execute(context.visitor(), productId, quantity == null ? 1 : quantity);
        return payloadOf(context, result, unused -> productId);
    }

    @MutationMapping
    public CartPayload changeCartLineQuantity(@Argument String lineId, @Argument int quantity,
                                              GraphQLContext graphQlContext) {
        RequestContext context = RequestContext.from(graphQlContext);
        Result<Cart> result = changeCartLineQuantity.execute(context.visitor(), lineId, quantity);
        return payloadOf(context, result,
                cart -> cart.lineFor(lineId).map(CartLine::product).map(Product::id).orElse(null));
    }

    @MutationMapping
    public CartPayload removeCartLine(@Argument String lineId, GraphQLContext graphQlContext) {
        RequestContext context = RequestContext.from(graphQlContext);
        return payloadOf(context, removeCartLine.execute(context.visitor(), lineId), unused -> null);
    }

    @MutationMapping
    public CartPayload applyPromotionCode(@Argument String code, GraphQLContext graphQlContext) {
        RequestContext context = RequestContext.from(graphQlContext);
        return payloadOf(context, applyPromotionCode.execute(context.visitor(), code), unused -> null);
    }

    @MutationMapping
    public CartPayload removePromotionCode(GraphQLContext graphQlContext) {
        RequestContext context = RequestContext.from(graphQlContext);
        return payloadOf(context, removePromotionCode.execute(context.visitor()), unused -> null);
    }

    private CartPayload payloadOf(RequestContext context, Result<Cart> result,
                                  Function<Cart, String> productWithTheStock) {
        Cart cart = result.orElseGet(() -> viewCart.execute(context.visitor()));
        if (result.succeeded() && !context.visitor().isSignedIn()) {
            context.setCookie(Cookies.cart(cart.id(), securitySettings.cookiesAreSecure()));
        }
        return new CartPayload(cart, availableStock(result, productWithTheStock.apply(cart)), result.errors());
    }

    private Integer availableStock(Result<Cart> result, String productId) {
        boolean outOfStock = result.errors().stream()
                .map(UserError::code)
                .anyMatch(code -> code == UserErrorCode.OUT_OF_STOCK);
        if (!outOfStock || productId == null) {
            return null;
        }
        return findProductById.execute(productId).map(Product::stock).orElse(null);
    }
}
