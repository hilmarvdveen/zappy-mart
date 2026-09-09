import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  readCart: vi.fn(),
  readSignedInCustomer: vi.fn(),
}));

vi.mock("@/server/cart", () => ({
  readCart: mocked.readCart,
}));

vi.mock("@/server/account", () => ({
  readSignedInCustomer: mocked.readSignedInCustomer,
}));

vi.mock("@/server/actions/orderingActions", () => ({
  placeOrder: vi.fn(),
}));

import CheckoutPage from "@/app/checkout/page";

import { emptyCart, filledCart, signedInCustomer } from "../support/seedFixtures";

describe("the checkout screen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows what is being ordered, the totals and the order button", async () => {
    mocked.readCart.mockResolvedValue({ cart: filledCart });
    mocked.readSignedInCustomer.mockResolvedValue({
      me: { id: signedInCustomer.id, name: signedInCustomer.name, email: signedInCustomer.email },
      wishlist: [],
    });

    render(await CheckoutPage());

    expect(
      screen.getByRole("heading", { level: 1, name: "Checkout" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "What you are ordering" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("listitem")).toHaveTextContent("1 × Fjallraven");
    expect(screen.getByRole("table", { name: "Totals" })).toHaveTextContent(
      "€109.95",
    );
    expect(
      screen.getByRole("button", { name: "Place order" }),
    ).toBeEnabled();
  });

  it("cannot place an order from an empty cart", async () => {
    mocked.readCart.mockResolvedValue({ cart: emptyCart });
    mocked.readSignedInCustomer.mockResolvedValue({
      me: { id: signedInCustomer.id, name: signedInCustomer.name, email: signedInCustomer.email },
      wishlist: [],
    });

    render(await CheckoutPage());

    expect(
      screen.getByRole("button", { name: "Place order" }),
    ).toBeDisabled();
  });

  it("asks a visitor without an account to sign in first", async () => {
    mocked.readCart.mockResolvedValue({ cart: filledCart });
    mocked.readSignedInCustomer.mockResolvedValue({ me: null, wishlist: [] });

    render(await CheckoutPage());

    expect(
      screen.getByRole("link", { name: "Sign in to place this order" }),
    ).toHaveAttribute("href", "/sign-in?next=/checkout");
    expect(
      screen.queryByRole("button", { name: "Place order" }),
    ).not.toBeInTheDocument();
  });

  it("says so when the api does not answer", async () => {
    mocked.readCart.mockResolvedValue(null);
    mocked.readSignedInCustomer.mockResolvedValue(null);

    render(await CheckoutPage());

    expect(screen.getByRole("status")).toHaveTextContent(
      "Your checkout could not be loaded",
    );
  });
});
