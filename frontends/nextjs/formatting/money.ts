export type MoneyValue = {
  amount: number;
  currency: string;
};

export function formatMoney(money: MoneyValue): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: money.currency,
  }).format(money.amount / 100);
}
