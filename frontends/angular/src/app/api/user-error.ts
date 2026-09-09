import { AuthenticationFragment, UserErrorCode } from './generated/contract';

export type UserError = AuthenticationFragment['errors'][number];

const messageByCode: Record<UserErrorCode, string> = {
  PRODUCT_NOT_FOUND: 'That product is no longer in the catalogue.',
  OUT_OF_STOCK: 'There is not enough stock for that quantity.',
  QUANTITY_INVALID: 'Choose a quantity of one or more.',
  CART_LINE_NOT_FOUND: 'That line is no longer in your cart.',
  CART_EMPTY: 'Your cart is empty, so there is nothing to order.',
  CODE_UNKNOWN: 'We do not know that promotion code.',
  CODE_EXPIRED: 'That promotion code is outside its validity window.',
  CODE_EXHAUSTED: 'That promotion code has reached its usage limit.',
  CODE_MINIMUM_NOT_MET: 'Your subtotal is below the minimum this promotion code asks for.',
  EMAIL_TAKEN: 'That email address is already registered.',
  EMAIL_INVALID: 'That is not a valid email address.',
  PASSWORD_TOO_SHORT: 'Choose a password of at least twelve characters.',
  PASSWORD_TOO_LONG: 'Choose a password of at most one hundred and twenty eight characters.',
  CREDENTIALS_INVALID: 'That email address and password do not match a customer.',
  RATE_LIMITED: 'Too many attempts in a short time. Please wait and try again.',
  SESSION_INVALID: 'Your session has ended. Please log in again.',
  SESSION_NOT_FOUND: 'That session has already ended.',
  NOT_AUTHENTICATED: 'Please log in to continue.',
  ORDER_NOT_FOUND: 'We cannot find that order.',
};

export function userErrorMessage(code: UserErrorCode): string {
  return messageByCode[code];
}
