import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";
import { createCookie } from "react-router";
import { runningInProduction, sessionSecret } from "~/environment.server";

export type StoreFrontSession = {
  accessToken: string | null;
  accessTokenExpiresAt: string | null;
  accessTokenObtainedAt: string | null;
  refreshCookie: string | null;
  cartCookie: string | null;
  customerName: string | null;
};

export const emptyStoreFrontSession: StoreFrontSession = {
  accessToken: null,
  accessTokenExpiresAt: null,
  accessTokenObtainedAt: null,
  refreshCookie: null,
  cartCookie: null,
  customerName: null,
};

const cipherAlgorithm = "aes-256-gcm";
const keyLength = 32;
const nonceLength = 12;
const authenticationTagLength = 16;
const keyDerivationSalt = "zappy-mart-store-front-session";
const thirtyDaysInSeconds = 60 * 60 * 24 * 30;

const storeFrontCookie = createCookie("zappy_store_front", {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  maxAge: thirtyDaysInSeconds,
  secure: runningInProduction(),
});

let derivedKey: Buffer | null = null;

function encryptionKey(): Buffer {
  if (derivedKey === null) {
    derivedKey = scryptSync(sessionSecret(), keyDerivationSalt, keyLength);
  }
  return derivedKey;
}

export function encryptSession(session: StoreFrontSession): string {
  const nonce = randomBytes(nonceLength);
  const cipher = createCipheriv(cipherAlgorithm, encryptionKey(), nonce);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(session), "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([nonce, cipher.getAuthTag(), ciphertext]).toString(
    "base64url",
  );
}

export function decryptSession(encrypted: string): StoreFrontSession {
  try {
    const raw = Buffer.from(encrypted, "base64url");
    const nonce = raw.subarray(0, nonceLength);
    const authenticationTag = raw.subarray(
      nonceLength,
      nonceLength + authenticationTagLength,
    );
    const ciphertext = raw.subarray(nonceLength + authenticationTagLength);
    const decipher = createDecipheriv(cipherAlgorithm, encryptionKey(), nonce);
    decipher.setAuthTag(authenticationTag);
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
    return { ...emptyStoreFrontSession, ...JSON.parse(plaintext) };
  } catch {
    return emptyStoreFrontSession;
  }
}

export async function readStoreFrontSession(
  request: Request,
): Promise<StoreFrontSession> {
  const encrypted: unknown = await storeFrontCookie.parse(
    request.headers.get("Cookie"),
  );
  if (typeof encrypted !== "string") {
    return emptyStoreFrontSession;
  }
  return decryptSession(encrypted);
}

export async function writeStoreFrontSession(
  session: StoreFrontSession,
): Promise<string> {
  return storeFrontCookie.serialize(encryptSession(session));
}

export async function clearStoreFrontSession(): Promise<string> {
  return storeFrontCookie.serialize("", { maxAge: 0 });
}
