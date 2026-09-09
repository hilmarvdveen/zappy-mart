import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { expect, test } from "vitest";
import Catalogue from "./catalogue";
import { cottonJacket, gamingDrive, mensClothing } from "~/testing/fixtures";

function renderCatalogue() {
  const Stub = createRoutesStub([
    {
      path: "/",
      Component: Catalogue,
      loader: () => ({
        search: {
          categorySlug: "mens-clothing",
          searchTerm: "jacket",
          inStockOnly: false,
          after: null,
        },
        categories: [mensClothing],
        products: [cottonJacket, gamingDrive],
        totalCount: 2,
        nextCursor: "cursor-12",
      }),
    },
  ]);
  render(<Stub initialEntries={["/"]} />);
}

test("the catalogue names every product it loaded", async () => {
  renderCatalogue();

  expect(
    await screen.findByRole("heading", { level: 1, name: "Catalogue" }),
  ).toBeVisible();
  expect(
    screen.getByRole("link", { name: cottonJacket.name }),
  ).toHaveAttribute("href", `/products/${cottonJacket.slug}`);
  expect(screen.getByRole("link", { name: gamingDrive.name })).toBeVisible();
});

test("the catalogue keeps the search term and the category in the form", async () => {
  renderCatalogue();

  expect(await screen.findByRole("searchbox", { name: "Search by name" })).toHaveValue(
    "jacket",
  );
  expect(screen.getByRole("combobox", { name: "Category" })).toHaveValue(
    "mens-clothing",
  );
  expect(
    screen.getByRole("checkbox", { name: "In stock only" }),
  ).not.toBeChecked();
  expect(screen.getByRole("button", { name: "Filter" })).toBeVisible();
});

test("the catalogue offers the next page when the API says there is one", async () => {
  renderCatalogue();

  expect(await screen.findByRole("link", { name: "Next page" })).toHaveAttribute(
    "href",
    "/?category=mens-clothing&search=jacket&after=cursor-12",
  );
});
