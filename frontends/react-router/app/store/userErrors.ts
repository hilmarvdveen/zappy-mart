import type { UserError } from "~/graphql/documents";

const sentences: Record<string, string> = {
  PRODUCT_NOT_FOUND: "That product is not in the catalogue any more.",
  OUT_OF_STOCK: "There is not enough stock for that quantity.",
  QUANTITY_INVALID: "A quantity has to be one or more.",
  CART_LINE_NOT_FOUND: "That line is no longer in your cart.",
  CART_EMPTY: "Your cart is empty, so there is nothing to order.",
  CODE_UNKNOWN: "That promotion code does not exist.",
  CODE_EXPIRED: "That promotion code has expired.",
  CODE_EXHAUSTED: "That promotion code has been used up.",
  CODE_MINIMUM_NOT_MET:
    "Your subtotal is below the minimum this promotion code needs.",
  EMAIL_TAKEN: "An account with that email address already exists.",
  EMAIL_INVALID: "That email address does not look like an email address.",
  PASSWORD_TOO_SHORT: "A password needs at least twelve characters.",
  PASSWORD_TOO_LONG: "A password takes at most one hundred and twenty eight characters.",
  CREDENTIALS_INVALID: "That email address and password do not match.",
  RATE_LIMITED: "Too many attempts. Please wait a moment and try again.",
  SESSION_INVALID: "Your session has ended. Please log in again.",
  SESSION_NOT_FOUND: "That session is already closed.",
  NOT_AUTHENTICATED: "Please log in to continue.",
  ORDER_NOT_FOUND: "That order does not exist.",
};

export function describeUserError(userError: UserError): string {
  return sentences[userError.code] ?? userError.message;
}

export function describeUserErrors(
  userErrors: readonly UserError[],
): string[] {
  return userErrors.map(describeUserError);
}

export function carriesCode(
  userErrors: readonly UserError[],
  code: string,
): boolean {
  return userErrors.some((userError) => userError.code === code);
}
