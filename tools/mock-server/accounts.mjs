import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { SignJWT, jwtVerify } from "jose";
import { userError } from "./state.mjs";
import { findProductById, presentProduct } from "./catalogue.mjs";
import { findCartForVisitor, mergeAnonymousCartIntoCustomer, openCartForVisitor } from "./cart.mjs";

const deriveKey = promisify(scrypt);
const saltLengthInBytes = 16;
const keyLengthInBytes = 64;
const emailAddressPattern = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
const tokenIssuer = "zappy-mart-mock-server";

export const minimumPasswordLength = 12;
export const maximumPasswordLength = 128;
export const accessTokenLifetimeInSeconds = 15 * 60;
export const refreshTokenLifetimeInSeconds = 30 * 24 * 60 * 60;

export async function hashPassword(password) {
  const salt = randomBytes(saltLengthInBytes);
  const derivedKey = await deriveKey(password, salt, keyLengthInBytes);
  return `scrypt:${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password, storedHash) {
  const [algorithm, saltAsHexadecimal, keyAsHexadecimal] = storedHash.split(":");
  if (algorithm !== "scrypt") {
    return false;
  }
  const derivedKey = await deriveKey(password, Buffer.from(saltAsHexadecimal, "hex"), keyAsHexadecimal.length / 2);
  return timingSafeEqual(derivedKey, Buffer.from(keyAsHexadecimal, "hex"));
}

export function normaliseEmailAddress(text) {
  return text.trim().toLowerCase();
}

export function isEmailAddress(text) {
  return emailAddressPattern.test(text);
}

export function findCustomerByEmailAddress(store, email) {
  return store.customers.find((customer) => customer.email === email) ?? null;
}

export function findCustomerById(store, customerId) {
  return store.customers.find((customer) => customer.id === customerId) ?? null;
}

export async function issueAccessToken(store, customerId, sessionId, now) {
  const expiresAt = new Date(now.getTime() + accessTokenLifetimeInSeconds * 1000);
  const token = await new SignJWT({ customerId, sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(tokenIssuer)
    .setIssuedAt(Math.floor(now.getTime() / 1000))
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(store.accessTokenSecret);

  return { token, expiresAt };
}

export async function readAccessToken(store, token) {
  try {
    const { payload } = await jwtVerify(token, store.accessTokenSecret, {
      algorithms: ["HS256"],
      issuer: tokenIssuer
    });
    return { customerId: String(payload.customerId), sessionId: String(payload.sessionId) };
  } catch {
    return null;
  }
}

export async function readVisitorFromAccessToken(store, token, now) {
  const claims = await readAccessToken(store, token);
  if (claims === null) {
    return null;
  }
  const customer = findCustomerById(store, claims.customerId);
  if (customer === null) {
    return null;
  }
  const session = findOpenSession(store, claims.sessionId, now);
  if (session === null) {
    return null;
  }
  return { customerId: customer.id, sessionId: session.id };
}

export function findOpenSession(store, sessionId, now) {
  return (
    store.sessions.find(
      (session) =>
        session.id === sessionId && session.revokedAt === null && session.expiresAt.getTime() > now.getTime()
    ) ?? null
  );
}

export function hashRefreshToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function issueRefreshToken(store, session, now) {
  const token = randomBytes(32).toString("base64url");
  store.refreshTokens.push({
    tokenHash: hashRefreshToken(token),
    sessionId: session.id,
    createdAt: now,
    rotatedAt: null
  });
  return token;
}

export function openSession(store, customerId, device, now) {
  const session = {
    id: `session-${randomUUID()}`,
    customerId,
    device,
    createdAt: now,
    lastUsedAt: now,
    expiresAt: new Date(now.getTime() + refreshTokenLifetimeInSeconds * 1000),
    revokedAt: null
  };
  store.sessions.push(session);

  return { session, refreshToken: issueRefreshToken(store, session, now) };
}

export function revokeSessionFamily(store, session, now) {
  session.revokedAt = now;
  for (const record of store.refreshTokens) {
    if (record.sessionId === session.id && record.rotatedAt === null) {
      record.rotatedAt = now;
    }
  }
}

export function rotateSession(store, presentedToken, now) {
  const record = store.refreshTokens.find((entry) => entry.tokenHash === hashRefreshToken(presentedToken)) ?? null;
  if (record === null) {
    return { session: null, refreshToken: null, errorCode: "SESSION_INVALID" };
  }

  const session = store.sessions.find((entry) => entry.id === record.sessionId) ?? null;
  if (session === null || session.revokedAt !== null) {
    return { session: null, refreshToken: null, errorCode: "SESSION_INVALID" };
  }
  if (record.rotatedAt !== null || session.expiresAt.getTime() <= now.getTime()) {
    revokeSessionFamily(store, session, now);
    return { session: null, refreshToken: null, errorCode: "SESSION_INVALID" };
  }

  record.rotatedAt = now;
  session.lastUsedAt = now;

  return { session, refreshToken: issueRefreshToken(store, session, now), errorCode: null };
}

export function findSessionByRefreshToken(store, presentedToken) {
  const record = store.refreshTokens.find((entry) => entry.tokenHash === hashRefreshToken(presentedToken)) ?? null;
  if (record === null) {
    return null;
  }
  return store.sessions.find((session) => session.id === record.sessionId && session.revokedAt === null) ?? null;
}

export function openSessionsOf(store, customerId, now) {
  return store.sessions
    .filter(
      (session) =>
        session.customerId === customerId &&
        session.revokedAt === null &&
        session.expiresAt.getTime() > now.getTime()
    )
    .slice()
    .reverse();
}

export function presentSession(session, currentSessionId) {
  return {
    id: session.id,
    device: session.device,
    createdAt: session.createdAt,
    lastUsedAt: session.lastUsedAt,
    current: session.id === currentSessionId
  };
}

export function findAnonymousWishlist(store, anonymousId) {
  return store.anonymousWishlists.find((wishlist) => wishlist.anonymousId === anonymousId) ?? null;
}

export function openAnonymousWishlist(store, anonymousId) {
  const existing = findAnonymousWishlist(store, anonymousId);
  if (existing !== null) {
    return existing;
  }
  const wishlist = { anonymousId, wishlistProductIds: [] };
  store.anonymousWishlists.push(wishlist);
  return wishlist;
}

export function mergeAnonymousWishlistIntoCustomer(store, anonymousId, customer) {
  if (anonymousId === null) {
    return;
  }
  const anonymousWishlist = findAnonymousWishlist(store, anonymousId);
  if (anonymousWishlist === null) {
    return;
  }
  for (const productId of anonymousWishlist.wishlistProductIds) {
    if (!customer.wishlistProductIds.includes(productId)) {
      customer.wishlistProductIds.push(productId);
    }
  }
  store.anonymousWishlists = store.anonymousWishlists.filter((wishlist) => wishlist !== anonymousWishlist);
}

export function presentWishlist(store, holder) {
  return holder.wishlistProductIds
    .map((productId) => findProductById(store, productId))
    .filter((product) => product !== null)
    .reverse()
    .map((product) => presentProduct(store, product));
}

export function presentCustomer(store, customer, context) {
  return {
    id: customer.id,
    email: customer.email,
    name: customer.name,
    createdAt: customer.createdAt,
    sessions: openSessionsOf(store, customer.id, context.now).map((session) =>
      presentSession(session, context.visitor.sessionId)
    ),
    wishlist: presentWishlist(store, customer)
  };
}

function authenticationFailure(code, message, field) {
  return {
    customer: null,
    accessToken: null,
    accessTokenExpiresAt: null,
    errors: [userError(code, message, field)]
  };
}

function describeDevice(context, given) {
  return given ?? context.userAgent ?? "Unknown device";
}

async function signInCustomer(customer, context, device) {
  const store = context.store;
  mergeAnonymousWishlistIntoCustomer(store, context.visitor.anonymousCartId, customer);
  mergeAnonymousCartIntoCustomer(store, context.visitor.anonymousCartId, customer.id, context.now);

  const { session, refreshToken } = openSession(store, customer.id, device, context.now);
  const { token, expiresAt } = await issueAccessToken(store, customer.id, session.id, context.now);

  context.visitor.customerId = customer.id;
  context.visitor.sessionId = session.id;
  context.visitor.anonymousCartId = null;
  context.setRefreshToken(refreshToken);
  context.clearCartCookie();

  return {
    customer: presentCustomer(store, customer, context),
    accessToken: token,
    accessTokenExpiresAt: expiresAt,
    errors: []
  };
}

function signedInCustomer(context) {
  if (context.visitor.customerId === null) {
    return null;
  }
  return findCustomerById(context.store, context.visitor.customerId);
}

function openWishlistHolder(context) {
  const customer = signedInCustomer(context);
  if (customer !== null) {
    return customer;
  }
  const cart = openCartForVisitor(context.store, context.visitor, context.now);
  context.rememberCart(cart);
  return openAnonymousWishlist(context.store, cart.id);
}

function findWishlistHolder(context) {
  const customer = signedInCustomer(context);
  if (customer !== null) {
    return customer;
  }
  const cart = findCartForVisitor(context.store, context.visitor);
  return cart === null ? null : findAnonymousWishlist(context.store, cart.id);
}

function changeWishlist(context, productId, change) {
  const holder = openWishlistHolder(context);
  const product = findProductById(context.store, productId);
  if (product === null) {
    return {
      products: presentWishlist(context.store, holder),
      errors: [userError("PRODUCT_NOT_FOUND", "No product with that id exists.", "productId")]
    };
  }

  change(holder, productId);

  return { products: presentWishlist(context.store, holder), errors: [] };
}

function findCurrentSession(context) {
  const store = context.store;
  if (context.visitor.sessionId !== null) {
    return (
      store.sessions.find(
        (candidate) => candidate.id === context.visitor.sessionId && candidate.revokedAt === null
      ) ?? null
    );
  }
  if (context.refreshToken !== null) {
    return findSessionByRefreshToken(store, context.refreshToken);
  }
  return null;
}

export const accountsResolvers = {
  Query: {
    me(parent, argumentValues, context) {
      const customer = signedInCustomer(context);
      return customer === null ? null : presentCustomer(context.store, customer, context);
    },

    wishlist(parent, argumentValues, context) {
      const holder = findWishlistHolder(context);
      return holder === null ? [] : presentWishlist(context.store, holder);
    }
  },

  Mutation: {
    async register(parent, { input }, context) {
      const store = context.store;
      const email = normaliseEmailAddress(input.email);

      if (!isEmailAddress(email)) {
        return authenticationFailure("EMAIL_INVALID", "That is not a valid email address.", "input.email");
      }
      if (input.password.length < minimumPasswordLength) {
        return authenticationFailure(
          "PASSWORD_TOO_SHORT",
          `A password needs at least ${minimumPasswordLength} characters.`,
          "input.password"
        );
      }
      if (input.password.length > maximumPasswordLength) {
        return authenticationFailure(
          "PASSWORD_TOO_LONG",
          `A password takes at most ${maximumPasswordLength} characters.`,
          "input.password"
        );
      }
      if (findCustomerByEmailAddress(store, email) !== null) {
        return authenticationFailure(
          "EMAIL_TAKEN",
          "A customer with that email address is already registered.",
          "input.email"
        );
      }

      const customer = {
        id: `customer-${randomUUID()}`,
        email,
        name: input.name,
        passwordHash: await hashPassword(input.password),
        createdAt: context.now,
        wishlistProductIds: []
      };
      store.customers.push(customer);

      return signInCustomer(customer, context, describeDevice(context, null));
    },

    async login(parent, { input }, context) {
      const customer = findCustomerByEmailAddress(context.store, normaliseEmailAddress(input.email));
      if (customer === null) {
        await hashPassword(input.password);
        return authenticationFailure(
          "CREDENTIALS_INVALID",
          "The email address and the password together do not match a customer.",
          null
        );
      }

      const passwordMatches = await verifyPassword(input.password, customer.passwordHash);
      if (!passwordMatches) {
        return authenticationFailure(
          "CREDENTIALS_INVALID",
          "The email address and the password together do not match a customer.",
          null
        );
      }

      return signInCustomer(customer, context, describeDevice(context, input.device));
    },

    async refreshSession(parent, argumentValues, context) {
      const store = context.store;
      if (context.refreshToken === null) {
        return authenticationFailure("SESSION_INVALID", "The request carried no refresh token.", null);
      }

      const rotation = rotateSession(store, context.refreshToken, context.now);
      if (rotation.errorCode !== null) {
        context.clearRefreshToken();
        return authenticationFailure(
          rotation.errorCode,
          "The refresh token is unknown, expired or was already used, so the session family was revoked.",
          null
        );
      }

      const customer = findCustomerById(store, rotation.session.customerId);
      if (customer === null) {
        revokeSessionFamily(store, rotation.session, context.now);
        context.clearRefreshToken();
        return authenticationFailure("SESSION_INVALID", "The session belongs to no customer.", null);
      }

      context.visitor.customerId = customer.id;
      context.visitor.sessionId = rotation.session.id;
      context.setRefreshToken(rotation.refreshToken);

      const { token, expiresAt } = await issueAccessToken(store, customer.id, rotation.session.id, context.now);

      return {
        customer: presentCustomer(store, customer, context),
        accessToken: token,
        accessTokenExpiresAt: expiresAt,
        errors: []
      };
    },

    logout(parent, argumentValues, context) {
      const store = context.store;
      const session = findCurrentSession(context);

      if (session !== null) {
        revokeSessionFamily(store, session, context.now);
      }
      context.clearRefreshToken();

      return { success: true, errors: [] };
    },

    revokeSession(parent, { sessionId }, context) {
      const store = context.store;
      const customer = signedInCustomer(context);
      if (customer === null) {
        return {
          sessions: [],
          errors: [userError("NOT_AUTHENTICATED", "Revoking a session needs a signed in customer.")]
        };
      }

      const session =
        store.sessions.find(
          (candidate) =>
            candidate.id === sessionId && candidate.customerId === customer.id && candidate.revokedAt === null
        ) ?? null;

      const presentOpenSessions = () =>
        openSessionsOf(store, customer.id, context.now).map((open) =>
          presentSession(open, context.visitor.sessionId)
        );

      if (session === null) {
        return {
          sessions: presentOpenSessions(),
          errors: [
            userError("SESSION_NOT_FOUND", "No session with that id belongs to the signed in customer.", "sessionId")
          ]
        };
      }

      revokeSessionFamily(store, session, context.now);
      if (session.id === context.visitor.sessionId) {
        context.clearRefreshToken();
      }

      return { sessions: presentOpenSessions(), errors: [] };
    },

    addToWishlist(parent, { productId }, context) {
      return changeWishlist(context, productId, (holder, savedProductId) => {
        if (!holder.wishlistProductIds.includes(savedProductId)) {
          holder.wishlistProductIds.push(savedProductId);
        }
      });
    },

    removeFromWishlist(parent, { productId }, context) {
      return changeWishlist(context, productId, (holder, savedProductId) => {
        holder.wishlistProductIds = holder.wishlistProductIds.filter((saved) => saved !== savedProductId);
      });
    }
  }
};
