import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { expect, test } from "vitest";
import OrderConfirmation from "./orderConfirmation";
import { placedOrder } from "~/testing/fixtures";

function renderConfirmation() {
  const Stub = createRoutesStub([
    {
      path: "/orders/:orderId",
      Component: OrderConfirmation,
      loader: () => ({ order: placedOrder }),
    },
  ]);
  render(<Stub initialEntries={[`/orders/${placedOrder.id}`]} />);
}

test("the confirmation thanks the customer and names the order", async () => {
  renderConfirmation();

  expect(
    await screen.findByRole("heading", {
      level: 1,
      name: "Thank you for your order",
    }),
  ).toBeVisible();
  expect(
    screen.getByText("Order ZM-1001 is paid. It was placed on 2026-09-09."),
  ).toBeVisible();
});

test("the confirmation lists the lines and the totals of that moment", async () => {
  renderConfirmation();

  const row = await screen.findByRole("row", { name: /Mens Cotton Jacket/ });
  expect(row).toBeVisible();
  expect(screen.getByText("WELCOME10")).toBeVisible();
  expect(screen.getByText("€5.60")).toBeVisible();
  expect(screen.getByText("€50.39")).toBeVisible();
});

test("the confirmation offers the way back to the account and the catalogue", async () => {
  renderConfirmation();

  expect(await screen.findByRole("link", { name: "Your orders" })).toHaveAttribute(
    "href",
    "/account",
  );
  expect(
    screen.getByRole("link", { name: "Back to the catalogue" }),
  ).toHaveAttribute("href", "/");
});
