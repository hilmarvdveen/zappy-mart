import { expect, test } from "@playwright/test";
import { orderedProduct } from "../storeFront";

test.use({ javaScriptEnabled: false });

test("the catalogue filter and the cart forms work without JavaScript @progressive-enhancement", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("searchbox", { name: "Search by name" }).fill("MBJ");
  await page.getByRole("button", { name: "Filter" }).click();
  await expect(page).toHaveURL(/search=MBJ/);

  await page.getByRole("link", { name: orderedProduct.name, exact: true }).click();
  await page.getByRole("spinbutton", { name: "Quantity" }).fill("1");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByRole("status")).toHaveText("Added to your cart.");

  await page.goto("/cart");
  const cartLine = page.getByRole("row", { name: new RegExp(orderedProduct.name) });
  await cartLine.getByRole("spinbutton").fill("3");
  await cartLine.getByRole("button", { name: "Update" }).click();

  const changedLine = page.getByRole("row", {
    name: new RegExp(orderedProduct.name),
  });
  await expect(changedLine.getByRole("spinbutton")).toHaveValue("3");
  await expect(changedLine).toContainText("€29.55");

  await changedLine
    .getByRole("button", { name: `Remove ${orderedProduct.name}` })
    .click();
  await expect(page.getByText("Your cart is empty.")).toBeVisible();
});
