import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { emailAddress, isEmailAddress } from "@zappy/shared";
import { judgePassword, maximumPasswordLength, minimumPasswordLength } from "../src/domain/customer.js";
import type { RefreshToken, Session } from "../src/domain/session.js";
import {
  deviceDescriptionFrom,
  isSessionLive,
  judgeRefreshToken,
  newestSessionFirst
} from "../src/domain/session.js";
import type { WishlistEntry } from "../src/domain/wishlist.js";
import {
  customerOwnerKey,
  mergedByAdding,
  newestFirst,
  visitorOwnerKey,
  withProductAdded,
  withProductRemoved
} from "../src/domain/wishlist.js";
import { inMemoryAttemptLimiter, attemptsAllowedPerWindow } from "../src/application/attemptLimiter.js";

const moment = new Date("2026-09-09T12:00:00Z");

function session(overrides: Partial<Session> = {}): Session {
  return {
    id: "session-01",
    ordinal: 1,
    customerId: "customer-01",
    device: "Chrome on Windows",
    createdAt: "2026-09-09T11:00:00Z",
    lastUsedAt: "2026-09-09T11:00:00Z",
    expiresAt: "2026-10-09T11:00:00Z",
    revoked: false,
    ...overrides
  };
}

function refreshToken(overrides: Partial<RefreshToken> = {}): RefreshToken {
  return {
    id: "refresh-01",
    sessionId: "session-01",
    tokenHash: "a-hash",
    createdAt: "2026-09-09T11:00:00Z",
    expiresAt: "2026-10-09T11:00:00Z",
    rotated: false,
    ...overrides
  };
}

function entry(productId: string, addedAt: string): WishlistEntry {
  return { ownerKey: customerOwnerKey("customer-01"), productId, addedAt };
}

describe("an email address", () => {
  it("is normalised to lower case without surrounding spaces", () => {
    assert.equal(emailAddress("  Jane.Doe@Example.COM "), "jane.doe@example.com");
  });

  it("needs a name, an at sign and a domain", () => {
    assert.equal(isEmailAddress("jane@example.com"), true);
    assert.equal(isEmailAddress("jane.example.com"), false);
    assert.equal(isEmailAddress("jane@localhost"), false);
    assert.equal(isEmailAddress(""), false);
  });
});

describe("a password", () => {
  it("is at least twelve characters", () => {
    assert.equal(judgePassword("a".repeat(minimumPasswordLength)), "acceptable");
    assert.equal(judgePassword("a".repeat(minimumPasswordLength - 1)), "PASSWORD_TOO_SHORT");
  });

  it("is at most one hundred and twenty eight characters", () => {
    assert.equal(judgePassword("a".repeat(maximumPasswordLength)), "acceptable");
    assert.equal(judgePassword("a".repeat(maximumPasswordLength + 1)), "PASSWORD_TOO_LONG");
  });
});

describe("a session and its refresh token", () => {
  it("is live while it is neither revoked nor expired", () => {
    assert.equal(isSessionLive(session(), moment), true);
    assert.equal(isSessionLive(session({ revoked: true }), moment), false);
    assert.equal(isSessionLive(session({ expiresAt: "2026-09-09T11:59:00Z" }), moment), false);
    assert.equal(isSessionLive(null, moment), false);
  });

  it("accepts a token that has not been used yet", () => {
    assert.equal(judgeRefreshToken(refreshToken(), session(), moment), "usable");
  });

  it("calls a token that was already rotated a replay", () => {
    assert.equal(judgeRefreshToken(refreshToken({ rotated: true }), session(), moment), "replayed");
  });

  it("refuses a token nobody knows and a token whose session is revoked", () => {
    assert.equal(judgeRefreshToken(null, null, moment), "unknown");
    assert.equal(judgeRefreshToken(refreshToken(), session({ revoked: true }), moment), "unknown");
  });

  it("refuses a token whose life is over", () => {
    const expired = refreshToken({ expiresAt: "2026-09-09T11:00:00Z" });
    assert.equal(judgeRefreshToken(expired, session(), moment), "expired");
  });

  it("names the device from what the client sends, the user agent, or neither", () => {
    assert.equal(deviceDescriptionFrom("Chrome on Windows", "Mozilla"), "Chrome on Windows");
    assert.equal(deviceDescriptionFrom(null, "Mozilla"), "Mozilla");
    assert.equal(deviceDescriptionFrom("  ", "  "), "Unknown device");
  });
});

