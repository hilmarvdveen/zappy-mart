import type { Database } from "@zappy/shared";
import { askSubgraph, money, readSeedCategories, readSeedProducts, subgraphNames } from "@zappy/shared";
import type { Product } from "../domain/product.js";
import type { ProductRepository } from "./ports.js";

export type SeedResetAnswer = {
  readonly success: boolean;
  readonly loadedProducts: number;
};

export type ResetSeed = {
  resetOwnData(): Promise<SeedResetAnswer>;
  resetWholeGraph(): Promise<SeedResetAnswer>;
};

const resetSubgraphSeedDocument = `
  mutation ResetSubgraphSeed {
    resetSubgraphSeed {
      success
      loadedProducts
    }
  }
`;

export function resetSeed(database: Database, products: ProductRepository): ResetSeed {
  async function resetOwnData(): Promise<SeedResetAnswer> {
    const seededProducts: Product[] = readSeedProducts().map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: money(product.price.amount),
      categorySlug: product.categorySlug,
      stock: product.stock,
      imageUrl: product.imageUrl
    }));
    await database.transaction(async () => {
      await database.execute("delete from stock_reservation");
      await products.replaceCatalogue(seededProducts, readSeedCategories());
    });
    return { success: true, loadedProducts: seededProducts.length };
  }

  return {
    resetOwnData,

    async resetWholeGraph(): Promise<SeedResetAnswer> {
      const own = await resetOwnData();
      const others = subgraphNames.filter((name) => name !== "catalogue");
      for (const name of others) {
        await askSubgraph(name, resetSubgraphSeedDocument, {}, { authorization: null, cookie: null });
      }
      return own;
    }
  };
}
