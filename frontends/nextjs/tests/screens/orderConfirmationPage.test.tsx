import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  readOrder: vi.fn(),
}));

vi.mock("@/server/ordering", () => ({
  readOrder: mocked.readOrder,
}));

import OrderConfirmationPage from "@/app/orders/[orderId]/page";

import { placedOrder } from "../support/seedFixtures";

function renderOrderPage(orderId: string) {
  return OrderConfirmationPage({
    params: Promise.resolve({ orderId }),
    searchParams: Promise.resolve({}),
  });
}

describe("the order confirmation screen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("thanks the customer and shows the order number, the lines and the totals", async () => {
    mocked.readOrder.mockResolvedValue({ order: placedOrder });

    render(await renderOrderPage(placedOrder.id));

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Thank you, your order is placed",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "Order ZM-1001" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Order lines" })).toHaveTextContent(
      "Fjallraven",
    );
    expect(screen.getByRole("table", { name: "Totals" })).toHaveTextContent(
      "€98.95",
    );
    expect(
      screen.getByRole("rowheader", { name: "Discount, WELCOME10" }),
    ).toBeInTheDocument();
  });

  it("offers the way back to the catalogue and to the order history", async () => {
    mocked.readOrder.mockResolvedValue({ order: placedOrder });

    render(await renderOrderPage(placedOrder.id));

    expect(
      screen.getByRole("link", { name: "Back to the catalogue" }),
    ).toHaveAttribute("href", "/");
    expect(
      screen.getByRole("link", { name: "Your order history" }),
    ).toHaveAttribute("href", "/account");
  });

  it("says so when the api does not answer", async () => {
    mocked.readOrder.mockResolvedValue(null);

    render(await renderOrderPage(placedOrder.id));

    expect(screen.getByRole("status")).toHaveTextContent(
      "This order could not be loaded",
    );
  });
});
