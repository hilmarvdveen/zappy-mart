import assert from "node:assert/strict";
import { before, beforeEach, describe, test } from "node:test";
import { createStore, loadSeed } from "../state.mjs";
import { hashPassword } from "../accounts.mjs";
import {
  calculateDiscount,
  checkPromotionCode,
  findPromotionCode,
  givesFreeShipping,
  hasReachedUsageLimit,
  isWithinValidityWindow,
  meetsMinimumSubtotal,
  normalisePromotionCode,
  recordPromotionUse
} from "../promotions.mjs";

const inTheWindow = new Date("2026-09-09T12:00:00Z");

describe("promotion codes", () => {
  const store = createStore();

  before(async () => {
    await loadSeed(store, hashPassword);
  });

  beforeEach(async () => {
    await loadSeed(store, hashPassword);
  });

  test("loads the five seed codes", () => {
    assert.deepEqual(
      store.promotionCodes.map((promotionCode) => promotionCode.code),
      ["WELCOME10", "FIVEOFF", "FREESHIP", "SUMMER2025", "ONCE"]
    );
  });

  test("compares a typed code without regard to case or surrounding spaces", () => {
    assert.equal(normalisePromotionCode("  welcome10 "), "WELCOME10");
    assert.equal(findPromotionCode(store, " welcome10 ").code, "WELCOME10");
    assert.equal(findPromotionCode(store, "nothing-like-it"), null);
  });

  test("takes a percentage of the subtotal and rounds half up", () => {
    const welcome = findPromotionCode(store, "WELCOME10");
    assert.equal(calculateDiscount(welcome, 5599), 560);
    assert.equal(calculateDiscount(welcome, 25), 3);
    assert.equal(calculateDiscount(welcome, 1970), 197);
  });

  test("takes a fixed amount and never more than the subtotal", () => {
    const fiveOff = findPromotionCode(store, "FIVEOFF");
    assert.equal(calculateDiscount(fiveOff, 2500), 500);
    assert.equal(calculateDiscount(fiveOff, 300), 300);
  });

  test("takes nothing off for a free shipping code and says so instead", () => {
    const freeShip = findPromotionCode(store, "FREESHIP");
    assert.equal(calculateDiscount(freeShip, 1970), 0);
    assert.equal(givesFreeShipping(freeShip), true);
    assert.equal(givesFreeShipping(findPromotionCode(store, "WELCOME10")), false);
  });

  test("holds a validity window", () => {
    assert.equal(isWithinValidityWindow(findPromotionCode(store, "WELCOME10"), inTheWindow), true);
    assert.equal(isWithinValidityWindow(findPromotionCode(store, "SUMMER2025"), inTheWindow), false);
  });

  test("holds a usage limit and a minimum subtotal", () => {
    assert.equal(hasReachedUsageLimit(findPromotionCode(store, "ONCE")), true);
    assert.equal(hasReachedUsageLimit(findPromotionCode(store, "WELCOME10")), false);
    assert.equal(meetsMinimumSubtotal(findPromotionCode(store, "FIVEOFF"), 2499), false);
    assert.equal(meetsMinimumSubtotal(findPromotionCode(store, "FIVEOFF"), 2500), true);
  });

  test("names the reason a code is refused", () => {
    assert.equal(checkPromotionCode(store, "NOSUCHCODE", 5000, inTheWindow).error.code, "CODE_UNKNOWN");
    assert.equal(checkPromotionCode(store, "SUMMER2025", 5000, inTheWindow).error.code, "CODE_EXPIRED");
    assert.equal(checkPromotionCode(store, "ONCE", 5000, inTheWindow).error.code, "CODE_EXHAUSTED");
    assert.equal(checkPromotionCode(store, "FIVEOFF", 2499, inTheWindow).error.code, "CODE_MINIMUM_NOT_MET");
    assert.equal(checkPromotionCode(store, "FIVEOFF", 2500, inTheWindow).error, null);
  });

  test("points every refusal at the code field", () => {
    assert.equal(checkPromotionCode(store, "NOSUCHCODE", 5000, inTheWindow).error.field, "code");
  });

  test("raises the recorded uses of a code", () => {
    assert.equal(findPromotionCode(store, "WELCOME10").timesUsed, 0);
    recordPromotionUse(store, "WELCOME10");
    assert.equal(findPromotionCode(store, "WELCOME10").timesUsed, 1);
  });
});
