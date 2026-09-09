export const categoryParameter = "category";
export const searchParameter = "search";
export const inStockParameter = "inStock";
export const afterParameter = "after";

export const cataloguePageSize = 12;
export const catalogueMaximumPageSize = 100;

export type CatalogueSearch = {
  categorySlug: string | null;
  searchTerm: string | null;
  inStockOnly: boolean;
  after: string | null;
};

export type ProductFilter = {
  categorySlug: string | null;
  nameContains: string | null;
  inStockOnly: boolean | null;
};

function readSingleValue(
  parameters: URLSearchParams,
  name: string,
): string | null {
  const value = parameters.get(name);
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function readCatalogueSearch(address: URL): CatalogueSearch {
  const parameters = address.searchParams;
  return {
    categorySlug: readSingleValue(parameters, categoryParameter),
    searchTerm: readSingleValue(parameters, searchParameter),
    inStockOnly: parameters.get(inStockParameter) === "true",
    after: readSingleValue(parameters, afterParameter),
  };
}

export function buildProductFilter(
  search: CatalogueSearch,
): ProductFilter | null {
  if (
    search.categorySlug === null &&
    search.searchTerm === null &&
    !search.inStockOnly
  ) {
    return null;
  }
  return {
    categorySlug: search.categorySlug,
    nameContains: search.searchTerm,
    inStockOnly: search.inStockOnly ? true : null,
  };
}

export function catalogueAddress(
  search: CatalogueSearch,
  changes: Partial<CatalogueSearch>,
): string {
  const next = { ...search, ...changes };
  const parameters = new URLSearchParams();
  if (next.categorySlug !== null) {
    parameters.set(categoryParameter, next.categorySlug);
  }
  if (next.searchTerm !== null) {
    parameters.set(searchParameter, next.searchTerm);
  }
  if (next.inStockOnly) {
    parameters.set(inStockParameter, "true");
  }
  if (next.after !== null) {
    parameters.set(afterParameter, next.after);
  }
  const query = parameters.toString();
  return query.length === 0 ? "/" : `/?${query}`;
}
