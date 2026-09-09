import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { expect, test } from "vitest";
import Checkout from "./checkout";
import { cartWithPromotion } from "~/testing/fixtures";

function renderCheckout(problems: string[] = []) {
  const Stub = createRoutesStub([
    {
      path: "/checkout",
      Component: Checkout,
      loader: () => ({
        cart: cartWithPromotion,
        customerName: "Jane Doe",
        idempotencyKey: "checkout-key-01",
      }),
      action: () => ({ problems }),
    },
  ]);
  render(<Stub initialEntries={["/checkout"]} />);
}

test("checkout greets the customer and lists what is about to be ordered", async () => {
  renderCheckout();

  expect(
    await screen.findByRole("heading", { level: 1, name: "Checkout" }),
  ).toBeVisible();
  expect(
    screen.getByText("Jane Doe, check your order and place it."),
  ).toBeVisible();
  expect(
    screen.getByRole("row", { name: /Mens Cotton Jacket/ }),
  ).toBeVisible();
  expect(screen.getByRole("button", { name: "Place order" })).toBeVisible();
});

test("checkout shows the promotion code and the totals it produced", async () => {
  renderCheckout();

  expect(await screen.findByText("WELCOME10 takes off €5.60.")).toBeVisible();
  expect(screen.getByText("€50.39")).toBeVisible();
});

test("checkout reports why an order was refused", async () => {
  renderCheckout(["Your cart is empty, so there is nothing to order."]);

  await userEvent.click(
    await screen.findByRole("button", { name: "Place order" }),
  );

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Your cart is empty, so there is nothing to order.",
  );
});
