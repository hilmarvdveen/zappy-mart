import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  readProduct: vi.fn(),
  readSignedInCustomer: vi.fn(),
}));

vi.mock("@/server/catalogue", () => ({
  readProduct: mocked.readProduct,
}));

vi.mock("@/server/account", () => ({
  readSignedInCustomer: mocked.readSignedInCustomer,
}));

vi.mock("@/server/actions/cartActions", () => ({
  addProductToCart: vi.fn(),
}));

vi.mock("@/server/actions/wishlistActions", () => ({
  saveProductToWishlist: vi.fn(),
  removeProductFromWishlist: vi.fn(),
}));

import ProductPage from "@/app/products/[slug]/page";

import { cottonJacket } from "../support/seedFixtures";

function renderProductPage(slug: string) {
  return ProductPage({
    params: Promise.resolve({ slug }),
    searchParams: Promise.resolve({}),
  });
}

describe("the product screen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("names the product, its price and the way into the cart", async () => {
    mocked.readProduct.mockResolvedValue({ product: cottonJacket });
    mocked.readSignedInCustomer.mockResolvedValue({ me: null, wishlist: [] });

    render(await renderProductPage(cottonJacket.slug));

    expect(
      screen.getByRole("heading", { level: 1, name: "Mens Cotton Jacket" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Men's clothing" })).toHaveAttribute(
      "href",
      "/?category=mens-clothing",
    );
    expect(screen.getByRole("spinbutton", { name: "Quantity" })).toHaveValue(1);
    expect(
      screen.getByRole("button", { name: "Add to cart" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save to wishlist" }),
    ).toBeInTheDocument();
  });

  it("refuses the cart for a product with no stock", async () => {
    mocked.readProduct.mockResolvedValue({
      product: { ...cottonJacket, stock: 0 },
    });
    mocked.readSignedInCustomer.mockResolvedValue({ me: null, wishlist: [] });

    render(await renderProductPage(cottonJacket.slug));

    expect(screen.getByRole("button", { name: "Out of stock" })).toBeDisabled();
  });

  it("says so when the api does not answer", async () => {
    mocked.readProduct.mockResolvedValue(null);
    mocked.readSignedInCustomer.mockResolvedValue(null);

    render(await renderProductPage(cottonJacket.slug));

    expect(screen.getByRole("status")).toHaveTextContent(
      "The Zappy Mart API did not answer.",
    );
  });
});
