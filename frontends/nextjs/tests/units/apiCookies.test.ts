import { describe, expect, it } from "vitest";

import {
  applyApiCookieUpdate,
  buildApiCookieHeader,
  readApiCookieUpdate,
} from "@/server/apiCookies";

describe("the api cookie header the store front sends", () => {
  it("names only the cookies it holds", () => {
    expect(
      buildApiCookieHeader({ refreshCookie: "refresh-1", cartCookie: null }),
    ).toBe("zappy_refresh=refresh-1");
  });

  it("is empty when the visitor is new", () => {
    expect(
      buildApiCookieHeader({ refreshCookie: null, cartCookie: null }),
    ).toBeNull();
  });

  it("carries both cookies once they exist", () => {
    expect(
      buildApiCookieHeader({ refreshCookie: "refresh-1", cartCookie: "cart-1" }),
    ).toBe("zappy_refresh=refresh-1; zappy_cart=cart-1");
  });
});

describe("reading what the api set", () => {
  it("keeps the value of a cookie the api set", () => {
    expect(
      readApiCookieUpdate([
        "zappy_cart=cart-9; Path=/; HttpOnly; SameSite=Lax",
        "unrelated=value; Path=/",
      ]),
    ).toEqual({ cartCookie: "cart-9" });
  });

  it("reads a cleared cookie as gone", () => {
    expect(
      readApiCookieUpdate(["zappy_refresh=; Path=/; Max-Age=0"]),
    ).toEqual({ refreshCookie: null });
  });

  it("leaves a cookie the answer did not mention untouched", () => {
    const merged = applyApiCookieUpdate(
      { refreshCookie: "refresh-1", cartCookie: "cart-1" },
      { cartCookie: "cart-2" },
    );
    expect(merged).toEqual({
      refreshCookie: "refresh-1",
      cartCookie: "cart-2",
    });
  });
});
