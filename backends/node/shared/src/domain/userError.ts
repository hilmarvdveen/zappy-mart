export const userErrorCodes = [
  "PRODUCT_NOT_FOUND",
  "OUT_OF_STOCK",
  "QUANTITY_INVALID",
  "CART_LINE_NOT_FOUND",
  "CART_EMPTY",
  "CODE_UNKNOWN",
  "CODE_EXPIRED",
  "CODE_EXHAUSTED",
  "CODE_MINIMUM_NOT_MET",
  "EMAIL_TAKEN",
  "EMAIL_INVALID",
  "PASSWORD_TOO_SHORT",
  "PASSWORD_TOO_LONG",
  "CREDENTIALS_INVALID",
  "RATE_LIMITED",
  "SESSION_INVALID",
  "SESSION_NOT_FOUND",
  "NOT_AUTHENTICATED",
  "ORDER_NOT_FOUND"
] as const;

export type UserErrorCode = (typeof userErrorCodes)[number];

export type UserError = {
  readonly code: UserErrorCode;
  readonly message: string;
  readonly field: string | null;
};

export function userError(code: UserErrorCode, message: string, field: string | null = null): UserError {
  return { code, message, field };
}

export const notAuthenticated = userError(
  "NOT_AUTHENTICATED",
  "This operation needs a signed in customer and the request carried no valid access token."
);
