import { GraphQLError } from "graphql";
import {
  clearCookie,
  currentProfile,
  dateTimeScalar,
  refreshCookieName,
  refreshCookiePath,
  refreshTokenLifetimeInDays,
  writeCookie
} from "@zappy/shared";
import type { SignedIn } from "../../application/authenticate.js";
import type { AccountsContext } from "./context.js";
import type { Resolvers } from "../../generated/resolvers.js";

export const refreshCookieLifetimeInSeconds = refreshTokenLifetimeInDays * 24 * 60 * 60;

export const accountsResolvers: Resolvers = {
  DateTime: dateTimeScalar,

  Query: {
    async me(_parent, _args, context) {
      if (context.visitor === null) {
        return null;
      }
      const stored = await context.customers.readByIdentifier(context.visitor.customerId);
      if (stored === null) {
        return null;
      }
      return { id: stored.id, email: stored.email, name: stored.name, createdAt: stored.createdAt };
    },

    async wishlist(_parent, _args, context) {
      const identifiers = await context.wishlist.read(context.wishlistOwner());
      return identifiers.map((id) => ({ id }));
    },

    async isSessionLive(_parent, args, context) {
      return context.sessions.isLive(args.sessionId);
    }
  },

  Mutation: {
    async register(_parent, args, context) {
      const outcome = await context.accounts.register({
        email: args.input.email,
        name: args.input.name,
        password: args.input.password,
        device: null,
        userAgent: context.userAgent,
        visitorKey: context.cartCookie,
        callerKey: `register:${context.callerAddress}:${args.input.email.toLowerCase()}`
      });
      return toAuthenticationPayload(outcome, context);
    },

    async login(_parent, args, context) {
      const outcome = await context.accounts.login({
        email: args.input.email,
        password: args.input.password,
        device: args.input.device ?? null,
        userAgent: context.userAgent,
        visitorKey: context.cartCookie,
        callerKey: `login:${context.callerAddress}:${args.input.email.toLowerCase()}`
      });
      return toAuthenticationPayload(outcome, context);
    },

    async refreshSession(_parent, _args, context) {
      const outcome = await context.accounts.refresh(context.refreshCookie);
      if (outcome.kind === "refused") {
        context.setCookie(clearCookie(refreshCookieName, refreshCookiePath));
      }
      return toAuthenticationPayload(outcome, context);
    },

    async logout(_parent, _args, context) {
      await context.accounts.logout(context.visitor?.sessionId ?? null);
      context.setCookie(clearCookie(refreshCookieName, refreshCookiePath));
      return { success: true, errors: [] };
    },

    async revokeSession(_parent, args, context) {
      const outcome = await context.sessions.revoke(context.visitor?.customerId ?? null, args.sessionId);
      return { sessions: [...outcome.sessions], errors: [...outcome.errors] };
    },

    async addToWishlist(_parent, args, context) {
      context.rememberVisitor();
      const outcome = await context.wishlist.add(context.wishlistOwner(), args.productId);
      return {
        products: outcome.productIdentifiers.map((id) => ({ id })),
        errors: [...outcome.errors]
      };
    },

    async removeFromWishlist(_parent, args, context) {
      context.rememberVisitor();
      const outcome = await context.wishlist.remove(context.wishlistOwner(), args.productId);
      return {
        products: outcome.productIdentifiers.map((id) => ({ id })),
        errors: [...outcome.errors]
      };
    },

    async resetSubgraphSeed(_parent, _args, context) {
      if (currentProfile() !== "development") {
        throw new GraphQLError("The seed is reloaded in the development profile only.");
      }
      await context.resetOwnData();
      return { success: true, loadedProducts: 0, errors: [] };
    }
  },

  Customer: {
    async __resolveReference(reference, context) {
      const stored = await context.customers.readByIdentifier(reference.id);
      if (stored === null) {
        return null;
      }
      return { id: stored.id, email: stored.email, name: stored.name, createdAt: stored.createdAt };
    },

    async sessions(parent, _args, context) {
      return [...(await context.sessions.openSessionsFor(parent.id))];
    },

    async wishlist(parent, _args, context) {
      const identifiers = await context.wishlist.read({ customerId: parent.id, visitorKey: null });
      return identifiers.map((id) => ({ id }));
    }
  },

  Session: {
    current(parent, _args, context) {
      return parent.id === context.currentSessionId();
    }
  }
};

function toAuthenticationPayload(
  outcome: Awaited<ReturnType<AccountsContext["accounts"]["login"]>>,
  context: AccountsContext
) {
  if (outcome.kind === "refused") {
    return { customer: null, accessToken: null, accessTokenExpiresAt: null, errors: [...outcome.errors] };
  }
  return signedInPayload(outcome.signedIn, context);
}

function signedInPayload(signedIn: SignedIn, context: AccountsContext) {
  context.rememberCurrentSession(signedIn.session.id);
  context.setCookie(
    writeCookie(refreshCookieName, signedIn.refreshTokenValue, {
      path: refreshCookiePath,
      maximumAgeInSeconds: refreshCookieLifetimeInSeconds,
      secure: false
    })
  );
  return {
    customer: signedIn.customer,
    accessToken: signedIn.accessToken.token,
    accessTokenExpiresAt: signedIn.accessToken.expiresAt,
    errors: []
  };
}
