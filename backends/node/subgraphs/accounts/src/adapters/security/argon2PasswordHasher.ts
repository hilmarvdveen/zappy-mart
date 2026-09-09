import argon2 from "argon2";
import type { PasswordHasher } from "../../application/ports.js";

export const argon2idParameters = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1
} as const;

export function argon2PasswordHasher(): PasswordHasher {
  return {
    async hash(password: string): Promise<string> {
      return argon2.hash(password, argon2idParameters);
    },

    async verify(passwordHash: string, password: string): Promise<boolean> {
      try {
        return await argon2.verify(passwordHash, password);
      } catch {
        return false;
      }
    }
  };
}
