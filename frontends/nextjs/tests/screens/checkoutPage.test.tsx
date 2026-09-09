import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  readCart: vi.fn(),
  readSignedInCustomer: vi.fn(),
  holdsAccessToken: vi.fn(),
  redirect: vi.fn((destination: string) => {
    throw new Error(`redirected to ${destination}`);
  }),
}));

vi.mock("@/server/cart", () => ({
  readCart: mocked.readCart,
}));

vi.mock("@/server/account", () => ({
  readSignedInCustomer: mocked.readSignedInCustomer,
  holdsAccessToken: mocked.holdsAccessToken,
}));

vi.mock("@/server/actions/orderingActions", () => ({
  placeOrder: vi.fn(),
}));

vi.mock("@/server/actions/cartActions", () => ({
  applyPromotionCode: vi.fn(),
  removePromotionCode: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: mocked.redirect,
}));

import CheckoutPage from "@/app/checkout/page";

import { emptyCart, filledCart, signedInCustomer } from "../support/seedFixtures";

const loggedIn = {
  me: {
    id: signedInCustomer.id,
    name: signedInCustomer.name,
    email: signedInCustomer.email,
  },
  wishlist: [],
};

describe("the checkout screen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.holdsAccessToken.mockResolvedValue(false);
  });

  it("greets the customer, shows the order, the promotion field and the totals", async () => {
    mocked.readCart.mockResolvedValue({ cart: filledCart });
    mocked.readSignedInCustomer.mockResolvedValue(loggedIn);

    render(await CheckoutPage());

    expect(
      screen.getByRole("heading", { level: 1, name: "Checkout" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Jane Doe, check your order and place it."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Promotion code" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Apply code" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Totals" })).toHaveTextContent(
      "€109.95",
    );
    expect(screen.getByRole("button", { name: "Place order" })).toBeEnabled();
  });

  it("says what an applied code takes off", async () => {
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
    mocked.readSignedInCustomer.mockResolvedValue(loggedIn);

    render(await CheckoutPage());

    expect(
      screen.getByText("WELCOME10 takes off €11.00."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove code" }),
    ).toBeInTheDocument();
  });

  it("cannot place an order from an empty cart", async () => {
    mocked.readCart.mockResolvedValue({ cart: emptyCart });
    mocked.readSignedInCustomer.mockResolvedValue(loggedIn);

    render(await CheckoutPage());

    expect(screen.getByRole("button", { name: "Place order" })).toBeDisabled();
  });

  it("sends a visitor without an account to the log in screen", async () => {
    mocked.readCart.mockResolvedValue({ cart: filledCart });
    mocked.readSignedInCustomer.mockResolvedValue({ me: null, wishlist: [] });

    await expect(CheckoutPage()).rejects.toThrow(
      "redirected to /login?next=/checkout",
    );
  });

  it("says the session ended when the cookie still holds a dead token", async () => {
    mocked.readCart.mockResolvedValue({ cart: filledCart });
    mocked.readSignedInCustomer.mockResolvedValue({ me: null, wishlist: [] });
    mocked.holdsAccessToken.mockResolvedValue(true);

    await expect(CheckoutPage()).rejects.toThrow(
      "redirected to /login?next=/checkout&sessionEnded=true",
    );
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
