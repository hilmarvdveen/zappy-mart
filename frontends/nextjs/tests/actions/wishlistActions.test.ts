import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  writeToApi: vi.fn(),
  revalidateStorefront: vi.fn(),
}));

vi.mock("@/server/storefrontClient", () => ({
  writeToApi: mocked.writeToApi,
  readFromApi: vi.fn(),
}));

vi.mock("@/server/revalidation", () => ({
  revalidateStorefront: mocked.revalidateStorefront,
}));

import {
  removeProductFromWishlist,
  saveProductToWishlist,
} from "@/server/actions/wishlistActions";
import { untouchedAction } from "@/server/actionState";

function formWith(fields: Record<string, string>): FormData {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    form.set(name, value);
  }
  return form;
}

describe("saving a product to the wishlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends the product id", async () => {
    mocked.writeToApi.mockResolvedValue({
      addToWishlist: { products: [{ id: "product-01" }], errors: [] },
    });

    const state = await saveProductToWishlist(
      untouchedAction,
      formWith({ productId: "product-01" }),
    );

    expect(mocked.writeToApi).toHaveBeenCalledWith(expect.anything(), {
      productId: "product-01",
    });
    expect(state.outcome).toBe("succeeded");
  });

  it("hands back a refusal when nobody is signed in", async () => {
    mocked.writeToApi.mockResolvedValue({
      addToWishlist: {
        products: [],
        errors: [
          {
            code: "NOT_AUTHENTICATED",
            message: "Sign in first.",
            field: null,
          },
        ],
      },
    });

    const state = await saveProductToWishlist(
      untouchedAction,
      formWith({ productId: "product-01" }),
    );

    expect(state.outcome).toBe("refused");
    expect(state.errors[0].code).toBe("NOT_AUTHENTICATED");
  });
});

describe("removing a product from the wishlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends the product id", async () => {
    mocked.writeToApi.mockResolvedValue({
      removeFromWishlist: { products: [], errors: [] },
    });

    const state = await removeProductFromWishlist(
      untouchedAction,
      formWith({ productId: "product-01" }),
    );

    expect(mocked.writeToApi).toHaveBeenCalledWith(expect.anything(), {
      productId: "product-01",
    });
    expect(state.outcome).toBe("succeeded");
  });
});
