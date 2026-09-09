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
  addProductToCart,
  applyPromotionCode,
  changeCartLineQuantity,
  removeCartLine,
  removePromotionCode,
} from "@/server/actions/cartActions";
import { untouchedAction } from "@/server/actionState";

function formWith(fields: Record<string, string>): FormData {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    form.set(name, value);
  }
  return form;
}

describe("adding a product to the cart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends the product and the quantity and invalidates the screens", async () => {
    mocked.writeToApi.mockResolvedValue({
      addToCart: { availableStock: null, cart: { id: "cart-1" }, errors: [] },
    });

    const state = await addProductToCart(
      untouchedAction,
      formWith({ productId: "product-01", quantity: "2" }),
    );

    expect(mocked.writeToApi).toHaveBeenCalledWith(expect.anything(), {
      productId: "product-01",
      quantity: 2,
    });
    expect(state.outcome).toBe("succeeded");
    expect(mocked.revalidateStorefront).toHaveBeenCalledOnce();
  });

  it("hands back the refusal and the stock that is left", async () => {
    mocked.writeToApi.mockResolvedValue({
      addToCart: {
        availableStock: 1,
        cart: { id: "cart-1" },
        errors: [
          { code: "OUT_OF_STOCK", message: "Only one left.", field: null },
        ],
      },
    });

    const state = await addProductToCart(
      untouchedAction,
      formWith({ productId: "product-12", quantity: "2" }),
    );

    expect(state.outcome).toBe("refused");
    expect(state.errors[0].code).toBe("OUT_OF_STOCK");
    expect(state.availableStock).toBe(1);
    expect(mocked.revalidateStorefront).not.toHaveBeenCalled();
  });

  it("says the api is unavailable when the call fails", async () => {
    mocked.writeToApi.mockResolvedValue(null);

    const state = await addProductToCart(
      untouchedAction,
      formWith({ productId: "product-01" }),
    );

    expect(state.outcome).toBe("unavailable");
  });
});

describe("changing the quantity of a cart line", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends the line and the exact quantity", async () => {
    mocked.writeToApi.mockResolvedValue({
      changeCartLineQuantity: {
        availableStock: null,
        cart: { id: "cart-1" },
        errors: [],
      },
    });

    const state = await changeCartLineQuantity(
      untouchedAction,
      formWith({ lineId: "line-1", quantity: "3" }),
    );

    expect(mocked.writeToApi).toHaveBeenCalledWith(expect.anything(), {
      lineId: "line-1",
      quantity: 3,
    });
    expect(state.outcome).toBe("succeeded");
  });
});

describe("removing a cart line", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends the line id", async () => {
    mocked.writeToApi.mockResolvedValue({
      removeCartLine: { cart: { id: "cart-1" }, errors: [] },
    });

    const state = await removeCartLine(
      untouchedAction,
      formWith({ lineId: "line-1" }),
    );

    expect(mocked.writeToApi).toHaveBeenCalledWith(expect.anything(), {
      lineId: "line-1",
    });
    expect(state.outcome).toBe("succeeded");
  });
});

describe("applying a promotion code", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("trims what the visitor typed", async () => {
    mocked.writeToApi.mockResolvedValue({
      applyPromotionCode: { cart: { id: "cart-1" }, errors: [] },
    });

    await applyPromotionCode(untouchedAction, formWith({ code: "  welcome10 " }));

    expect(mocked.writeToApi).toHaveBeenCalledWith(expect.anything(), {
      code: "welcome10",
    });
  });

  it("hands back an expired code as a refusal", async () => {
    mocked.writeToApi.mockResolvedValue({
      applyPromotionCode: {
        cart: { id: "cart-1" },
        errors: [
          { code: "CODE_EXPIRED", message: "Outside its window.", field: null },
        ],
      },
    });

    const state = await applyPromotionCode(
      untouchedAction,
      formWith({ code: "SUMMER2025" }),
    );

    expect(state.outcome).toBe("refused");
    expect(state.errors[0].code).toBe("CODE_EXPIRED");
  });
});

describe("removing the promotion code", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("asks the api and invalidates the screens", async () => {
    mocked.writeToApi.mockResolvedValue({
      removePromotionCode: { cart: { id: "cart-1" }, errors: [] },
    });

    await removePromotionCode();

    expect(mocked.writeToApi).toHaveBeenCalledWith(expect.anything(), {});
    expect(mocked.revalidateStorefront).toHaveBeenCalledOnce();
  });
});
