export const productChangedEventName = "ProductChanged";

export const wholeCatalogue = "the whole catalogue";

export type ProductChanged = {
  readonly name: typeof productChangedEventName;
  readonly productId: string | typeof wholeCatalogue;
  readonly changedAt: string;
};

export function productChanged(productId: string, changedAt: string): ProductChanged {
  return { name: productChangedEventName, productId, changedAt };
}

export function wholeCatalogueChanged(changedAt: string): ProductChanged {
  return { name: productChangedEventName, productId: wholeCatalogue, changedAt };
}
