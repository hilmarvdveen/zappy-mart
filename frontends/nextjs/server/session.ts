import { cookies } from "next/headers";

import { runningInProduction } from "@/configuration";
import {
  applyApiCookieUpdate,
  type ApiCookieUpdate,
  type ApiCookies,
} from "@/server/apiCookies";
import {
  decryptSession,
  emptySession,
  encryptSession,
  type StorefrontSession,
} from "@/server/sessionCipher";

export const sessionCookieName = "zappy_storefront_session";

const thirtyDaysInSeconds = 60 * 60 * 24 * 30;

export async function readSession(): Promise<StorefrontSession> {
  const cookieStore = await cookies();
  const stored = cookieStore.get(sessionCookieName);
  return stored === undefined ? emptySession : decryptSession(stored.value);
}

export async function writeSession(session: StorefrontSession): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, encryptSession(session), {
    httpOnly: true,
    secure: runningInProduction,
    sameSite: "lax",
    path: "/",
    maxAge: thirtyDaysInSeconds,
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookieName);
}

export async function readApiCookies(): Promise<ApiCookies> {
  const session = await readSession();
  return {
    refreshCookie: session.refreshCookie,
    cartCookie: session.cartCookie,
  };
}

export async function persistApiCookies(update: ApiCookieUpdate): Promise<void> {
  if (update.refreshCookie === undefined && update.cartCookie === undefined) {
    return;
  }
  const session = await readSession();
  const merged = applyApiCookieUpdate(
    { refreshCookie: session.refreshCookie, cartCookie: session.cartCookie },
    update,
  );
  await writeSession({ ...session, ...merged });
}

export async function storeAccessToken(
  accessToken: string,
  accessTokenExpiresAt: string | null,
): Promise<void> {
  const session = await readSession();
  await writeSession({ ...session, accessToken, accessTokenExpiresAt });
}

export async function forgetAccessToken(): Promise<void> {
  const session = await readSession();
  await writeSession({
    ...session,
    accessToken: null,
    accessTokenExpiresAt: null,
    refreshCookie: null,
  });
}
