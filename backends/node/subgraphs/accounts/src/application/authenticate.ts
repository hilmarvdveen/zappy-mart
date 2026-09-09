import type { UserError } from "@zappy/shared";
import {
  emailAddress,
  isEmailAddress,
  newIdentifier,
  refreshTokenLifetimeInDays,
  toStoredDateTime,
  userError
} from "@zappy/shared";
import type { Customer } from "../domain/customer.js";
import { judgePassword } from "../domain/customer.js";
import type { Session } from "../domain/session.js";
import { deviceDescriptionFrom, judgeRefreshToken } from "../domain/session.js";
import { customerOwnerKey, mergedByAdding, visitorOwnerKey } from "../domain/wishlist.js";
import type {
  AttemptLimiter,
  CartMerger,
  CustomerRepository,
  IssuedAccessToken,
  PasswordHasher,
  RefreshTokenRepository,
  SessionRepository,
  TokenIssuer,
  WishlistRepository
} from "./ports.js";

export type SignedIn = {
  readonly customer: Customer;
  readonly accessToken: IssuedAccessToken;
  readonly refreshTokenValue: string;
  readonly session: Session;
};

export type AuthenticationOutcome =
  | { readonly kind: "signedIn"; readonly signedIn: SignedIn }
  | { readonly kind: "refused"; readonly errors: readonly UserError[] };

export type RegisterRequest = {
  readonly email: string;
  readonly name: string;
  readonly password: string;
  readonly device: string | null;
  readonly userAgent: string | null;
  readonly visitorKey: string | null;
  readonly callerKey: string;
};

export type LoginRequest = {
  readonly email: string;
  readonly password: string;
  readonly device: string | null;
  readonly userAgent: string | null;
  readonly visitorKey: string | null;
  readonly callerKey: string;
};

export type Authenticate = {
  register(request: RegisterRequest): Promise<AuthenticationOutcome>;
  login(request: LoginRequest): Promise<AuthenticationOutcome>;
  refresh(refreshTokenValue: string | null): Promise<AuthenticationOutcome>;
  logout(sessionId: string | null): Promise<boolean>;
};

