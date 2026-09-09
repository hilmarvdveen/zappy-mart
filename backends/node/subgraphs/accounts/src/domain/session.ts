export type Session = {
  readonly id: string;
  readonly ordinal: number;
  readonly customerId: string;
  readonly device: string;
  readonly createdAt: string;
  readonly lastUsedAt: string;
  readonly expiresAt: string;
  readonly revoked: boolean;
};

export type RefreshToken = {
  readonly id: string;
  readonly sessionId: string;
  readonly tokenHash: string;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly rotated: boolean;
};

export type RefreshVerdict = "usable" | "replayed" | "unknown" | "expired";

export function judgeRefreshToken(
  token: RefreshToken | null,
  session: Session | null,
  moment: Date
): RefreshVerdict {
  if (token === null || session === null) {
    return "unknown";
  }
  if (token.rotated) {
    return "replayed";
  }
  if (session.revoked) {
    return "unknown";
  }
  return new Date(token.expiresAt).getTime() <= moment.getTime() ? "expired" : "usable";
}

export function isSessionLive(session: Session | null, moment: Date): boolean {
  if (session === null || session.revoked) {
    return false;
  }
  return new Date(session.expiresAt).getTime() > moment.getTime();
}

export function newestSessionFirst(sessions: readonly Session[]): readonly Session[] {
  return [...sessions].sort((left, right) => {
    const byMoment = right.createdAt.localeCompare(left.createdAt);
    return byMoment === 0 ? right.ordinal - left.ordinal : byMoment;
  });
}

export function deviceDescriptionFrom(given: string | null, userAgent: string | null): string {
  if (given !== null && given.trim().length > 0) {
    return given.trim();
  }
  if (userAgent !== null && userAgent.trim().length > 0) {
    return userAgent.trim();
  }
  return "Unknown device";
}
