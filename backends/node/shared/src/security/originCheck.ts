import { allowedOrigins } from "../configuration.js";

export const internalOrigin = "internal";

export type OriginVerdict = "allowed" | "refused";

export function judgeOrigin(origin: string | null | undefined): OriginVerdict {
  if (origin === internalOrigin) {
    return "allowed";
  }
  if (origin === null || origin === undefined || origin.length === 0) {
    return "refused";
  }
  return allowedOrigins().includes(origin) ? "allowed" : "refused";
}
