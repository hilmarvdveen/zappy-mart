import { UserErrorCode } from './generated/contract';
import { userErrorMessage } from './user-error';

const everyCode: UserErrorCode[] = [
  'PRODUCT_NOT_FOUND',
  'OUT_OF_STOCK',
  'QUANTITY_INVALID',
  'CART_LINE_NOT_FOUND',
  'CART_EMPTY',
  'CODE_UNKNOWN',
  'CODE_EXPIRED',
  'CODE_EXHAUSTED',
  'CODE_MINIMUM_NOT_MET',
  'EMAIL_TAKEN',
  'EMAIL_INVALID',
  'PASSWORD_TOO_SHORT',
  'PASSWORD_TOO_LONG',
  'CREDENTIALS_INVALID',
  'RATE_LIMITED',
  'SESSION_INVALID',
  'SESSION_NOT_FOUND',
  'NOT_AUTHENTICATED',
  'ORDER_NOT_FOUND',
];

describe('userErrorMessage', () => {
  it.each(everyCode)('has a sentence of its own for %s', (code) => {
    expect(userErrorMessage(code).length).toBeGreaterThan(0);
  });

  it('never repeats a sentence, so a visitor can tell the refusals apart', () => {
    const sentences = everyCode.map((code) => userErrorMessage(code));

    expect(new Set(sentences).size).toBe(everyCode.length);
  });
});
