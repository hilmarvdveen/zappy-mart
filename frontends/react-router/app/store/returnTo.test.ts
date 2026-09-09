import { expect, test } from "vitest";
import { safeReturnTo } from "./returnTo";

test("an address inside this store is kept", () => {
  expect(safeReturnTo("/checkout", "/account")).toBe("/checkout");
});

test("an address on another host falls back", () => {
  expect(safeReturnTo("https://elsewhere.example/steal", "/account")).toBe(
    "/account",
  );
});

test("a protocol relative address falls back", () => {
  expect(safeReturnTo("//elsewhere.example", "/account")).toBe("/account");
});

test("no address at all falls back", () => {
  expect(safeReturnTo(null, "/account")).toBe("/account");
  expect(safeReturnTo("", "/account")).toBe("/account");
});
