import type { UserErrorView } from "@/server/actionState";

const sentenceByCode: Record<string, string> = {
  API_UNAVAILABLE: "The Zappy Mart API could not be reached. Try again shortly.",
  PRODUCT_NOT_FOUND: "That product is no longer in the catalogue.",
  OUT_OF_STOCK: "There is not enough stock for that quantity.",
  QUANTITY_INVALID: "A quantity has to be one or more.",
  CART_LINE_NOT_FOUND: "That line is no longer in your cart.",
  CART_EMPTY: "Your cart is empty, so there is nothing to order.",
  CODE_UNKNOWN: "That promotion code does not exist.",
  CODE_EXPIRED: "That promotion code is outside its validity window.",
  CODE_EXHAUSTED: "That promotion code has reached its usage limit.",
  CODE_MINIMUM_NOT_MET:
    "Your cart is below the minimum this promotion code asks for.",
  EMAIL_TAKEN: "An account with that email address already exists.",
  EMAIL_INVALID: "That is not a valid email address.",
  PASSWORD_TOO_SHORT: "A password needs at least twelve characters.",
  PASSWORD_TOO_LONG: "A password takes at most one hundred and twenty eight characters.",
  CREDENTIALS_INVALID: "That email address and password do not match an account.",
  RATE_LIMITED: "Too many attempts. Wait a moment and try again.",
  SESSION_INVALID: "Your session has ended. Sign in again.",
  SESSION_NOT_FOUND: "That session has already ended.",
  NOT_AUTHENTICATED: "Sign in to continue.",
  ORDER_NOT_FOUND: "That order does not belong to this account.",
};

export function describeUserError(
  error: UserErrorView,
  availableStock: number | null = null,
): string {
  const sentence = sentenceByCode[error.code] ?? error.message;
  if (error.code === "OUT_OF_STOCK" && availableStock !== null) {
    return `${sentence} ${availableStock} left in stock.`;
  }
  return sentence;
}
