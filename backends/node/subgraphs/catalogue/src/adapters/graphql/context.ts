import type DataLoader from "dataloader";
import type { SubgraphRequestContext } from "@zappy/shared";
import type { Category, Product } from "../../domain/product.js";
import type { ReadCatalogue } from "../../application/readCatalogue.js";
import type { ReserveStock } from "../../application/reserveStock.js";
import type { ResetSeed } from "../../application/resetSeed.js";

export type CatalogueContext = SubgraphRequestContext & {
  readonly catalogue: ReadCatalogue;
  readonly stock: ReserveStock;
  readonly seed: ResetSeed;
  readonly productByIdentifier: DataLoader<string, Product | null>;
  readonly categoryBySlug: DataLoader<string, Category | null>;
};