export function authenticate(
  customers: CustomerRepository,
  sessions: SessionRepository,
  refreshTokens: RefreshTokenRepository,
  wishlists: WishlistRepository,
  passwords: PasswordHasher,
  tokens: TokenIssuer,
  carts: CartMerger,
  limiter: AttemptLimiter,
  now: () => Date
): Authenticate {
  async function openSession(
    customer: Customer,
    device: string,
    visitorKey: string | null
  ): Promise<SignedIn> {
    const moment = now();
    const session: Session = {
      id: newIdentifier("session"),
      ordinal: await sessions.nextOrdinal(),
      customerId: customer.id,
      device,
      createdAt: toStoredDateTime(moment),
      lastUsedAt: toStoredDateTime(moment),
      expiresAt: toStoredDateTime(addDays(moment, refreshTokenLifetimeInDays)),
      revoked: false
    };
    await sessions.write(session);

    const refreshToken = tokens.newRefreshToken();
    await refreshTokens.write({
      id: newIdentifier("refresh"),
      sessionId: session.id,
      tokenHash: refreshToken.hash,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      rotated: false
    });

    if (visitorKey !== null) {
      await carts.moveAnonymousCart(visitorKey, customer.id);
      await mergeAnonymousWishlist(visitorKey, customer.id);
    }

    return {
      customer,
      accessToken: await tokens.issueAccessToken(customer.id, session.id),
      refreshTokenValue: refreshToken.value,
      session
    };
  }

  async function mergeAnonymousWishlist(visitorKey: string, customerId: string): Promise<void> {
    const anonymousKey = visitorOwnerKey(visitorKey);
    const anonymous = await wishlists.readByOwnerKey(anonymousKey);
    if (anonymous.length === 0) {
      return;
    }
    const ownerKey = customerOwnerKey(customerId);
    const owned = await wishlists.readByOwnerKey(ownerKey);
    await wishlists.replaceForOwner(ownerKey, mergedByAdding(owned, anonymous, ownerKey));
    await wishlists.replaceForOwner(anonymousKey, []);
  }

  return {
    async register(request): Promise<AuthenticationOutcome> {
      if (!limiter.isWithinLimit(request.callerKey)) {
        return { kind: "refused", errors: [tooManyAttempts()] };
      }
      limiter.recordAttempt(request.callerKey);

      if (!isEmailAddress(request.email)) {
        return {
          kind: "refused",
          errors: [userError("EMAIL_INVALID", "That is not a valid email address.", "input.email")]
        };
      }
      const passwordVerdict = judgePassword(request.password);
      if (passwordVerdict !== "acceptable") {
        return { kind: "refused", errors: [passwordRefusal(passwordVerdict)] };
      }
      const email = emailAddress(request.email);
      if ((await customers.readByEmail(email)) !== null) {
        return {
          kind: "refused",
          errors: [userError("EMAIL_TAKEN", "That email address is already registered.", "input.email")]
        };
      }

      const customer: Customer = {
        id: newIdentifier("customer"),
        email,
        name: request.name,
        createdAt: toStoredDateTime(now())
      };
      await customers.write({ ...customer, passwordHash: await passwords.hash(request.password) });
      const signedIn = await openSession(
        customer,
        deviceDescriptionFrom(request.device, request.userAgent),
        request.visitorKey
      );
      return { kind: "signedIn", signedIn };
    },

    async login(request): Promise<AuthenticationOutcome> {
      if (!limiter.isWithinLimit(request.callerKey)) {
        return { kind: "refused", errors: [tooManyAttempts()] };
      }
      limiter.recordAttempt(request.callerKey);

      const stored = isEmailAddress(request.email)
        ? await customers.readByEmail(emailAddress(request.email))
        : null;
      const passwordHash = stored?.passwordHash ?? unknownCustomerPasswordHash;
      const matches = await passwords.verify(passwordHash, request.password);
      if (stored === null || !matches) {
        return { kind: "refused", errors: [credentialsInvalid()] };
      }

      const signedIn = await openSession(
        { id: stored.id, email: stored.email, name: stored.name, createdAt: stored.createdAt },
        deviceDescriptionFrom(request.device, request.userAgent),
        request.visitorKey
      );
      return { kind: "signedIn", signedIn };
    },

    async refresh(refreshTokenValue): Promise<AuthenticationOutcome> {
      if (refreshTokenValue === null) {
        return { kind: "refused", errors: [sessionInvalid()] };
      }
      const presented = await refreshTokens.readByHash(tokens.hashRefreshToken(refreshTokenValue));
      const session =
        presented === null ? null : await sessions.readByIdentifier(presented.sessionId);
      const verdict = judgeRefreshToken(presented, session, now());

      if (verdict === "replayed" && presented !== null) {
        await sessions.markRevoked(presented.sessionId);
        await refreshTokens.markEveryTokenRotatedForSession(presented.sessionId);
        return { kind: "refused", errors: [sessionInvalid()] };
      }
      if (verdict !== "usable" || presented === null || session === null) {
        return { kind: "refused", errors: [sessionInvalid()] };
      }

      const stored = await customers.readByIdentifier(session.customerId);
      if (stored === null) {
        return { kind: "refused", errors: [sessionInvalid()] };
      }

      const moment = now();
      await refreshTokens.markRotated(presented.id);
      const rotated = tokens.newRefreshToken();
      await refreshTokens.write({
        id: newIdentifier("refresh"),
        sessionId: session.id,
        tokenHash: rotated.hash,
        createdAt: toStoredDateTime(moment),
        expiresAt: session.expiresAt,
        rotated: false
      });
      await sessions.touch(session.id, toStoredDateTime(moment));

      return {
        kind: "signedIn",
        signedIn: {
          customer: { id: stored.id, email: stored.email, name: stored.name, createdAt: stored.createdAt },
          accessToken: await tokens.issueAccessToken(stored.id, session.id),
          refreshTokenValue: rotated.value,
          session: { ...session, lastUsedAt: toStoredDateTime(moment) }
        }
      };
    },

    async logout(sessionId): Promise<boolean> {
      if (sessionId === null) {
        return true;
      }
      await sessions.markRevoked(sessionId);
      await refreshTokens.markEveryTokenRotatedForSession(sessionId);
      return true;
    }
  };
}

const unknownCustomerPasswordHash =
  "$argon2id$v=19$m=19456,t=2,p=1$c2FsdHNhbHRzYWx0c2FsdA$Y3+bMlkPNRRjEZbFB1LZBmVW0eHVI9Wt9OQuMQ0kwnk";

function addDays(moment: Date, days: number): Date {
  return new Date(moment.getTime() + days * 24 * 60 * 60 * 1000);
}

function tooManyAttempts(): UserError {
  return userError("RATE_LIMITED", "Too many attempts in a short time. Please wait and try again.");
}

function credentialsInvalid(): UserError {
  return userError("CREDENTIALS_INVALID", "That email address and password do not match a customer.");
}

function sessionInvalid(): UserError {
  return userError("SESSION_INVALID", "That session is unknown, expired, or was already used.");
}

function passwordRefusal(verdict: "PASSWORD_TOO_SHORT" | "PASSWORD_TOO_LONG"): UserError {
  if (verdict === "PASSWORD_TOO_SHORT") {
    return userError("PASSWORD_TOO_SHORT", "A password is at least twelve characters.", "input.password");
  }
  return userError(
    "PASSWORD_TOO_LONG",
    "A password is at most one hundred and twenty eight characters.",
    "input.password"
  );
}
