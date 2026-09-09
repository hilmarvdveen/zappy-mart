import { createHash, randomBytes } from "node:crypto";
import { SignJWT, exportJWK, generateKeyPair, type CryptoKey, type JWK } from "jose";
import {
  accessTokenLifetimeInSeconds,
  toContractDateTime,
  tokenAudience,
  tokenIssuer
} from "@zappy/shared";
import type { IssuedAccessToken, TokenIssuer } from "../../application/ports.js";

export type SigningKeys = {
  readonly keyIdentifier: string;
  readonly privateKey: CryptoKey;
  readonly publicJsonWebKey: JWK;
};

export async function generateSigningKeys(): Promise<SigningKeys> {
  const { privateKey, publicKey } = await generateKeyPair("RS256", { extractable: true });
  const publicJsonWebKey = await exportJWK(publicKey);
  const keyIdentifier = createHash("sha256")
    .update(JSON.stringify(publicJsonWebKey))
    .digest("base64url")
    .slice(0, 16);
  return { keyIdentifier, privateKey, publicJsonWebKey };
}

export function jsonWebKeySet(keys: SigningKeys): { keys: readonly JWK[] } {
  return {
    keys: [{ ...keys.publicJsonWebKey, kid: keys.keyIdentifier, alg: "RS256", use: "sig" }]
  };
}

export function rsaTokenIssuer(keys: SigningKeys, now: () => Date): TokenIssuer {
  return {
    async issueAccessToken(customerId: string, sessionId: string): Promise<IssuedAccessToken> {
      const issuedAt = Math.floor(now().getTime() / 1000);
      const expiresAt = issuedAt + accessTokenLifetimeInSeconds;
      const token = await new SignJWT({ sessionId })
        .setProtectedHeader({ alg: "RS256", kid: keys.keyIdentifier })
        .setSubject(customerId)
        .setIssuer(tokenIssuer)
        .setAudience(tokenAudience)
        .setIssuedAt(issuedAt)
        .setExpirationTime(expiresAt)
        .sign(keys.privateKey);
      return { token, expiresAt: toContractDateTime(new Date(expiresAt * 1000)) };
    },

    newRefreshToken(): { value: string; hash: string } {
      const value = randomBytes(32).toString("base64url");
      return { value, hash: hashOf(value) };
    },

    hashRefreshToken(value: string): string {
      return hashOf(value);
    }
  };
}

function hashOf(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
