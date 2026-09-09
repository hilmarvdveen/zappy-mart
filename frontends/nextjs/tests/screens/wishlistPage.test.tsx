import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  readWishlist: vi.fn(),
  readSignedInCustomer: vi.fn(),
}));

vi.mock("@/server/account", () => ({
  readWishlist: mocked.readWishlist,
  readSignedInCustomer: mocked.readSignedInCustomer,
}));

vi.mock("@/server/actions/cartActions", () => ({
  addProductToCart: vi.fn(),
}));

vi.mock("@/server/actions/wishlistActions", () => ({
  saveProductToWishlist: vi.fn(),
  removeProductFromWishlist: vi.fn(),
}));

import WishlistPage from "@/app/wishlist/page";

import { backpack, signedInCustomer } from "../support/seedFixtures";

describe("the wishlist screen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists the saved products of a signed in customer", async () => {
    mocked.readWishlist.mockResolvedValue({ wishlist: [backpack] });
    mocked.readSignedInCustomer.mockResolvedValue({
      me: {
        id: signedInCustomer.id,
        name: signedInCustomer.name,
        email: signedInCustomer.email,
      },
      wishlist: [{ id: backpack.id }],
    });

    render(await WishlistPage());

    expect(
      screen.getByRole("heading", { level: 1, name: "Your wishlist" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: backpack.name }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove from wishlist" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Log in to keep it" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the list of a visitor without an account and offers to sign in", async () => {
    mocked.readWishlist.mockResolvedValue({ wishlist: [backpack] });
    mocked.readSignedInCustomer.mockResolvedValue({
      me: null,
      wishlist: [{ id: backpack.id }],
    });

    render(await WishlistPage());

    expect(
      screen.getByRole("link", { name: "Log in to keep it" }),
    ).toHaveAttribute("href", "/login?next=/wishlist");
    expect(
      screen.getByRole("heading", { level: 3, name: backpack.name }),
    ).toBeInTheDocument();
  });

  it("points an empty wishlist back at the catalogue", async () => {
    mocked.readWishlist.mockResolvedValue({ wishlist: [] });
    mocked.readSignedInCustomer.mockResolvedValue({ me: null, wishlist: [] });

    render(await WishlistPage());

    expect(
      screen.getByRole("link", { name: "Browse the catalogue" }),
    ).toHaveAttribute("href", "/");
  });

  it("says so when the api does not answer", async () => {
    mocked.readWishlist.mockResolvedValue(null);
    mocked.readSignedInCustomer.mockResolvedValue(null);

    render(await WishlistPage());

    expect(screen.getByRole("status")).toHaveTextContent(
      "Your wishlist could not be loaded",
    );
  });
});
