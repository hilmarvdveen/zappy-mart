export type CatalogueSelection = {
  categorySlug: string | null;
  searchTerm: string | null;
  inStockOnly: boolean;
};

export type SearchParameters = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | null {
  const single = Array.isArray(value) ? value[0] : value;
  if (single === undefined) {
    return null;
  }
  const trimmed = single.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function selectionFromSearchParameters(
  parameters: SearchParameters,
): CatalogueSelection {
  return {
    categorySlug: firstValue(parameters.category),
    searchTerm: firstValue(parameters.search),
    inStockOnly: firstValue(parameters.inStockOnly) !== null,
  };
}
