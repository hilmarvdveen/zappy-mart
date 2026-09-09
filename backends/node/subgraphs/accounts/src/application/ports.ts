import type { Customer } from "../domain/customer.js";
import type { RefreshToken, Session } from "../domain/session.js";
import type { WishlistEntry } from "../domain/wishlist.js";

export type StoredCustomer = Customer & {
  readonly passwordHash: string;
};

export type CustomerRepository = {
  readByEmail(email: string): Promise<StoredCustomer | null>;
  readByIdentifier(customerId: string): Promise<StoredCustomer | null>;
  write(customer: StoredCustomer): Promise<void>;
  removeEverything(): Promise<void>;
};

export type SessionRepository = {
  readByIdentifier(sessionId: string): Promise<Session | null>;
  readOpenForCustomer(customerId: string): Promise<readonly Session[]>;
  nextOrdinal(): Promise<number>;
  write(session: Session): Promise<void>;
  markRevoked(sessionId: string): Promise<void>;
  touch(sessionId: string, lastUsedAt: string): Promise<void>;
  removeEverything(): Promise<void>;
};

export type RefreshTokenRepository = {
  readByHash(tokenHash: string): Promise<RefreshToken | null>;
  write(token: RefreshToken): Promise<void>;
  markRotated(tokenId: string): Promise<void>;
  markEveryTokenRotatedForSession(sessionId: string): Promise<void>;
};

export type WishlistRepository = {
  readByOwnerKey(ownerKey: string): Promise<readonly WishlistEntry[]>;
  replaceForOwner(ownerKey: string, entries: readonly WishlistEntry[]): Promise<void>;
  removeEverything(): Promise<void>;
};

export type PasswordHasher = {
  hash(password: string): Promise<string>;
  verify(passwordHash: string, password: string): Promise<boolean>;
};

export type IssuedAccessToken = {
  readonly token: string;
  readonly expiresAt: string;
};

export type TokenIssuer = {
  issueAccessToken(customerId: string, sessionId: string): Promise<IssuedAccessToken>;
  newRefreshToken(): { readonly value: string; readonly hash: string };
  hashRefreshToken(value: string): string;
};

export type CartMerger = {
  moveAnonymousCart(visitorKey: string, customerId: string): Promise<void>;
};

export type AttemptLimiter = {
  isWithinLimit(key: string): boolean;
  recordAttempt(key: string): void;
};