describe("listing the sessions of a customer", () => {
  it("puts the newest first when the moments differ", () => {
    const older = session({ id: "session-01", ordinal: 1, createdAt: "2026-09-09T10:00:00.000Z" });
    const newer = session({ id: "session-02", ordinal: 2, createdAt: "2026-09-09T11:00:00.000Z" });
    assert.deepEqual(
      newestSessionFirst([older, newer]).map((open) => open.id),
      ["session-02", "session-01"]
    );
  });

  it("puts the newest first when two sessions were opened at the same clock reading", () => {
    const sameMoment = "2026-09-09T10:00:00.000Z";
    const laptop = session({ id: "session-laptop", ordinal: 1, createdAt: sameMoment });
    const phone = session({ id: "session-phone", ordinal: 2, createdAt: sameMoment });
    assert.deepEqual(
      newestSessionFirst([laptop, phone]).map((open) => open.id),
      ["session-phone", "session-laptop"]
    );
    assert.deepEqual(
      newestSessionFirst([phone, laptop]).map((open) => open.id),
      ["session-phone", "session-laptop"]
    );
  });
});

describe("a wishlist", () => {
  it("belongs to a customer or to the visitor key in the cookie", () => {
    assert.equal(customerOwnerKey("customer-01"), "customer:customer-01");
    assert.equal(visitorOwnerKey("abc"), "visitor:abc");
  });

  it("adds a product once and leaves the list alone the second time", () => {
    const first = withProductAdded([], "owner", "product-05", "2026-09-09T12:00:00Z");
    const second = withProductAdded(first, "owner", "product-05", "2026-09-09T12:01:00Z");
    assert.equal(second.length, 1);
    assert.equal(second[0]?.addedAt, "2026-09-09T12:00:00Z");
  });

  it("removes a product and leaves the list alone when it is not there", () => {
    const list = withProductAdded([], "owner", "product-05", "2026-09-09T12:00:00Z");
    assert.deepEqual(withProductRemoved(list, "product-05"), []);
    assert.equal(withProductRemoved(list, "product-06").length, 1);
  });

  it("shows the newest first", () => {
    const ordered = newestFirst([
      entry("product-01", "2026-09-09T10:00:00Z"),
      entry("product-02", "2026-09-09T12:00:00Z")
    ]);
    assert.deepEqual(ordered.map((saved) => saved.productId), ["product-02", "product-01"]);
  });

  it("merges the anonymous list by adding and never by replacing", () => {
    const owned = [entry("product-01", "2026-09-09T10:00:00Z")];
    const anonymous = [
      { ownerKey: "visitor:abc", productId: "product-01", addedAt: "2026-09-09T11:00:00Z" },
      { ownerKey: "visitor:abc", productId: "product-05", addedAt: "2026-09-09T11:00:00Z" }
    ];
    const merged = mergedByAdding(owned, anonymous, customerOwnerKey("customer-01"));
    assert.deepEqual(merged.map((saved) => saved.productId), ["product-01", "product-05"]);
    assert.equal(merged[0]?.addedAt, "2026-09-09T10:00:00Z");
    assert.equal(merged[1]?.ownerKey, "customer:customer-01");
  });
});

describe("the attempt limiter", () => {
  it("allows attempts up to the limit and refuses the one after it", () => {
    let now = 0;
    const limiter = inMemoryAttemptLimiter(() => now);
    for (let attempt = 0; attempt < attemptsAllowedPerWindow; attempt = attempt + 1) {
      assert.equal(limiter.isWithinLimit("caller"), true);
      limiter.recordAttempt("caller");
    }
    assert.equal(limiter.isWithinLimit("caller"), false);
  });

  it("forgets attempts once the window has passed", () => {
    let now = 0;
    const limiter = inMemoryAttemptLimiter(() => now);
    for (let attempt = 0; attempt < attemptsAllowedPerWindow; attempt = attempt + 1) {
      limiter.recordAttempt("caller");
    }
    assert.equal(limiter.isWithinLimit("caller"), false);
    now = 61_000;
    assert.equal(limiter.isWithinLimit("caller"), true);
  });

  it("counts each caller on its own", () => {
    let now = 0;
    const limiter = inMemoryAttemptLimiter(() => now);
    for (let attempt = 0; attempt < attemptsAllowedPerWindow; attempt = attempt + 1) {
      limiter.recordAttempt("one");
    }
    assert.equal(limiter.isWithinLimit("one"), false);
    assert.equal(limiter.isWithinLimit("two"), true);
  });
});
