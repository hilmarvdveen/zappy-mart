import { readCategories } from "@/server/catalogue";

export async function CatalogueFilters({
  categorySlug,
  searchTerm,
  inStockOnly,
}: {
  categorySlug: string | null;
  searchTerm: string | null;
  inStockOnly: boolean;
}) {
  const answer = await readCategories();
  const categories = answer?.categories ?? [];

  return (
    <form
      role="search"
      method="get"
      action="/"
      className="flex flex-wrap items-end gap-4 rounded border border-slate-200 bg-white p-4"
    >
      <div>
        <label
          htmlFor="catalogue-search"
          className="block text-xs font-medium text-slate-600"
        >
          Search by name
        </label>
        <input
          id="catalogue-search"
          name="search"
          type="search"
          defaultValue={searchTerm ?? ""}
          placeholder="jacket"
          className="mt-1 w-56 rounded border border-slate-400 px-2 py-2 text-sm"
        />
      </div>
      <div>
        <label
          htmlFor="catalogue-category"
          className="block text-xs font-medium text-slate-600"
        >
          Category
        </label>
        <select
          id="catalogue-category"
          name="category"
          defaultValue={categorySlug ?? ""}
          className="mt-1 rounded border border-slate-400 px-2 py-2 text-sm"
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
          id="catalogue-in-stock-only"
          name="inStockOnly"
          type="checkbox"
          value="true"
          defaultChecked={inStockOnly}
          className="size-4 rounded border-slate-400"
        />
        <label
          htmlFor="catalogue-in-stock-only"
          className="text-sm text-slate-700"
        >
          In stock only
        </label>
      </div>
      <button
        type="submit"
        className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
      >
        Filter
      </button>
    </form>
  );
}
