import { GraphQLError } from "graphql";
import { currentProfile } from "@zappy/shared";
import type { Resolvers } from "../../generated/resolvers.js";

export const catalogueResolvers: Resolvers = {
  Query: {
    async products(_parent, args, context) {
      const page = await context.catalogue.page(args.filter ?? null, args.first ?? null, args.after ?? null);
      return {
        edges: page.edges.map((edge) => ({ cursor: edge.cursor, node: edge.node })),
        pageInfo: page.pageInfo,
        totalCount: page.totalCount
      };
    },

    async product(_parent, args, context) {
      return context.catalogue.bySlug(args.slug);
    },

    async categories(_parent, _args, context) {
      return [...(await context.catalogue.categories())];
    }
  },

  Mutation: {
    async reserveStock(_parent, args, context) {
      const answer = await context.stock.reserve(
        args.idempotencyKey,
        args.lines.map((line) => ({ productId: line.productId, quantity: line.quantity }))
      );
      return answer;
    },

    async releaseStock(_parent, args, context) {
      return context.stock.release(args.idempotencyKey);
    },

    async resetSeed(_parent, _args, context) {
      requireDevelopmentProfile();
      const answer = await context.seed.resetWholeGraph();
      return { ...answer, errors: [] };
    },

    async resetSubgraphSeed(_parent, _args, context) {
      requireDevelopmentProfile();
      const answer = await context.seed.resetOwnData();
      return { ...answer, errors: [] };
    }
  },

  Product: {
    async __resolveReference(reference, context) {
      return context.productByIdentifier.load(reference.id);
    },

    async category(parent, _args, context) {
      const category = await context.categoryBySlug.load(parent.categorySlug);
      if (category === null) {
        throw new GraphQLError(`Product ${parent.id} points at the unknown category ${parent.categorySlug}`);
      }
      return category;
    }
  }
};

function requireDevelopmentProfile(): void {
  if (currentProfile() !== "development") {
    throw new GraphQLError("The seed is reloaded in the development profile only.");
  }
}
