import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  addMoney,
  decodeCursor,
  encodeCursor,
  fromContractDateTime,
  isAtLeast,
  limitPageSize,
  maximumPageSize,
  money,
  multiplyMoney,
  pageOf,
  percentageOfMoney,
  readCookie,
  roundHalfUp,
  subtractMoney,
  toContractDateTime,
  writeCookie,
  clearCookie,
  judgeOrigin,
  bearerTokenOf,
  toPositionalPlaceholders,
  zeroMoney
} from "../src/index.js";

describe("money", () => {
  it("is a whole number of cents that is never negative", () => {
    assert.equal(money(495).amount, 495);
    assert.throws(() => money(4.5));
    assert.throws(() => money(-1));
  });

  it("adds, multiplies and subtracts without falling below nothing", () => {
    assert.equal(addMoney(money(1970), money(495)).amount, 2465);
    assert.equal(multiplyMoney(money(985), 2).amount, 1970);
    assert.equal(subtractMoney(money(500), money(900)).amount, 0);
  });

  it("rounds a percentage half up to whole cents", () => {
    assert.equal(percentageOfMoney(money(5599), 10).amount, 560);
    assert.equal(percentageOfMoney(money(1970), 10).amount, 197);
    assert.equal(roundHalfUp(0.5), 1);
    assert.equal(roundHalfUp(1.4), 1);
  });

  it("compares against a minimum", () => {
    assert.equal(isAtLeast(money(2500), money(2500)), true);
    assert.equal(isAtLeast(money(2499), money(2500)), false);
  });

  it("starts at nothing", () => {
    assert.equal(zeroMoney.amount, 0);
    assert.equal(zeroMoney.currency, "EUR");
  });
});

describe("a moment in time", () => {
  it("is written in UTC with second precision", () => {
    assert.equal(toContractDateTime(new Date("2026-09-09T14:30:00.123Z")), "2026-09-09T14:30:00Z");
  });

  it("is read back from that shape and refuses anything else", () => {
    assert.equal(fromContractDateTime("2026-09-09T14:30:00Z").getUTCHours(), 14);
    assert.throws(() => fromContractDateTime("not a moment"));
  });
});

describe("paging a list", () => {
  const items = ["one", "two", "three", "four"];

  it("takes the first page and says another follows", () => {
    const page = pageOf(items, (item) => item, 2, null);
    assert.deepEqual(page.edges.map((edge) => edge.node), ["one", "two"]);
    assert.equal(page.pageInfo.hasNextPage, true);
    assert.equal(page.totalCount, 4);
  });

  it("continues after a cursor and says when the list is done", () => {
    const first = pageOf(items, (item) => item, 2, null);
    const second = pageOf(items, (item) => item, 2, first.pageInfo.endCursor);
    assert.deepEqual(second.edges.map((edge) => edge.node), ["three", "four"]);
    assert.equal(second.pageInfo.hasNextPage, false);
  });

  it("answers an empty page for a cursor that is not in the list", () => {
    const page = pageOf(items, (item) => item, 2, encodeCursor("nothing"));
    assert.deepEqual(page.edges, []);
    assert.equal(page.pageInfo.endCursor, null);
  });

  it("never answers more than one hundred", () => {
    assert.equal(limitPageSize(500, 24), maximumPageSize);
    assert.equal(limitPageSize(null, 24), 24);
    assert.equal(limitPageSize(-1, 24), 0);
  });

  it("hides the key inside an opaque cursor", () => {
    assert.equal(decodeCursor(encodeCursor("product-01")), "product-01");
    assert.notEqual(encodeCursor("product-01"), "product-01");
  });
});

describe("cookies", () => {
  it("reads one cookie out of a header with several", () => {
    assert.equal(readCookie("a=one; zappy_cart=abc; b=two", "zappy_cart"), "abc");
    assert.equal(readCookie("a=one", "zappy_cart"), null);
    assert.equal(readCookie(null, "zappy_cart"), null);
  });

  it("writes a cookie no script can read", () => {
    const written = writeCookie("zappy_refresh", "value", {
      path: "/graphql",
      maximumAgeInSeconds: 60,
      secure: true
    });
    assert.match(written, /^zappy_refresh=value/);
    assert.match(written, /HttpOnly/);
    assert.match(written, /SameSite=Lax/);
    assert.match(written, /Secure/);
    assert.match(written, /Path=\/graphql/);
  });

  it("clears a cookie by giving it no life", () => {
    assert.match(clearCookie("zappy_refresh", "/graphql"), /Max-Age=0/);
  });
});

describe("the origin of a mutation", () => {
  it("allows the three frontend origins and the internal caller", () => {
    assert.equal(judgeOrigin("http://localhost:5173"), "allowed");
    assert.equal(judgeOrigin("http://localhost:3001"), "allowed");
    assert.equal(judgeOrigin("http://localhost:4200"), "allowed");
    assert.equal(judgeOrigin("internal"), "allowed");
  });

  it("refuses a missing origin and a foreign one", () => {
    assert.equal(judgeOrigin(null), "refused");
    assert.equal(judgeOrigin(""), "refused");
    assert.equal(judgeOrigin("https://evil.example.com"), "refused");
  });
});

describe("the bearer header", () => {
  it("takes the token out of a well formed header", () => {
    assert.equal(bearerTokenOf("Bearer abc"), "abc");
    assert.equal(bearerTokenOf("bearer abc"), "abc");
  });

  it("answers nothing for anything else", () => {
    assert.equal(bearerTokenOf(null), null);
    assert.equal(bearerTokenOf("abc"), null);
    assert.equal(bearerTokenOf("Basic abc"), null);
    assert.equal(bearerTokenOf("Bearer "), null);
  });
});

describe("the PostgreSQL profile", () => {
  it("turns the question marks of the SQLite statements into numbered placeholders", () => {
    assert.equal(
      toPositionalPlaceholders("insert into product (id, name) values (?, ?)"),
      "insert into product (id, name) values ($1, $2)"
    );
  });
});
