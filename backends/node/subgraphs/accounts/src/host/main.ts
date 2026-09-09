import { randomUUID } from "node:crypto";
import type { Express, Request, Response } from "express";
import {
  cartCookieName,
  currentProfile,
  openDatabaseFor,
  remoteAccessTokenVerifier,
  startSubgraph,
  systemClock,
  writeCookie,
  type SubgraphRequestContext
} from "@zappy/shared";
import { createAccountTables } from "../adapters/persistence/accountTables.js";
import {
  sqlCustomerRepository,
  sqlRefreshTokenRepository,
  sqlSessionRepository,
  sqlWishlistRepository
} from "../adapters/persistence/sqlAccountRepositories.js";
import { argon2PasswordHasher } from "../adapters/security/argon2PasswordHasher.js";
import { generateSigningKeys, jsonWebKeySet, rsaTokenIssuer } from "../adapters/security/rsaTokenIssuer.js";
import { graphCartMerger } from "../adapters/cart/graphCartMerger.js";
import { authenticate } from "../application/authenticate.js";
import { inMemoryAttemptLimiter } from "../application/attemptLimiter.js";
import { manageSessions } from "../application/manageSessions.js";
import { manageWishlist } from "../application/manageWishlist.js";
import { resetAccountSeed } from "../application/resetSeed.js";
import { accountsResolvers } from "../adapters/graphql/resolvers.js";
import type { AccountsContext } from "../adapters/graphql/context.js";

export const anonymousWishlistCookieLifetimeInSeconds = 60 * 60 * 24 * 30;

export async function startAccounts(): Promise<{ url: string; stop(): Promise<void> }> {
  const database = openDatabaseFor("accounts");
  await createAccountTables(database);

  const customers = sqlCustomerRepository(database);
  const sessionStore = sqlSessionRepository(database);
  const refreshTokens = sqlRefreshTokenRepository(database);
  const wishlists = sqlWishlistRepository(database);
  const passwords = argon2PasswordHasher();
  const keys = await generateSigningKeys();
  const tokens = rsaTokenIssuer(keys, () => systemClock.now());
  const sessions = manageSessions(sessionStore, refreshTokens, () => systemClock.now());
  const wishlist = manageWishlist(wishlists, () => systemClock.now());
  const limiter = inMemoryAttemptLimiter();
  const reloadSeed = resetAccountSeed(customers, sessionStore, wishlists, passwords);

  if (currentProfile() === "development" && (await customers.readByEmail("jane@example.com")) === null) {
    await reloadSeed();
  }

  const running = await startSubgraph<AccountsContext>(
    {
      name: "accounts",
      resolvers: accountsResolvers,
      buildContext(base: SubgraphRequestContext): AccountsContext {
        let visitorKey = base.cartCookie;
        let sessionOfThisRequest = base.visitor?.sessionId ?? null;
        return {
          ...base,
          customers,
          sessions,
          wishlist,
          accounts: authenticate(
            customers,
            sessionStore,
            refreshTokens,
            wishlists,
            passwords,
            tokens,
            graphCartMerger(base.forwarded),
            limiter,
            () => systemClock.now()
          ),
          callerKey: base.callerAddress,
          wishlistOwner() {
            return { customerId: base.visitor?.customerId ?? null, visitorKey };
          },
          rememberVisitor(): string {
            if (visitorKey === null) {
              visitorKey = randomUUID();
              base.setCookie(
                writeCookie(cartCookieName, visitorKey, {
                  path: "/",
                  maximumAgeInSeconds: anonymousWishlistCookieLifetimeInSeconds,
                  secure: false
                })
              );
            }
            return visitorKey;
          },
          currentSessionId(): string | null {
            return sessionOfThisRequest;
          },
          rememberCurrentSession(sessionId: string): void {
            sessionOfThisRequest = sessionId;
          },
          async resetOwnData(): Promise<void> {
            await reloadSeed();
          }
        };
      },
      async isReady(): Promise<boolean> {
        return (await customers.readByEmail("jane@example.com")) !== null;
      },
      addRoutes(application: Express): void {
        application.get("/.well-known/jwks.json", (_request: Request, response: Response) => {
          response.set("cache-control", "public, max-age=300");
          response.json(jsonWebKeySet(keys));
        });
      }
    },
    remoteAccessTokenVerifier({
      async isLive(sessionId: string): Promise<boolean> {
        return sessions.isLive(sessionId);
      }
    })
  );

  return {
    url: running.url,
    async stop(): Promise<void> {
      await running.stop();
      await database.close();
    }
  };
}

if (process.argv[1]?.endsWith("main.js") === true) {
  const running = await startAccounts();
  console.log(`accounts is serving ${running.url}`);
}
