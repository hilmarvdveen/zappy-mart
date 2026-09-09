import { Form, Link } from "react-router";
import type { Route } from "./+types/catalogue";
import { ProductCard } from "~/components/ProductCard";
import { catalogueQuery } from "~/graphql/documents";
import { storeConnectionFrom } from "~/session/storeContext";
import {
  buildProductFilter,
  catalogueAddress,
  cataloguePageSize,
  categoryParameter,
  inStockParameter,
  readCatalogueSearch,
  searchParameter,
} from "~/store/catalogueSearch";

export const meta: Route.MetaFunction = () => [
  { title: "Catalogue | Zappy Mart" },
];

export async function loader({ url, context }: Route.LoaderArgs) {
  const connection = storeConnectionFrom(context);
  const search = readCatalogueSearch(url);
  const answer = await connection.run(catalogueQuery, {
    filter: buildProductFilter(search),
    first: cataloguePageSize,
    after: search.after,
  });
  return {
    search,
    categories: answer.categories,
    products: answer.products.edges.map((edge) => edge.node),
    totalCount: answer.products.totalCount,
    nextCursor: answer.products.pageInfo.hasNextPage
      ? answer.products.pageInfo.endCursor
      : null,
  };
}

export default function Catalogue({ loaderData }: Route.ComponentProps) {
  const { search, categories, products, totalCount, nextCursor } = loaderData;

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">Catalogue</h1>

      <Form
        method="get"
        role="search"
        className="flex flex-wrap items-end gap-4 rounded-lg border border-slate-200 bg-white p-4"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="search-term" className="text-sm font-medium">
            Search by name
          </label>
          <input
            id="search-term"
            type="search"
            name={searchParameter}
            defaultValue={search.searchTerm ?? ""}
            className="w-56 rounded border border-slate-400 px-3 py-1.5"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="category" className="text-sm font-medium">
            Category
          </label>
          <select
            id="category"
            name={categoryParameter}
            defaultValue={search.categorySlug ?? ""}
            className="w-56 rounded border border-slate-400 px-3 py-1.5"
          >
            <option value="">Every category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 pb-2">
          <input
            id="in-stock-only"
            type="checkbox"
            name={inStockParameter}
            value="true"
            defaultChecked={search.inStockOnly}
            className="size-4"
          />
          <label htmlFor="in-stock-only" className="text-sm font-medium">
            In stock only
          </label>
        </div>

        <button
          type="submit"
          className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Filter
        </button>
      </Form>

      <p className="text-sm text-slate-600">
        {totalCount} products match this filter.
      </p>

      {products.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-6">
          No product matches this filter.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      )}

      <nav aria-label="Catalogue pages" className="flex gap-4">
        {search.after === null ? null : (
          <Link
            to={catalogueAddress(search, { after: null })}
            className="font-medium text-emerald-700 underline"
          >
            First page
          </Link>
        )}
        {nextCursor === null ? null : (
          <Link
            to={catalogueAddress(search, { after: nextCursor })}
            className="font-medium text-emerald-700 underline"
          >
            Next page
          </Link>
        )}
      </nav>
    </section>
  );
}
