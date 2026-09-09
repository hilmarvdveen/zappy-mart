import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { expect, test } from "vitest";
import CartPage from "./cart";
import type { Cart } from "~/graphql/documents";
import {
  cartWithOneJacket,
  cartWithPromotion,
  emptyCart,
} from "~/testing/fixtures";

function renderCart(cart: Cart, action?: () => Promise<unknown>) {
  const Stub = createRoutesStub([
    {
      path: "/cart",
      Component: CartPage,
      loader: () => ({ cart }),
      action: action ?? (() => ({ problems: [], availableStock: null })),
    },
  ]);
  render(<Stub initialEntries={["/cart"]} />);
}

test("an empty cart points back at the catalogue", async () => {
  renderCart(emptyCart);

  expect(
    await screen.findByRole("heading", { level: 1, name: "Cart" }),
  ).toBeVisible();
  expect(
    screen.getByRole("link", { name: "Find something in the catalogue" }),
  ).toHaveAttribute("href", "/");
});

test("a filled cart lists every line with its totals", async () => {
  renderCart(cartWithOneJacket);

  const row = await screen.findByRole("row", {
    name: /Mens Cotton Jacket/,
  });
  expect(within(row).getByRole("spinbutton")).toHaveValue(1);
  expect(within(row).getAllByText("€55.99")).toHaveLength(2);
  expect(screen.getByRole("link", { name: "Go to checkout" })).toHaveAttribute(
    "href",
    "/checkout",
  );
});

test("a promotion code on the cart shows what it takes off", async () => {
  renderCart(cartWithPromotion);

  expect(
    await screen.findByText("WELCOME10 takes off €5.60."),
  ).toBeVisible();
  expect(
    screen.getByRole("button", { name: "Remove code" }),
  ).toBeVisible();
});

test("a quantity change shows the new line total before the store answers", async () => {
  let releaseAction = () => undefined as void;
  const pending = new Promise<void>((resolve) => {
    releaseAction = () => resolve();
  });
  renderCart(cartWithOneJacket, async () => {
    await pending;
    return { problems: [], availableStock: null };
  });

  const row = await screen.findByRole("row", { name: /Mens Cotton Jacket/ });
  const quantity = within(row).getByRole("spinbutton");
  await userEvent.clear(quantity);
  await userEvent.type(quantity, "3");
  await userEvent.click(within(row).getByRole("button", { name: "Update" }));

  expect(await within(row).findByText("€167.97")).toBeVisible();
  releaseAction();
});
