import { randomUUID } from "node:crypto";
import {
  cartCookieName,
  openDatabaseFor,
  startSubgraph,
  systemClock,
  writeCookie,
  type SubgraphRequestContext
} from "@zappy/shared";
import { createCartTables } from "../adapters/persistence/cartTables.js";
import { sqlCartRepository } from "../adapters/persistence/sqlCartRepository.js";
import { entityCatalogueReader } from "../adapters/catalogue/entityCatalogueReader.js";
import { changeCart } from "../application/changeCart.js";
import { cartResolvers } from "../adapters/graphql/resolvers.js";
import type { CartContext } from "../adapters/graphql/context.js";

export const anonymousCartCookieLifetimeInSeconds = 60 * 60 * 24 * 30;

export async function startCart(): Promise<{ url: string; stop(): Promise<void> }> {
  const database = openDatabaseFor("cart");
  await createCartTables(database);
  const carts = sqlCartRepository(database);

  const running = await startSubgraph<CartContext>({
    name: "cart",
    resolvers: cartResolvers,
    buildContext(base: SubgraphRequestContext): CartContext {
      const catalogue = entityCatalogueReader(base.forwarded);
      const cart = changeCart(carts, catalogue, () => systemClock.now());
      let visitorKey = base.cartCookie;
      return {
        ...base,
        cart,
        carts,
        catalogue,
        visitorIdentity() {
          return { customerId: base.visitor?.customerId ?? null, visitorKey };
        },
        rememberVisitor(): string {
          if (visitorKey === null) {
            visitorKey = randomUUID();
            base.setCookie(
              writeCookie(cartCookieName, visitorKey, {
                path: "/",
                maximumAgeInSeconds: anonymousCartCookieLifetimeInSeconds,
                secure: false
              })
            );
          }
          return visitorKey;
        },
        async resetOwnData(): Promise<void> {
          await carts.removeEverything();
        }
      };
    },
    async isReady(): Promise<boolean> {
      await carts.readByOwnerKey("visitor:readiness");
      return true;
    }
  });

  return {
    url: running.url,
    async stop(): Promise<void> {
      await running.stop();
      await database.close();
    }
  };
}

if (process.argv[1]?.endsWith("main.js") === true) {
  const running = await startCart();
  console.log(`cart is serving ${running.url}`);
}
