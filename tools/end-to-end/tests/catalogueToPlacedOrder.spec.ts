import { expect, test } from "@playwright/test";
import {
  addToCart,
  filterCatalogue,
  logIn,
  openCatalogue,
  openProduct,
  orderedProduct,
  promotionCode,
  seedCustomer,
} from "../storeFront";

test("a visitor filters the catalogue, fills a cart, uses a promotion code and places an order", async ({
  page,
}) => {
  await openCatalogue(page);

  await filterCatalogue(page, {
    categoryName: "Women's clothing",
    searchTerm: "MBJ",
  });
  await expect(page).toHaveURL(/search=MBJ/);
  await expect(page).toHaveURL(/category=womens-clothing/);

  await openProduct(page, orderedProduct.name);
  await expect(page.getByText(orderedProduct.price)).toBeVisible();
  await addToCart(page, 2);

  await page.getByRole("link", { name: /^Cart, 2 items/ }).click();
  const cartLine = page.getByRole("row", { name: new RegExp(orderedProduct.name) });
  await expect(cartLine.getByRole("spinbutton")).toHaveValue("2");
  await expect(cartLine).toContainText("€19.70");
  await expect(page.getByText("€4.95")).toBeVisible();

  await page.getByRole("link", { name: "Go to checkout" }).click();
  await logIn(page, seedCustomer);

  await expect(page.getByRole("heading", { level: 1, name: "Checkout" })).toBeVisible();
  await expect(page.getByText(`${seedCustomer.name}, check your order and place it.`)).toBeVisible();

  await page.getByRole("textbox", { name: "Promotion code" }).fill(promotionCode);
  await page.getByRole("button", { name: "Apply code" }).click();
  await expect(page.getByText(`${promotionCode} takes off €1.97.`)).toBeVisible();
  await expect(page.getByText("€22.68")).toBeVisible();

  await page.getByRole("button", { name: "Place order" }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Thank you for your order" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/orders\//);
  await expect(page.getByRole("row", { name: new RegExp(orderedProduct.name) })).toBeVisible();
  await expect(page.getByText(promotionCode, { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Cart, 0 items/ })).toBeVisible();
});
