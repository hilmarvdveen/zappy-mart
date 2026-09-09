import { describe, expect, it } from "vitest";

import {
  decryptSession,
  emptySession,
  encryptSession,
  sessionIsSignedIn,
} from "@/server/sessionCipher";

const session = {
  accessToken: "a-json-web-token",
  accessTokenExpiresAt: "2026-09-09T12:15:00Z",
  refreshCookie: "refresh-1",
  cartCookie: "cart-1",
};

describe("the encrypted session cookie", () => {
  it("comes back as it went in", () => {
    expect(decryptSession(encryptSession(session))).toEqual(session);
  });

  it("hides the tokens in the cookie value", () => {
    const encrypted = encryptSession(session);
    expect(encrypted).not.toContain("a-json-web-token");
    expect(encrypted).not.toContain("refresh-1");
  });

  it("reads a tampered value as no session at all", () => {
    const encrypted = encryptSession(session);
    const tampered = `${encrypted.slice(0, -4)}abcd`;
    expect(decryptSession(tampered)).toEqual(emptySession);
  });

  it("reads a value of the wrong shape as no session at all", () => {
    expect(decryptSession("not-a-session")).toEqual(emptySession);
  });

  it("knows a signed in visitor by the access token", () => {
    expect(sessionIsSignedIn(session)).toBe(true);
    expect(sessionIsSignedIn(emptySession)).toBe(false);
  });
});
