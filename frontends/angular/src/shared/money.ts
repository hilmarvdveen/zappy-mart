import type { ProductSummaryFragment } from '../app/api/generated/contract';

export type Money = ProductSummaryFragment['price'];

const centsInOneUnit = 100;

export function formatMoney(money: Money): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: money.currency,
  }).format(money.amount / centsInOneUnit);
}
