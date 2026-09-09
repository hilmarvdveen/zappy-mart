import type { EmailAddress } from "@zappy/shared";

export const minimumPasswordLength = 12;

export const maximumPasswordLength = 128;

export type Customer = {
  readonly id: string;
  readonly email: EmailAddress;
  readonly name: string;
  readonly createdAt: string;
};

export type PasswordVerdict = "acceptable" | "PASSWORD_TOO_SHORT" | "PASSWORD_TOO_LONG";

export function judgePassword(password: string): PasswordVerdict {
  if (password.length < minimumPasswordLength) {
    return "PASSWORD_TOO_SHORT";
  }
  return password.length > maximumPasswordLength ? "PASSWORD_TOO_LONG" : "acceptable";
}
