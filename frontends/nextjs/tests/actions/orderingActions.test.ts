import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  writeToApi: vi.fn(),
  revalidateStorefront: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/server/storefrontClient", () => ({
  writeToApi: mocked.writeToApi,
  readFromApi: vi.fn(),
}));

vi.mock("@/server/revalidation", () => ({
  revalidateStorefront: mocked.revalidateStorefront,
}));

vi.mock("next/navigation", () => ({
  redirect: mocked.redirect,
}));

import { placeOrder } from "@/server/actions/orderingActions";
import { untouchedAction } from "@/server/actionState";

function formWith(fields: Record<string, string>): FormData {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    form.set(name, value);
  }
  return form;
}

describe("placing an order", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends the idempotency key and goes to the confirmation screen", async () => {
    mocked.writeToApi.mockResolvedValue({
      placeOrder: {
        order: { id: "order-1", number: "ZM-1001" },
        errors: [],
      },
    });

    await placeOrder(untouchedAction, formWith({ idempotencyKey: "attempt-1" }));

    expect(mocked.writeToApi).toHaveBeenCalledWith(expect.anything(), {
      idempotencyKey: "attempt-1",
    });
    expect(mocked.revalidateStorefront).toHaveBeenCalledOnce();
    expect(mocked.redirect).toHaveBeenCalledWith("/orders/order-1");
  });

  it("hands back an empty cart as a refusal and stays on the checkout", async () => {
    mocked.writeToApi.mockResolvedValue({
      placeOrder: {
        order: null,
        errors: [
          { code: "CART_EMPTY", message: "Nothing to order.", field: null },
        ],
      },
    });

    const state = await placeOrder(
      untouchedAction,
      formWith({ idempotencyKey: "attempt-2" }),
    );

    expect(state.outcome).toBe("refused");
    expect(state.errors[0].code).toBe("CART_EMPTY");
    expect(mocked.redirect).not.toHaveBeenCalled();
  });
});
