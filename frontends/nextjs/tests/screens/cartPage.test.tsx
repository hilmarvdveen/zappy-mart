import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  readCart: vi.fn(),
}));

vi.mock("@/server/cart", () => ({
  readCart: mocked.readCart,
}));

vi.mock("@/server/actions/cartActions", () => ({
  changeCartLineQuantity: vi.fn(),
  removeCartLine: vi.fn(),
  applyPromotionCode: vi.fn(),
  removePromotionCode: vi.fn(),
}));

import CartPage from "@/app/cart/page";

import { emptyCart, filledCart } from "../support/seedFixtures";

describe("the cart screen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists the lines, the totals and the way to the checkout", async () => {
    mocked.readCart.mockResolvedValue({ cart: filledCart });

    render(await CartPage());

    expect(
      screen.getByRole("heading", { level: 1, name: "Your cart" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByRole("spinbutton", { name: "Quantity" })).toHaveValue(1);
    expect(screen.getByRole("button", { name: "Update" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
    expect(
      screen.getByRole("rowheader", { name: "Total" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Totals" })).toHaveTextContent(
      "€109.95",
    );
    expect(
      screen.getByRole("link", { name: "Go to checkout" }),
    ).toHaveAttribute("href", "/checkout");
  });

  it("offers the promotion code field while no code is applied", async () => {
    mocked.readCart.mockResolvedValue({ cart: filledCart });

    render(await CartPage());

    expect(screen.getByRole("textbox", { name: "Code" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply" })).toBeInTheDocument();
  });

  it("offers to remove the code that is applied", async () => {
    mocked.readCart.mockResolvedValue({
      cart: {
        ...filledCart,
        promotion: {
          code: "WELCOME10",
          kind: "PERCENTAGE",
          discount: { amount: 1100, currency: "EUR" },
        },
      },
    });

    render(await CartPage());

    expect(
      screen.getByRole("button", { name: "Remove code" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("rowheader", { name: "Discount, WELCOME10" }),
    ).toBeInTheDocument();
  });

  it("points an empty cart back at the catalogue", async () => {
    mocked.readCart.mockResolvedValue({ cart: emptyCart });

    render(await CartPage());

    expect(
      screen.getByRole("link", { name: "Browse the catalogue" }),
    ).toHaveAttribute("href", "/");
  });

  it("says so when the api does not answer", async () => {
    mocked.readCart.mockResolvedValue(null);

    render(await CartPage());

    expect(screen.getByRole("status")).toHaveTextContent(
      "Your cart could not be loaded",
    );
  });
});
