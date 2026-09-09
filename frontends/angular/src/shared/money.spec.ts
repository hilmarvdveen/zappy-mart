import { formatMoney } from './money';

describe('formatMoney', () => {
  it.each([
    [{ amount: 10995, currency: 'EUR' }, '€109.95'],
    [{ amount: 495, currency: 'EUR' }, '€4.95'],
    [{ amount: 0, currency: 'EUR' }, '€0.00'],
    [{ amount: 69500, currency: 'EUR' }, '€695.00'],
  ])('renders %o as %s', (money, expected) => {
    expect(formatMoney(money)).toBe(expected);
  });
});
