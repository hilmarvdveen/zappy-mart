import {
  currentProfile,
  openDatabaseFor,
  startSubgraph,
  systemClock,
  type SubgraphRequestContext
} from "@zappy/shared";
import { createPromotionTables } from "../adapters/persistence/promotionTables.js";
import {
  sqlAppliedPromotionStore,
  sqlPromotionCodeRepository
} from "../adapters/persistence/sqlPromotionRepository.js";
import { currentCartReader } from "../adapters/cart/currentCartReader.js";
import { managePromotions } from "../application/applyPromotionCode.js";
import { resetPromotionSeed } from "../application/resetSeed.js";
import { promotionsResolvers } from "../adapters/graphql/resolvers.js";
import type { PromotionsContext } from "../adapters/graphql/context.js";

export async function startPromotions(): Promise<{ url: string; stop(): Promise<void> }> {
  const database = openDatabaseFor("promotions");
  await createPromotionTables(database);

  const codes = sqlPromotionCodeRepository(database);
  const applied = sqlAppliedPromotionStore(database);
  const promotions = managePromotions(codes, applied, () => systemClock.now());
  const reloadSeed = resetPromotionSeed(codes, applied);

  if (currentProfile() === "development" && (await codes.readByCode("WELCOME10")) === null) {
    await reloadSeed();
  }

  const running = await startSubgraph<PromotionsContext>({
    name: "promotions",
    resolvers: promotionsResolvers,
    buildContext(base: SubgraphRequestContext): PromotionsContext {
      return {
        ...base,
        promotions,
        carts: currentCartReader(base.forwarded),
        resetOwnData: reloadSeed
      };
    },
    async isReady(): Promise<boolean> {
      return (await codes.readByCode("WELCOME10")) !== null;
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
  const running = await startPromotions();
  console.log(`promotions is serving ${running.url}`);
}
