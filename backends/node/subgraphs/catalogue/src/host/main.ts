import {
  currentProfile,
  openDatabaseFor,
  startSubgraph,
  systemClock,
  type SubgraphRequestContext
} from "@zappy/shared";
import { createCatalogueTables } from "../adapters/persistence/catalogueTables.js";
import { sqlCategoryRepository, sqlProductRepository } from "../adapters/persistence/sqlProductRepository.js";
import { sqlStockReservationStore } from "../adapters/persistence/sqlStockReservationStore.js";
import { readCatalogue } from "../application/readCatalogue.js";
import { reserveStock } from "../application/reserveStock.js";
import { resetSeed } from "../application/resetSeed.js";
import { catalogueResolvers } from "../adapters/graphql/resolvers.js";
import { categoryLoader, productLoader } from "../adapters/graphql/loaders.js";
import type { CatalogueContext } from "../adapters/graphql/context.js";

export async function startCatalogue(): Promise<{ url: string; stop(): Promise<void> }> {
  const database = openDatabaseFor("catalogue");
  await createCatalogueTables(database);

  const products = sqlProductRepository(database);
  const categories = sqlCategoryRepository(database);
  const reservations = sqlStockReservationStore(database);

  const catalogue = readCatalogue(products, categories);
  const stock = reserveStock(database, products, reservations, () => systemClock.now());
  const seed = resetSeed(database, products);

  if (currentProfile() === "development" && (await products.readAllInCatalogueOrder()).length === 0) {
    await seed.resetOwnData();
  }

  const running = await startSubgraph<CatalogueContext>({
    name: "catalogue",
    resolvers: catalogueResolvers,
    buildContext(base: SubgraphRequestContext): CatalogueContext {
      return {
        ...base,
        catalogue,
        stock,
        seed,
        productByIdentifier: productLoader(products),
        categoryBySlug: categoryLoader(categories)
      };
    },
    async isReady(): Promise<boolean> {
      return (await products.readAllInCatalogueOrder()).length > 0;
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
  const running = await startCatalogue();
  console.log(`catalogue is serving ${running.url}`);
}
