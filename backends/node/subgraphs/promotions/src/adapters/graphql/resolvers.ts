import { GraphQLError } from "graphql";
import { currentProfile, money } from "@zappy/shared";
import type { Resolvers } from "../../generated/resolvers.js";

export const promotionsResolvers: Resolvers = {
  Mutation: {
    async applyPromotionCode(_parent, args, context) {
      const cart = await context.carts.readCurrentCart();
      if (cart === null) {
        return { cart: null, availableStock: null, errors: [] };
      }
      const outcome = await context.promotions.apply(cart.id, cart.subtotal, args.code);
      if (outcome.kind === "refused") {
        return { cart, availableStock: null, errors: [...outcome.errors] };
      }
      return { cart, availableStock: null, errors: [] };
    },

    async removePromotionCode(_parent, _args, context) {
      const cart = await context.carts.readCurrentCart();
      if (cart === null) {
        return { cart: null, availableStock: null, errors: [] };
      }
      await context.promotions.remove(cart.id);
      return { cart, availableStock: null, errors: [] };
    },

    async clearCartPromotion(_parent, args, context) {
      await context.promotions.remove(args.cartId);
      return true;
    },

    async countPromotionUse(_parent, args, context) {
      return context.promotions.countUse(args.code);
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
    __resolveReference(reference) {
      return { id: reference.id, subtotal: money(reference.subtotal?.amount ?? 0) };
    },

    async promotion(parent, _args, context) {
      const amounts = await context.promotions.amountsFor(parent.id, parent.subtotal);
      return amounts.promotion;
    },

    async shipping(parent, _args, context) {
      const amounts = await context.promotions.amountsFor(parent.id, parent.subtotal);
      return amounts.shipping;
    },

    async total(parent, _args, context) {
      const amounts = await context.promotions.amountsFor(parent.id, parent.subtotal);
      return amounts.total;
    }
  }
};
