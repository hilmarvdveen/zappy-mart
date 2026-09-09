import { expect, test } from "vitest";
import {
  buildProductFilter,
  catalogueAddress,
  readCatalogueSearch,
} from "./catalogueSearch";

function searchIn(query: string) {
  return readCatalogueSearch(new URL(`http://localhost:5173/${query}`));
}

test("an address without a query asks for nothing in particular", () => {
  expect(searchIn("")).toEqual({
    categorySlug: null,
    searchTerm: null,
    inStockOnly: false,
    after: null,
  });
});

test("the category, the search term and the stock switch come out of the address", () => {
  expect(searchIn("?category=jewellery&search=ring&inStock=true")).toEqual({
    categorySlug: "jewellery",
    searchTerm: "ring",
    inStockOnly: true,
    after: null,
  });
});

test("an empty field counts as no filter at all", () => {
  expect(searchIn("?category=&search=%20%20").categorySlug).toBeNull();
  expect(searchIn("?category=&search=%20%20").searchTerm).toBeNull();
});

test("a search without a filter needs no filter argument", () => {
  expect(buildProductFilter(searchIn(""))).toBeNull();
});

test("a search with a filter becomes the contract's filter shape", () => {
  expect(buildProductFilter(searchIn("?search=jacket"))).toEqual({
    categorySlug: null,
    nameContains: "jacket",
    inStockOnly: null,
  });
});

test("the stock switch is only sent when it is on", () => {
  expect(buildProductFilter(searchIn("?inStock=true"))?.inStockOnly).toBe(true);
});

test("the address of a page keeps the filter and changes the cursor", () => {
  const search = searchIn("?category=jewellery&search=ring");

  expect(catalogueAddress(search, { after: "cursor-08" })).toBe(
    "/?category=jewellery&search=ring&after=cursor-08",
  );
});

test("the address of the first page drops the cursor", () => {
  const search = searchIn("?category=jewellery&after=cursor-08");

  expect(catalogueAddress(search, { after: null })).toBe("/?category=jewellery");
});

test("an address with nothing to say is the catalogue itself", () => {
  expect(catalogueAddress(searchIn(""), {})).toBe("/");
});
