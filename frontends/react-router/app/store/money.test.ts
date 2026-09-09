import { expect, test } from "vitest";
import { formatMoney, totalQuantity } from "./money";

test("an amount in cents reads as an amount in euro", () => {
  expect(formatMoney({ amount: 5599, currency: "EUR" })).toBe("€55.99");
});

test("a whole euro amount keeps its two decimals", () => {
  expect(formatMoney({ amount: 500, currency: "EUR" })).toBe("€5.00");
});

test("nothing costs nothing", () => {
  expect(formatMoney({ amount: 0, currency: "EUR" })).toBe("€0.00");
});

test("the cart count is the sum of the quantities, not the number of lines", () => {
  expect(totalQuantity([{ quantity: 2 }, { quantity: 3 }])).toBe(5);
  expect(totalQuantity([])).toBe(0);
});
