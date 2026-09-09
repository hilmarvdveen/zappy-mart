import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { money, zeroMoney } from "@zappy/shared";
import type { PromotionCode } from "../src/domain/promotionCode.js";
import { judgeCode, normaliseCode, ruleOf } from "../src/domain/promotionCode.js";
import { fixedAmountRule, freeShippingRule, percentageRule } from "../src/domain/promotionRule.js";
import { freeShippingThreshold, shippingCharge, shippingFor, totalFor } from "../src/domain/totals.js";

const inWindow = new Date("2026-09-09T12:00:00Z");

function code(overrides: Partial<PromotionCode> = {}): PromotionCode {
  return {
    code: "WELCOME10",
    kind: "PERCENTAGE",
    percentage: 10,
    amount: null,
    minimumSubtotal: null,
    validFrom: "2026-01-01T00:00:00Z",
    validUntil: "2027-12-31T23:59:59Z",
    usageLimit: null,
    timesUsed: 0,
    ...overrides
  };
}

describe("the shipping charge", () => {
  it("costs 495 cents on a cart below five thousand", () => {
    assert.equal(shippingFor(money(1970), false).amount, shippingCharge.amount);
    assert.equal(shippingCharge.amount, 495);
  });

  it("costs nothing from five thousand upwards", () => {
    assert.equal(shippingFor(money(freeShippingThreshold.amount), false).amount, 0);
    assert.equal(shippingFor(money(5599), false).amount, 0);
  });

  it("costs nothing when a free shipping code applies", () => {
    assert.equal(shippingFor(money(1970), true).amount, 0);
  });

  it("costs nothing on an empty cart", () => {
    assert.equal(shippingFor(zeroMoney, false).amount, 0);
  });
});

describe("the total of a cart", () => {
  it("is the subtotal plus the shipping minus the discount", () => {
    assert.equal(totalFor(money(1970), money(495), zeroMoney).amount, 2465);
    assert.equal(totalFor(money(5599), zeroMoney, money(560)).amount, 5039);
    assert.equal(totalFor(money(1970), zeroMoney, zeroMoney).amount, 1970);
  });

  it("never falls below nothing", () => {
    assert.equal(totalFor(money(500), zeroMoney, money(900)).amount, 0);
  });
});

describe("the three promotion rules", () => {
  it("takes a percentage of the subtotal and rounds half up", () => {
    assert.equal(percentageRule(10).discountFor(money(5599)).amount, 560);
    assert.equal(percentageRule(10).discountFor(money(1970)).amount, 197);
    assert.equal(percentageRule(50).discountFor(money(5)).amount, 3);
  });

  it("takes a fixed amount and never more than the subtotal", () => {
    assert.equal(fixedAmountRule(money(500)).discountFor(money(2500)).amount, 500);
    assert.equal(fixedAmountRule(money(500)).discountFor(money(300)).amount, 300);
  });

  it("takes nothing off for free shipping and makes the shipping free instead", () => {
    assert.equal(freeShippingRule.discountFor(money(1970)).amount, 0);
    assert.equal(freeShippingRule.makesShippingFree, true);
    assert.equal(percentageRule(10).makesShippingFree, false);
  });

  it("picks the rule that belongs to the kind", () => {
    assert.equal(ruleOf(code()).kind, "PERCENTAGE");
    assert.equal(ruleOf(code({ kind: "FIXED_AMOUNT", amount: money(500) })).kind, "FIXED_AMOUNT");
    assert.equal(ruleOf(code({ kind: "FREE_SHIPPING" })).kind, "FREE_SHIPPING");
  });
});

describe("judging a promotion code", () => {
  it("accepts a code inside its window with room left", () => {
    assert.equal(judgeCode(code(), money(1970), inWindow), "usable");
  });

  it("refuses a code whose window has closed", () => {
    const expired = code({ validFrom: "2025-06-01T00:00:00Z", validUntil: "2025-08-31T23:59:59Z" });
    assert.equal(judgeCode(expired, money(1970), inWindow), "CODE_EXPIRED");
  });

  it("refuses a code whose window has not opened", () => {
    const early = code({ validFrom: "2027-01-01T00:00:00Z", validUntil: "2027-12-31T23:59:59Z" });
    assert.equal(judgeCode(early, money(1970), inWindow), "CODE_EXPIRED");
  });

  it("refuses a code at its usage limit", () => {
    assert.equal(judgeCode(code({ usageLimit: 1, timesUsed: 1 }), money(1970), inWindow), "CODE_EXHAUSTED");
  });

  it("refuses a code on a cart below its minimum", () => {
    const withMinimum = code({ minimumSubtotal: money(2500) });
    assert.equal(judgeCode(withMinimum, money(795), inWindow), "CODE_MINIMUM_NOT_MET");
    assert.equal(judgeCode(withMinimum, money(2500), inWindow), "usable");
  });
});

describe("what the visitor types", () => {
  it("is compared in upper case without surrounding spaces", () => {
    assert.equal(normaliseCode("  welcome10 "), "WELCOME10");
    assert.equal(normaliseCode("FreeShip"), "FREESHIP");
  });
});
