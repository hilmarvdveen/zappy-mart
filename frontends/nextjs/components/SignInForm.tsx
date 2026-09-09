"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/SubmitButton";
import { UserErrorMessages } from "@/components/UserErrorMessages";
import { signIn } from "@/server/actions/accountActions";
import { untouchedAction } from "@/server/actionState";

export function SignInForm({ destination }: { destination: string }) {
  const [state, submit] = useActionState(signIn, untouchedAction);

  return (
    <form action={submit} className="space-y-4">
      <input type="hidden" name="destination" value={destination} />
      <div>
        <label
          htmlFor="sign-in-email"
          className="block text-sm font-medium text-slate-700"
        >
          Email address
        </label>
        <input
          id="sign-in-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-1 w-full rounded border border-slate-400 px-3 py-2"
        />
      </div>
      <div>
        <label
          htmlFor="sign-in-password"
          className="block text-sm font-medium text-slate-700"
        >
          Password
        </label>
        <input
          id="sign-in-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1 w-full rounded border border-slate-400 px-3 py-2"
        />
      </div>
      <div>
        <label
          htmlFor="sign-in-device"
          className="block text-sm font-medium text-slate-700"
        >
          Device description
        </label>
        <input
          id="sign-in-device"
          name="device"
          type="text"
          placeholder="Chrome on Windows"
          className="mt-1 w-full rounded border border-slate-400 px-3 py-2"
        />
        <p className="mt-1 text-xs text-slate-600">
          It labels this login in your session list, so you recognise it later.
        </p>
      </div>
      <SubmitButton label="Sign in" busyLabel="Signing in" />
      <UserErrorMessages errors={state.errors} />
    </form>
  );
}
