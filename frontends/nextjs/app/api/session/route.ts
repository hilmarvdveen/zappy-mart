import { NextResponse } from "next/server";

import type { SessionAnswer } from "@/browser/sessionRefresh";
import { storefrontOrigin } from "@/configuration";
import { refreshSessionMutation } from "@/graphql/operations";
import { clearSession, readSession, storeAccessToken } from "@/server/session";
import { writeToApi } from "@/server/storefrontClient";

const signedOut: SessionAnswer = {
  signedIn: false,
  accessTokenExpiresAt: null,
};

export async function POST(request: Request): Promise<NextResponse> {
  if (request.headers.get("origin") !== storefrontOrigin) {
    return NextResponse.json(
      { message: "This endpoint answers the store front only." },
      { status: 403 },
    );
  }

  const session = await readSession();
  if (session.accessToken === null) {
    return NextResponse.json(signedOut);
  }

  const data = await writeToApi(refreshSessionMutation, {});
  const accessToken = data?.refreshSession.accessToken ?? null;
  if (accessToken === null) {
    await clearSession();
    return NextResponse.json(signedOut);
  }

  const accessTokenExpiresAt =
    data?.refreshSession.accessTokenExpiresAt ?? null;
  await storeAccessToken(accessToken, accessTokenExpiresAt);

  return NextResponse.json({
    signedIn: true,
    accessTokenExpiresAt,
  } satisfies SessionAnswer);
}
