import { createRemoteJWKSet, jwtVerify } from "jose";
import { jsonWebKeySetUrl, tokenAudience, tokenIssuer } from "../configuration.js";
import { accountsSessionChecker, type SessionChecker } from "./sessionChecker.js";

export type SignedInVisitor = {
  readonly customerId: string;
  readonly sessionId: string;
};

export type AccessTokenVerifier = {
  verify(bearerHeader: string | null): Promise<SignedInVisitor | null>;
};

export function bearerTokenOf(bearerHeader: string | null): string | null {
  if (bearerHeader === null) {
    return null;
  }
  const [scheme, token] = bearerHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || token === undefined || token.length === 0) {
    return null;
  }
  return token;
}

export function remoteAccessTokenVerifier(
  sessionChecker: SessionChecker = accountsSessionChecker()
): AccessTokenVerifier {
  const keySet = createRemoteJWKSet(new URL(jsonWebKeySetUrl()), {
    cacheMaxAge: 300_000,
    cooldownDuration: 5_000
  });

  return {
    async verify(bearerHeader: string | null): Promise<SignedInVisitor | null> {
      const token = bearerTokenOf(bearerHeader);
      if (token === null) {
        return null;
      }
      let customerId: unknown;
      let sessionId: unknown;
      try {
        const { payload } = await jwtVerify(token, keySet, {
          issuer: tokenIssuer,
          audience: tokenAudience,
          algorithms: ["RS256"]
        });
        customerId = payload.sub;
        sessionId = payload["sessionId"];
      } catch {
        return null;
      }
      if (typeof customerId !== "string" || typeof sessionId !== "string") {
        return null;
      }
      if (!(await sessionChecker.isLive(sessionId))) {
        return null;
      }
      return { customerId, sessionId };
    }
  };
}
