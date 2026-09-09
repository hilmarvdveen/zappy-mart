"use server";

import { redirect } from "next/navigation";

import {
  loginMutation,
  logoutMutation,
  registerMutation,
  revokeSessionMutation,
} from "@/graphql/operations";
import {
  refusedAction,
  succeededAction,
  unavailableAction,
  type ActionState,
} from "@/server/actionState";
import { revalidateStorefront } from "@/server/revalidation";
import { clearSession, storeAccessToken } from "@/server/session";
import { writeToApi } from "@/server/storefrontClient";

function readText(form: FormData, field: string): string {
  const value = form.get(field);
  return typeof value === "string" ? value : "";
}

function readDestination(form: FormData): string {
  const destination = readText(form, "destination");
  return destination.startsWith("/") ? destination : "/account";
}

export async function signIn(
  previousState: ActionState,
  form: FormData,
): Promise<ActionState> {
  const device = readText(form, "device");
  const data = await writeToApi(loginMutation, {
    input: {
      email: readText(form, "email").trim().toLowerCase(),
      password: readText(form, "password"),
      device: device.length > 0 ? device : null,
    },
  });
  if (data === null) {
    return unavailableAction;
  }
  if (data.login.errors.length > 0) {
    return refusedAction(data.login.errors);
  }
  if (data.login.accessToken === null) {
    return unavailableAction;
  }
  await storeAccessToken(
    data.login.accessToken,
    data.login.accessTokenExpiresAt,
  );
  revalidateStorefront();
  redirect(readDestination(form));
}

export async function register(
  previousState: ActionState,
  form: FormData,
): Promise<ActionState> {
  const data = await writeToApi(registerMutation, {
    input: {
      email: readText(form, "email").trim().toLowerCase(),
      name: readText(form, "name").trim(),
      password: readText(form, "password"),
    },
  });
  if (data === null) {
    return unavailableAction;
  }
  if (data.register.errors.length > 0) {
    return refusedAction(data.register.errors);
  }
  if (data.register.accessToken === null) {
    return unavailableAction;
  }
  await storeAccessToken(
    data.register.accessToken,
    data.register.accessTokenExpiresAt,
  );
  revalidateStorefront();
  redirect(readDestination(form));
}

export async function signOut(): Promise<void> {
  await writeToApi(logoutMutation, {});
  await clearSession();
  revalidateStorefront();
  redirect("/");
}

export async function revokeSession(
  previousState: ActionState,
  form: FormData,
): Promise<ActionState> {
  const data = await writeToApi(revokeSessionMutation, {
    sessionId: readText(form, "sessionId"),
  });
  if (data === null) {
    return unavailableAction;
  }
  if (data.revokeSession.errors.length > 0) {
    return refusedAction(data.revokeSession.errors);
  }
  revalidateStorefront();
  return succeededAction;
}
