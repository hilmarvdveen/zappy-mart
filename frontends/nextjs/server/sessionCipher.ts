import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

import { sessionSecret } from "@/configuration";

export type StorefrontSession = {
  accessToken: string | null;
  accessTokenExpiresAt: string | null;
  refreshCookie: string | null;
  cartCookie: string | null;
};

export const emptySession: StorefrontSession = {
  accessToken: null,
  accessTokenExpiresAt: null,
  refreshCookie: null,
  cartCookie: null,
};

const cipherAlgorithm = "aes-256-gcm";
const initialisationVectorLength = 12;

function encryptionKey(): Buffer {
  return createHash("sha256").update(sessionSecret, "utf8").digest();
}

function readText(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function toSession(value: unknown): StorefrontSession {
  if (value === null || typeof value !== "object") {
    return emptySession;
  }
  const candidate = value as Record<string, unknown>;
  return {
    accessToken: readText(candidate.accessToken),
    accessTokenExpiresAt: readText(candidate.accessTokenExpiresAt),
    refreshCookie: readText(candidate.refreshCookie),
    cartCookie: readText(candidate.cartCookie),
  };
}

export function encryptSession(session: StorefrontSession): string {
  const initialisationVector = randomBytes(initialisationVectorLength);
  const cipher = createCipheriv(
    cipherAlgorithm,
    encryptionKey(),
    initialisationVector,
  );
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(session), "utf8"),
    cipher.final(),
  ]);
  return [initialisationVector, cipher.getAuthTag(), encrypted]
    .map((part) => part.toString("base64url"))
    .join(".");
}

export function decryptSession(value: string): StorefrontSession {
  const [vector, authenticationTag, encrypted] = value.split(".");
  if (
    vector === undefined ||
    authenticationTag === undefined ||
    encrypted === undefined
  ) {
    return emptySession;
  }
  try {
    const decipher = createDecipheriv(
      cipherAlgorithm,
      encryptionKey(),
      Buffer.from(vector, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(authenticationTag, "base64url"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encrypted, "base64url")),
      decipher.final(),
    ]).toString("utf8");
    return toSession(JSON.parse(decrypted));
  } catch {
    return emptySession;
  }
}

export function sessionIsSignedIn(session: StorefrontSession): boolean {
  return session.accessToken !== null;
}
