import { expect, test } from "@playwright/test";
import { openCatalogue } from "../storeFront";

test("the catalogue answers with products, a filter and the shop chrome", async ({
  page,
}) => {
  await openCatalogue(page);

  await expect(page.getByRole("searchbox", { name: "Search by name" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Category" })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Cart, / })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Wishlist, / })).toBeVisible();
  await expect(page.getByRole("article").first()).toBeVisible();
});
