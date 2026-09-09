import { ApiUnavailableNotice } from "@/components/ApiUnavailableNotice";
import { ProductCard } from "@/components/ProductCard";
import { readSignedInCustomer } from "@/server/account";
import { readCatalogue } from "@/server/catalogue";
import type { CatalogueSelection } from "@/server/catalogueSelection";

export async function CatalogueResults({
  selection,
}: {
  selection: CatalogueSelection;
}) {
  const [catalogue, customer] = await Promise.all([
    readCatalogue(selection),
    readSignedInCustomer(),
  ]);

  if (catalogue === null) {
    return <ApiUnavailableNotice subject="The catalogue" />;
  }

  const products = catalogue.products.edges.map((edge) => edge.node);
  const savedProductIds = new Set(
    (customer?.wishlist ?? []).map((product) => product.id),
  );

  if (products.length === 0) {
    return (
      <p role="status" className="text-slate-700">
        No product matches that filter.
      </p>
    );
  }

  return (
    <div>
      <p className="mb-4 text-sm text-slate-600">
        {catalogue.products.totalCount} products match.
      </p>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <li key={product.id} className="flex">
            <ProductCard
              product={product}
              saved={savedProductIds.has(product.id)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CatalogueResultsPlaceholder() {
  return (
    <ul
      aria-hidden="true"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {[0, 1, 2, 3, 4, 5].map((position) => (
        <li
          key={position}
          className="h-80 animate-pulse rounded border border-slate-200 bg-slate-100"
        />
      ))}
    </ul>
  );
}
