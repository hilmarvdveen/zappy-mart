import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  readAccount: vi.fn(),
  holdsAccessToken: vi.fn(),
  readOrderHistory: vi.fn(),
  redirect: vi.fn((destination: string) => {
    throw new Error(`redirected to ${destination}`);
  }),
}));

vi.mock("@/server/account", () => ({
  readAccount: mocked.readAccount,
  holdsAccessToken: mocked.holdsAccessToken,
}));

vi.mock("@/server/ordering", () => ({
  readOrderHistory: mocked.readOrderHistory,
}));

vi.mock("@/server/actions/accountActions", () => ({
  revokeSession: vi.fn(),
}));

vi.mock("@/server/actions/cartActions", () => ({
  addProductToCart: vi.fn(),
}));

vi.mock("@/server/actions/wishlistActions", () => ({
  saveProductToWishlist: vi.fn(),
  removeProductFromWishlist: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: mocked.redirect,
}));

import AccountPage from "@/app/account/page";

import {
  backpack,
  placedOrder,
  signedInCustomer,
} from "../support/seedFixtures";

describe("the account screen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.holdsAccessToken.mockResolvedValue(false);
  });

  it("names the customer and carries the order history and the wishlist", async () => {
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
      screen.getByRole("heading", { level: 3, name: "Order ZM-1001" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: backpack.name }),
    ).toBeInTheDocument();
  });

  it("lists one open session per device and offers to revoke the other one", async () => {
    mocked.readAccount.mockResolvedValue({ me: signedInCustomer });
    mocked.readOrderHistory.mockResolvedValue(null);

    render(await AccountPage());

    const openSessions = within(
      screen.getByRole("region", { name: "Open sessions" }),
    );
    const entries = openSessions.getAllByRole("listitem");
    expect(entries).toHaveLength(2);
    expect(entries[0]).toHaveTextContent("(this device)");
    expect(
      openSessions.getByRole("button", { name: "Revoke Safari on iPhone" }),
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

  it("asks a visitor without a session to log in", async () => {
    mocked.readAccount.mockResolvedValue({ me: null });

    render(await AccountPage());

    expect(
      screen.getByRole("link", {
        name: "Log in to see your orders and sessions",
      }),
    ).toHaveAttribute("href", "/login?next=/account");
  });

  it("sends a visitor whose session was revoked to the log in screen", async () => {
    mocked.readAccount.mockResolvedValue({ me: null });
    mocked.holdsAccessToken.mockResolvedValue(true);

    await expect(AccountPage()).rejects.toThrow(
      "redirected to /login?next=/account&sessionEnded=true",
    );
  });

  it("says so when the api does not answer", async () => {
    mocked.readAccount.mockResolvedValue(null);

    render(await AccountPage());

    expect(screen.getByRole("status")).toHaveTextContent(
      "Your account could not be loaded",
    );
  });
});
