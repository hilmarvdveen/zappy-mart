import { Suspense } from "react";

import { CatalogueFilters } from "@/components/CatalogueFilters";
import {
  CatalogueResults,
  CatalogueResultsPlaceholder,
} from "@/components/CatalogueResults";
import { selectionFromSearchParameters } from "@/server/catalogueSelection";

export default async function CataloguePage({ searchParams }: PageProps<"/">) {
  const selection = selectionFromSearchParameters(await searchParams);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Catalogue</h1>
        <p className="mt-1 text-slate-700">
          Twenty products in four categories. The category and the search term
          live in the address, so a filtered catalogue is a link you can share.
        </p>
      </div>
      <Suspense fallback={<p className="text-slate-600">Loading the filter</p>}>
        <CatalogueFilters
          categorySlug={selection.categorySlug}
          searchTerm={selection.searchTerm}
        />
      </Suspense>
      <Suspense
        key={`${selection.categorySlug ?? ""}-${selection.searchTerm ?? ""}`}
        fallback={<CatalogueResultsPlaceholder />}
      >
        <CatalogueResults selection={selection} />
      </Suspense>
    </div>
  );
}
