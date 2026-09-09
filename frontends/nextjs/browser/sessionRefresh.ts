export type SessionAnswer = {
  signedIn: boolean;
  accessTokenExpiresAt: string | null;
};

export const sessionRefreshPath = "/api/session";

export async function requestSessionRefresh(): Promise<SessionAnswer> {
  const response = await fetch(sessionRefreshPath, { method: "POST" });
  if (!response.ok) {
    throw new Error(
      `The session endpoint answered ${response.status.toString()}`,
    );
  }
  return (await response.json()) as SessionAnswer;
}
