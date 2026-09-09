import DataLoader from "dataloader";
import type { ForwardedHeaders } from "@zappy/shared";
import { askSubgraph, money } from "@zappy/shared";
import type { CataloguedProduct, CatalogueReader } from "../../application/ports.js";

const productsByReferenceDocument = `
  query ProductsByReference($representations: [_Any!]!) {
    _entities(representations: $representations) {
      ... on Product {
        id
        name
        price { amount currency }
        stock
      }
    }
  }
`;

type ProductEntity = {
  readonly id: string;
  readonly name: string;
  readonly price: { readonly amount: number };
  readonly stock: number;
};

type EntityAnswer = {
  readonly _entities: readonly (ProductEntity | null)[];
};

export type AskCatalogueForProducts = (
  representations: readonly Readonly<Record<string, unknown>>[]
) => Promise<EntityAnswer>;

export function overTheGraph(forwarded: ForwardedHeaders): AskCatalogueForProducts {
  return (representations) =>
    askSubgraph<EntityAnswer>(
      "catalogue",
      productsByReferenceDocument,
      { representations },
      forwarded,
      { idempotent: true }
    );
}

export function entityCatalogueReader(
  forwarded: ForwardedHeaders,
  askCatalogue: AskCatalogueForProducts = overTheGraph(forwarded)
): CatalogueReader {
  const loader = new DataLoader<string, CataloguedProduct | null>(async (productIdentifiers) => {
    const representations = productIdentifiers.map((id) => ({ __typename: "Product", id }));
    const answer = await askCatalogue(representations);
    const found = new Map<string, CataloguedProduct>();
    for (const entity of answer._entities) {
      if (entity !== null) {
        found.set(entity.id, {
          id: entity.id,
          name: entity.name,
          price: money(entity.price.amount),
          stock: entity.stock
        });
      }
    }
    return productIdentifiers.map((identifier) => found.get(identifier) ?? null);
  });

  return {
    async readProduct(productId: string): Promise<CataloguedProduct | null> {
      return loader.load(productId);
    },

    async readProducts(productIdentifiers: readonly string[]): Promise<readonly CataloguedProduct[]> {
      const loaded = await Promise.all(productIdentifiers.map((identifier) => loader.load(identifier)));
      return loaded.filter((product): product is CataloguedProduct => product !== null);
    }
  };
}
