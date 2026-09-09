import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  readCatalogue: vi.fn(),
  readSignedInCustomer: vi.fn(),
}));

vi.mock("@/server/catalogue", () => ({
  readCatalogue: mocked.readCatalogue,
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

import { CatalogueResults } from "@/components/CatalogueResults";

import { backpack, princessRing } from "../support/seedFixtures";

const wholeCatalogue = { categorySlug: null, searchTerm: null };

function catalogueOf(products: readonly { id: string }[]) {
  return {
    products: {
      totalCount: products.length,
      pageInfo: { hasNextPage: false, endCursor: null },
      edges: products.map((product) => ({
        cursor: product.id,
        node: product,
      })),
    },
  };
}

describe("the product grid on the catalogue screen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("lists every product it was given with a link to its own screen", async () => {
    mocked.readCatalogue.mockResolvedValue(
      catalogueOf([backpack, princessRing]),
    );
    mocked.readSignedInCustomer.mockResolvedValue({ me: null, wishlist: [] });

    render(await CatalogueResults({ selection: wholeCatalogue }));

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("link", { name: backpack.name })).toHaveAttribute(
      "href",
      `/products/${backpack.slug}`,
    );
    expect(
      screen.getByRole("heading", { level: 3, name: princessRing.name }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Out of stock" }),
    ).toBeInTheDocument();
  });

  it("says so when no product matches the filter", async () => {
    mocked.readCatalogue.mockResolvedValue(catalogueOf([]));
    mocked.readSignedInCustomer.mockResolvedValue({ me: null, wishlist: [] });

    render(
      await CatalogueResults({
        selection: { categorySlug: null, searchTerm: "nothing" },
      }),
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "No product matches that filter.",
    );
  });

  it("says so when the api does not answer", async () => {
    mocked.readCatalogue.mockResolvedValue(null);
    mocked.readSignedInCustomer.mockResolvedValue(null);

    render(await CatalogueResults({ selection: wholeCatalogue }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "The catalogue could not be loaded",
    );
  });
});
