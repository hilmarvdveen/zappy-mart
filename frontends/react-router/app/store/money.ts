import type { Money } from "~/graphql/documents";

const centsInOneUnit = 100;

export function formatMoney(money: Money): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: money.currency,
  }).format(money.amount / centsInOneUnit);
}

export function totalQuantity(
  lines: readonly { quantity: number }[],
): number {
  return lines.reduce((running, line) => running + line.quantity, 0);
}
