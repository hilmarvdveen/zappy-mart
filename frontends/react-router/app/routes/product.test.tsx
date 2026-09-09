import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { expect, test } from "vitest";
import ProductPage from "./product";
import { cottonJacket, gamingDrive } from "~/testing/fixtures";

const description = "Great outerwear jackets for spring, autumn and winter.";

function renderProduct(options?: {
  outOfStock?: boolean;
  problems?: string[];
}) {
  const product = options?.outOfStock === true ? gamingDrive : cottonJacket;
  const Stub = createRoutesStub([
    {
      path: "/products/:slug",
      Component: ProductPage,
      loader: () => ({
        product: {
          ...product,
          stock: options?.outOfStock === true ? 0 : product.stock,
          description,
        },
        signedIn: false,
      }),
      action: () => ({
        problems: options?.problems ?? [],
        confirmations:
          options?.problems === undefined ? ["Added to your cart."] : [],
        availableStock: options?.problems === undefined ? null : 1,
      }),
    },
  ]);
  render(<Stub initialEntries={[`/products/${product.slug}`]} />);
}

test("the product page shows the name, the price and the stock", async () => {
  renderProduct();

  expect(
    await screen.findByRole("heading", { level: 1, name: cottonJacket.name }),
  ).toBeVisible();
  expect(screen.getByText("€55.99")).toBeVisible();
  expect(screen.getByText("8 in stock")).toBeVisible();
  expect(screen.getByText(description)).toBeVisible();
});

test("the product page confirms an addition to the cart", async () => {
  renderProduct();

  await userEvent.click(
    await screen.findByRole("button", { name: "Add to cart" }),
  );

  expect(await screen.findByRole("status")).toHaveTextContent(
    "Added to your cart.",
  );
});

test("the product page refuses to add a product with no stock", async () => {
  renderProduct({ outOfStock: true });

  expect(await screen.findByText("Out of stock")).toBeVisible();
  expect(screen.getByRole("button", { name: "Add to cart" })).toBeDisabled();
});

test("the product page reports what the store refused", async () => {
  renderProduct({ problems: ["There is not enough stock for that quantity."] });

  await userEvent.click(
    await screen.findByRole("button", { name: "Add to cart" }),
  );

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "There is not enough stock for that quantity.",
  );
  expect(screen.getByText("1 left in stock.")).toBeVisible();
});
