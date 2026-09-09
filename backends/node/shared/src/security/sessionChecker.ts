import { askSubgraph } from "../http/subgraphClient.js";

export type SessionChecker = {
  isLive(sessionId: string): Promise<boolean>;
};

export const sessionCacheLifetimeInMilliseconds = 5000;

const isSessionLiveDocument = `
  query IsSessionLive($sessionId: ID!) {
    isSessionLive(sessionId: $sessionId)
  }
`;

export function accountsSessionChecker(
  now: () => number = () => Date.now()
): SessionChecker {
  const remembered = new Map<string, { readonly live: boolean; readonly until: number }>();

  return {
    async isLive(sessionId: string): Promise<boolean> {
      const cached = remembered.get(sessionId);
      const moment = now();
      if (cached !== undefined && cached.until > moment) {
        return cached.live;
      }
      try {
        const answer = await askSubgraph<{ isSessionLive: boolean }>(
          "accounts",
          isSessionLiveDocument,
          { sessionId },
          { authorization: null, cookie: null }
        );
        remembered.set(sessionId, {
          live: answer.isSessionLive,
          until: moment + sessionCacheLifetimeInMilliseconds
        });
        return answer.isSessionLive;
      } catch {
        return false;
      }
    }
  };
}

export function alwaysLiveSessionChecker(): SessionChecker {
  return {
    async isLive(): Promise<boolean> {
      return true;
    }
  };
}
