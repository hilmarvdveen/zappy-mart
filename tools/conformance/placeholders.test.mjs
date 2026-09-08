import assert from "node:assert/strict";
import { test } from "node:test";
import {
  capturedValuesFrom,
  findDifferences,
  isPlaceholder,
  matchesPlaceholder,
  placeholderNames,
  resolveVariables,
} from "./placeholders.mjs";

test("the runner knows four placeholders", () => {
  assert.deepEqual(placeholderNames, [
    "@id",
    "@dateTime",
    "@token",
    "@cursor",
  ]);
  assert.equal(isPlaceholder("@id"), true);
  assert.equal(isPlaceholder("@quantity"), false);
  assert.equal(isPlaceholder(20), false);
});

test("@id matches any string the backend made and nothing else", () => {
  assert.equal(matchesPlaceholder("@id", "order-8f2c"), true);
  assert.equal(matchesPlaceholder("@id", ""), false);
  assert.equal(matchesPlaceholder("@id", null), false);
  assert.equal(matchesPlaceholder("@id", 12), false);
});

test("@dateTime matches an ISO moment in UTC with second precision", () => {
  assert.equal(matchesPlaceholder("@dateTime", "2026-09-09T14:30:00Z"), true);
  assert.equal(
    matchesPlaceholder("@dateTime", "2026-09-09T14:30:00.123Z"),
    false,
  );
  assert.equal(matchesPlaceholder("@dateTime", "2026-09-09T14:30:00+02:00"), false);
  assert.equal(matchesPlaceholder("@dateTime", "2026-13-40T14:30:00Z"), false);
  assert.equal(matchesPlaceholder("@dateTime", "yesterday"), false);
});

test("@token matches a JSON Web Token of three parts", () => {
  assert.equal(matchesPlaceholder("@token", "header.payload.signature"), true);
  assert.equal(matchesPlaceholder("@token", "header.payload"), false);
  assert.equal(matchesPlaceholder("@token", "header..signature"), false);
  assert.equal(matchesPlaceholder("@token", "an opaque token"), false);
});

test("@cursor matches any non empty cursor", () => {
  assert.equal(matchesPlaceholder("@cursor", "cHJvZHVjdC0wNQ=="), true);
  assert.equal(matchesPlaceholder("@cursor", ""), false);
});

test("an unknown placeholder is a mistake in the expected file", () => {
  assert.throws(
    () => matchesPlaceholder("@price", "495"),
    /@price is not a placeholder/,
  );
});

test("an answer that matches the expected file has no differences", () => {
  const expected = {
    data: {
      cart: {
        id: "@id",
        updatedAt: "@dateTime",
        total: { amount: 2880, currency: "EUR" },
        lines: [{ quantity: 3 }],
      },
    },
    errors: [],
  };
  const actual = {
    data: {
      cart: {
        id: "cart-1",
        updatedAt: "2026-09-09T14:30:00Z",
        total: { amount: 2880, currency: "EUR" },
        lines: [{ quantity: 3 }],
      },
    },
    errors: [],
  };
  assert.deepEqual(findDifferences(expected, actual), []);
});

test("a wrong total is one difference with the path, the amount and the answer", () => {
  const differences = findDifferences(
    { total: { amount: 2880 } },
    { total: { amount: 2885 } },
  );
  assert.deepEqual(differences, [
    {
      path: "answer.total.amount",
      expected: 2880,
      actual: 2885,
      reason: "a different value",
    },
  ]);
});

test("a value that does not match its placeholder is a difference", () => {
  const differences = findDifferences(
    { placedAt: "@dateTime" },
    { placedAt: "2026-09-09 14:30" },
  );
  assert.equal(differences.length, 1);
  assert.equal(differences[0].path, "answer.placedAt");
  assert.equal(differences[0].reason, "no value matching @dateTime");
});

test("a missing field is a difference", () => {
  const differences = findDifferences(
    { subtotal: 2385, shipping: 495 },
    { subtotal: 2385 },
  );
  assert.deepEqual(differences, [
    {
      path: "answer.shipping",
      expected: 495,
      actual: undefined,
      reason: "missing field",
    },
  ]);
});

test("an extra field is a difference", () => {
  const differences = findDifferences(
    { subtotal: 2385 },
    { subtotal: 2385, tax: 0 },
  );
  assert.deepEqual(differences, [
    {
      path: "answer.tax",
      expected: undefined,
      actual: 0,
      reason: "unexpected field",
    },
  ]);
});

test("a list of another length is one difference and not many", () => {
  const differences = findDifferences(
    { lines: [{ quantity: 3 }] },
    { lines: [{ quantity: 3 }, { quantity: 1 }] },
  );
  assert.deepEqual(differences, [
    {
      path: "answer.lines",
      expected: 1,
      actual: 2,
      reason: "a different number of entries",
    },
  ]);
});

test("a null where an object is expected is a difference", () => {
  const differences = findDifferences({ cart: { id: "@id" } }, { cart: null });
  assert.equal(differences.length, 1);
  assert.equal(differences[0].reason, "expected an object");
});

test("the runner keeps the access token, both sessions and the order", () => {
  const afterLogin = capturedValuesFrom({
    login: {
      accessToken: "header.payload.signature",
      customer: {
        id: "customer-01",
        sessions: [
          { id: "session-phone", device: "phone", current: true },
          { id: "session-laptop", device: "laptop", current: false },
        ],
      },
    },
  });
  assert.equal(afterLogin.accessToken, "header.payload.signature");
  assert.equal(afterLogin.sessionId, "session-phone");
  assert.equal(afterLogin.otherSessionId, "session-laptop");
  assert.equal(afterLogin.orderId, undefined);

  const afterOrder = capturedValuesFrom(
    { placeOrder: { order: { id: "order-1", number: "ZM-1001" } } },
    afterLogin,
  );
  assert.equal(afterOrder.orderId, "order-1");
  assert.equal(afterOrder.sessionId, "session-phone");
});

test("a login on one device leaves no other session to revoke", () => {
  const afterFirstLogin = capturedValuesFrom({
    login: {
      customer: {
        sessions: [{ id: "session-laptop", device: "laptop", current: true }],
      },
    },
  });
  assert.equal(afterFirstLogin.sessionId, "session-laptop");
  assert.equal(afterFirstLogin.otherSessionId, undefined);
});

test("a page of orders does not replace the order the run placed", () => {
  const afterList = capturedValuesFrom(
    {
      orders: {
        edges: [{ node: { id: "order-2", number: "ZM-1002" } }],
      },
    },
    { orderId: "order-1" },
  );
  assert.equal(afterList.orderId, "order-1");
});

test("an answer without those values leaves the earlier ones alone", () => {
  const kept = capturedValuesFrom(
    { logout: { success: true } },
    { accessToken: "header.payload.signature", sessionId: "session-new" },
  );
  assert.deepEqual(kept, {
    accessToken: "header.payload.signature",
    sessionId: "session-new",
  });
});

test("a variables file reads a value an earlier scenario answered with", () => {
  const variables = resolveVariables(
    { id: "$orderId", filter: { first: 10, names: ["$sessionId"] } },
    { orderId: "order-1", sessionId: "session-new" },
  );
  assert.deepEqual(variables, {
    id: "order-1",
    filter: { first: 10, names: ["session-new"] },
  });
});

test("a reference no scenario answered with stops the run", () => {
  assert.throws(
    () => resolveVariables({ id: "$orderId" }, {}),
    /No scenario before this one answered with a value for \$orderId/,
  );
});
