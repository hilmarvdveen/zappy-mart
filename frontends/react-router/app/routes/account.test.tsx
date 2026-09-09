import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { expect, test } from "vitest";
import Account from "./account";
import {
  otherDeviceSession,
  placedOrder,
  thisDeviceSession,
} from "~/testing/fixtures";

function renderAccount(options?: { withoutOrders?: boolean }) {
  const Stub = createRoutesStub([
    {
      path: "/account",
      Component: Account,
      loader: () => ({
        customer: {
          id: "customer-01",
          name: "Jane Doe",
          email: "jane@example.com",
          createdAt: "2026-01-15T09:00:00Z",
          sessions: [thisDeviceSession, otherDeviceSession],
        },
        orders: options?.withoutOrders === true ? [] : [placedOrder],
        orderCount: options?.withoutOrders === true ? 0 : 1,
      }),
      action: () => ({ problems: [] }),
    },
  ]);
  render(<Stub initialEntries={["/account"]} />);
}

test("the account names the customer", async () => {
  renderAccount();

  expect(
    await screen.findByRole("heading", { level: 1, name: "Your account" }),
  ).toBeVisible();
  expect(screen.getByText("Jane Doe, jane@example.com")).toBeVisible();
});

test("the account lists the order history with a link per order", async () => {
  renderAccount();

  expect(
    await screen.findByRole("heading", { level: 2, name: "Order history" }),
  ).toBeVisible();
  expect(screen.getByRole("link", { name: "ZM-1001" })).toHaveAttribute(
    "href",
    "/orders/order-01",
  );
  expect(screen.getByText("€50.39")).toBeVisible();
});

test("the account says so when no order has been placed", async () => {
  renderAccount({ withoutOrders: true });

  expect(
    await screen.findByText(/You have not placed an order yet/),
  ).toBeVisible();
});

test("the account lists every open session with a way to revoke it", async () => {
  renderAccount();

  expect(
    await screen.findByRole("heading", { level: 2, name: "Open sessions" }),
  ).toBeVisible();
  expect(screen.getByText("Chrome on Windows (this device)")).toBeVisible();
  expect(
    screen.getByRole("button", { name: "Revoke Firefox on Linux" }),
  ).toBeVisible();
  expect(
    screen.getByRole("button", { name: "Revoke Chrome on Windows" }),
  ).toBeVisible();
});
