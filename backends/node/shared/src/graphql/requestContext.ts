import type { SignedInVisitor } from "../security/accessToken.js";
import type { ForwardedHeaders } from "../http/subgraphClient.js";

export type SubgraphRequestContext = {
  readonly visitor: SignedInVisitor | null;
  readonly cartCookie: string | null;
  readonly refreshCookie: string | null;
  readonly origin: string | null;
  readonly userAgent: string | null;
  readonly callerAddress: string;
  readonly forwarded: ForwardedHeaders;
  setCookie(value: string): void;
};
