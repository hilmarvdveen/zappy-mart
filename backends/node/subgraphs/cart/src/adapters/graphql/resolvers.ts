import { GraphQLError } from "graphql";
import { currentProfile, dateTimeScalar, money, multiplyMoney } from "@zappy/shared";
import type { Cart, PricedLine } from "../../domain/cart.js";
import { priceLines, subtotalOf } from "../../domain/cart.js";
import type { CartOutcome } from "../../application/changeCart.js";
import type { CartContext } from "./context.js";
import type { Resolvers } from "../../generated/resolvers.js";

export const cartResolvers: Resolvers = {
  DateTime: dateTimeScalar,

  Query: {
    async cart(_parent, _args, context) {
      return context.cart.readCart(context.visitorIdentity());
    }
  },

  Mutation: {
    async addToCart(_parent, args, context) {
      context.rememberVisitor();
      return toCartPayload(
        await context.cart.addToCart(context.visitorIdentity(), args.productId, args.quantity ?? 1),
        context
      );
    },

    async changeCartLineQuantity(_parent, args, context) {
      context.rememberVisitor();
      return toCartPayload(
        await context.cart.changeLineQuantity(context.visitorIdentity(), args.lineId, args.quantity),
        context
      );
    },

    async removeCartLine(_parent, args, context) {
      context.rememberVisitor();
      return toCartPayload(await context.cart.removeLine(context.visitorIdentity(), args.lineId), context);
    },

    async emptyCart(_parent, args, context) {
      return context.cart.emptyCartByIdentifier(args.cartId);
    },

    async mergeAnonymousCart(_parent, args, context) {
      await context.cart.moveAnonymousCartToCustomer(args.visitorKey, args.customerId);
      return true;
    },

    async resetSubgraphSeed(_parent, _args, context) {
      if (currentProfile() !== "development") {
        throw new GraphQLError("The seed is reloaded in the development profile only.");
      }
      await context.resetOwnData();
      return { success: true, loadedProducts: 0, errors: [] };
    }
  },

  Cart: {
    async __resolveReference(reference, context) {
      return context.carts.readByIdentifier(reference.id);
    },

    lines(parent) {
      return parent.lines.map((line) => ({ ...line, cartId: parent.id }));
    },

    async subtotal(parent, _args, context) {
      return subtotalOf(await pricedLinesOf(parent, context));
    }
  },

  CartLine: {
    product(parent) {
      return { id: parent.productId };
    },

    async lineTotal(parent, _args, context) {
      const product = await context.catalogue.readProduct(parent.productId);
      return multiplyMoney(product?.price ?? money(0), parent.quantity);
    }
  }
};

async function pricedLinesOf(cart: Cart, context: CartContext): Promise<readonly PricedLine[]> {
  const products = await context.catalogue.readProducts(cart.lines.map((line) => line.productId));
  const priceByProduct = new Map(products.map((product) => [product.id, product.price]));
  return priceLines(cart, (productId) => priceByProduct.get(productId) ?? null);
}

async function toCartPayload(outcome: CartOutcome, context: CartContext) {
  if (outcome.kind === "changed") {
    return { cart: outcome.cart, availableStock: null, errors: [] };
  }
  return {
    cart: await context.cart.readCart(context.visitorIdentity()),
    availableStock: outcome.availableStock,
    errors: [...outcome.errors]
  };
}
