export const storeCurrency = "EUR";

export type Money = {
  readonly amount: number;
  readonly currency: string;
};

export function money(amount: number): Money {
  if (!Number.isInteger(amount)) {
    throw new Error(`An amount of money is a whole number of cents, received ${amount}`);
  }
  if (amount < 0) {
    throw new Error(`An amount of money is never negative, received ${amount}`);
  }
  return { amount, currency: storeCurrency };
}

export const zeroMoney: Money = money(0);

export function addMoney(left: Money, right: Money): Money {
  requireSameCurrency(left, right);
  return { amount: left.amount + right.amount, currency: left.currency };
}

export function subtractMoney(left: Money, right: Money): Money {
  requireSameCurrency(left, right);
  return money(Math.max(0, left.amount - right.amount));
}

export function multiplyMoney(value: Money, factor: number): Money {
  if (!Number.isInteger(factor) || factor < 0) {
    throw new Error(`A quantity is a whole number of zero or more, received ${factor}`);
  }
  return { amount: value.amount * factor, currency: value.currency };
}

export function percentageOfMoney(value: Money, percentage: number): Money {
  const exact = (value.amount * percentage) / 100;
  return { amount: roundHalfUp(exact), currency: value.currency };
}

export function roundHalfUp(value: number): number {
  return Math.floor(value + 0.5);
}

export function isAtLeast(value: Money, minimum: Money): boolean {
  requireSameCurrency(value, minimum);
  return value.amount >= minimum.amount;
}

function requireSameCurrency(left: Money, right: Money): void {
  if (left.currency !== right.currency) {
    throw new Error(`This store sells in one currency, received ${left.currency} and ${right.currency}`);
  }
}
