import { GraphQLError } from "graphql";
import { currentProfile, dateTimeScalar } from "@zappy/shared";
import type { Resolvers } from "../../generated/resolvers.js";

export const orderingResolvers: Resolvers = {
  DateTime: dateTimeScalar,

  Query: {
    async orders(_parent, args, context) {
      const page = await context.orders.page(
        context.visitor?.customerId ?? null,
        args.first ?? null,
        args.after ?? null
      );
      return {
        edges: page.edges.map((edge) => ({ cursor: edge.cursor, node: edge.node })),
        pageInfo: page.pageInfo,
        totalCount: page.totalCount
      };
    },

    async order(_parent, args, context) {
      return context.orders.byIdentifier(context.visitor?.customerId ?? null, args.id);
    }
  },

  Mutation: {
    async placeOrder(_parent, args, context) {
      const outcome = await context.checkout.place(
        context.visitor?.customerId ?? null,
        args.idempotencyKey ?? null
      );
      if (outcome.kind === "placed") {
        return { order: outcome.order, errors: [] };
      }
      return { order: null, errors: [...outcome.errors] };
    },

    async resetSubgraphSeed(_parent, _args, context) {
      if (currentProfile() !== "development") {
        throw new GraphQLError("The seed is reloaded in the development profile only.");
      }
      await context.resetOwnData();
      return { success: true, loadedProducts: 0, errors: [] };
    }
  },

  Order: {
    async __resolveReference(reference, context) {
      return context.orderStore.readById(reference.id, context.visitor?.customerId ?? "");
    }
  }
};
