import type { UserError } from "@zappy/shared";
import { notAuthenticated, userError } from "@zappy/shared";
import type { Session } from "../domain/session.js";
import { isSessionLive, newestSessionFirst } from "../domain/session.js";
import type { RefreshTokenRepository, SessionRepository } from "./ports.js";

export type RevokeOutcome = {
  readonly sessions: readonly Session[];
  readonly errors: readonly UserError[];
};

export type ManageSessions = {
  openSessionsFor(customerId: string): Promise<readonly Session[]>;
  isLive(sessionId: string): Promise<boolean>;
  revoke(customerId: string | null, sessionId: string): Promise<RevokeOutcome>;
};

export function manageSessions(
  sessions: SessionRepository,
  refreshTokens: RefreshTokenRepository,
  now: () => Date
): ManageSessions {
  return {
    async openSessionsFor(customerId): Promise<readonly Session[]> {
      const open = await sessions.readOpenForCustomer(customerId);
      return newestSessionFirst(open.filter((session) => isSessionLive(session, now())));
    },

    async isLive(sessionId): Promise<boolean> {
      return isSessionLive(await sessions.readByIdentifier(sessionId), now());
    },

    async revoke(customerId, sessionId): Promise<RevokeOutcome> {
      if (customerId === null) {
        return { sessions: [], errors: [notAuthenticated] };
      }
      const wanted = await sessions.readByIdentifier(sessionId);
      if (wanted === null || wanted.customerId !== customerId) {
        return {
          sessions: await this.openSessionsFor(customerId),
          errors: [
            userError("SESSION_NOT_FOUND", `No session with the id ${sessionId} belongs to you.`, "sessionId")
          ]
        };
      }
      await sessions.markRevoked(sessionId);
      await refreshTokens.markEveryTokenRotatedForSession(sessionId);
      return { sessions: await this.openSessionsFor(customerId), errors: [] };
    }
  };
}
