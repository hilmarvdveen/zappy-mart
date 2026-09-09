export type IncomingHeaderName = "authorization" | "cookie" | "origin";

export type GatewayContext = {
  readonly incomingHeaders: Partial<Record<IncomingHeaderName, string>>;
  collectCookie(value: string): void;
};
