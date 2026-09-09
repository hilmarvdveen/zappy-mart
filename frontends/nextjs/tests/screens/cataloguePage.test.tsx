import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { CatalogueSelection } from "@/server/catalogueSelection";

vi.mock("@/components/CatalogueFilters", () => ({
  CatalogueFilters: ({
    categorySlug,
    searchTerm,
  }: {
    categorySlug: string | null;
    searchTerm: string | null;
  }) => (
    <form role="search">
      <p>
        filter on {categorySlug ?? "every category"} and{" "}
        {searchTerm ?? "every name"}
      </p>
    </form>
  ),
}));

vi.mock("@/components/CatalogueResults", () => ({
  CatalogueResults: ({ selection }: { selection: CatalogueSelection }) => (
    <p>
      results for {selection.categorySlug ?? "every category"} and{" "}
      {selection.searchTerm ?? "every name"}
    </p>
  ),
}));

import CataloguePage from "@/app/page";

function renderCataloguePage(
  parameters: Record<string, string | string[] | undefined>,
) {
  return CataloguePage({
    params: Promise.resolve({}),
    searchParams: Promise.resolve(parameters),
  });
}

describe("the catalogue screen", () => {
  it("shows the heading, the filter and the whole catalogue by default", async () => {
    render(await renderCataloguePage({}));

    expect(
      screen.getByRole("heading", { level: 1, name: "Catalogue" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("search")).toHaveTextContent(
      "filter on every category and every name",
    );
    expect(
      screen.getByText("results for every category and every name"),
    ).toBeInTheDocument();
  });

  it("reads the category and the search term out of the address", async () => {
    render(
      await renderCataloguePage({ category: "electronics", search: "drive" }),
    );

    expect(screen.getByRole("search")).toHaveTextContent(
      "filter on electronics and drive",
    );
    expect(
      screen.getByText("results for electronics and drive"),
    ).toBeInTheDocument();
  });
});
