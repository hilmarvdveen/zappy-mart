import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  readAccount: vi.fn(),
  readOrderHistory: vi.fn(),
}));

vi.mock("@/server/account", () => ({
  readAccount: mocked.readAccount,
}));

vi.mock("@/server/ordering", () => ({
  readOrderHistory: mocked.readOrderHistory,
}));

vi.mock("@/server/actions/accountActions", () => ({
  revokeSession: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/server/actions/cartActions", () => ({
  addProductToCart: vi.fn(),
}));

vi.mock("@/server/actions/wishlistActions", () => ({
  saveProductToWishlist: vi.fn(),
  removeProductFromWishlist: vi.fn(),
}));

import AccountPage from "@/app/account/page";

import { backpack, placedOrder, signedInCustomer } from "../support/seedFixtures";

describe("the account screen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("names the customer and carries the order history, the sessions and the wishlist", async () => {
    mocked.readAccount.mockResolvedValue({ me: signedInCustomer });
    mocked.readOrderHistory.mockResolvedValue({
      orders: {
        totalCount: 1,
        pageInfo: { hasNextPage: false, endCursor: null },
        edges: [{ cursor: placedOrder.id, node: placedOrder }],
      },
    });

    render(await AccountPage());

    expect(
      screen.getByRole("heading", { level: 1, name: "Your account" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Order history" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "Order ZM-1001" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Sessions" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Revoke Safari on iPhone" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: backpack.name }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sign out" }),
    ).toBeInTheDocument();
  });

  it("says so when no order has been placed yet", async () => {
    mocked.readAccount.mockResolvedValue({
      me: { ...signedInCustomer, wishlist: [] },
    });
    mocked.readOrderHistory.mockResolvedValue({
      orders: {
        totalCount: 0,
        pageInfo: { hasNextPage: false, endCursor: null },
        edges: [],
      },
    });

    render(await AccountPage());

    expect(
      screen.getByText("You have not placed an order yet."),
    ).toBeInTheDocument();
    expect(screen.getByText("Your wishlist is empty.")).toBeInTheDocument();
  });

  it("asks a visitor without a session to sign in", async () => {
    mocked.readAccount.mockResolvedValue({ me: null });

    render(await AccountPage());

    expect(
      screen.getByRole("link", {
        name: "Sign in to see your orders and sessions",
      }),
    ).toHaveAttribute("href", "/sign-in?next=/account");
  });

  it("says so when the api does not answer", async () => {
    mocked.readAccount.mockResolvedValue(null);

    render(await AccountPage());

    expect(screen.getByRole("status")).toHaveTextContent(
      "Your account could not be loaded",
    );
  });
});
