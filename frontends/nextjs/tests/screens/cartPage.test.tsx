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
}));

import CartPage from "@/app/cart/page";

import { backpack, emptyCart, filledCart } from "../support/seedFixtures";

describe("the cart screen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists every line as a row with its quantity, its total and its remove button", async () => {
    mocked.readCart.mockResolvedValue({ cart: filledCart });

    render(await CartPage());

    expect(
      screen.getByRole("heading", { level: 1, name: "Cart" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("rowheader", { name: new RegExp(backpack.name) }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("spinbutton", { name: `Quantity of ${backpack.name}` }),
    ).toHaveValue(1);
    expect(screen.getByRole("button", { name: "Update" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: `Remove ${backpack.name}` }),
    ).toBeInTheDocument();
  });

  it("shows the totals and the way to the checkout", async () => {
    mocked.readCart.mockResolvedValue({ cart: filledCart });

    render(await CartPage());

    expect(screen.getByRole("rowheader", { name: "Total" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Totals" })).toHaveTextContent(
      "€109.95",
    );
    expect(screen.getByRole("link", { name: "Go to checkout" })).toHaveAttribute(
      "href",
      "/checkout",
    );
  });

  it("points an empty cart back at the catalogue", async () => {
    mocked.readCart.mockResolvedValue({ cart: emptyCart });

    render(await CartPage());

    expect(screen.getByText("Your cart is empty.")).toBeInTheDocument();
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
