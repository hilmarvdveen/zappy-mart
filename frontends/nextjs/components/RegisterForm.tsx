"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/SubmitButton";
import { UserErrorMessages } from "@/components/UserErrorMessages";
import { register } from "@/server/actions/accountActions";
import { untouchedAction } from "@/server/actionState";

export function RegisterForm({ destination }: { destination: string }) {
  const [state, submit] = useActionState(register, untouchedAction);

  return (
    <form action={submit} className="space-y-4">
      <input type="hidden" name="destination" value={destination} />
      <div>
        <label
          htmlFor="register-name"
          className="block text-sm font-medium text-slate-700"
        >
          Name
        </label>
        <input
          id="register-name"
          name="name"
          type="text"
          autoComplete="name"
          required
          className="mt-1 w-full rounded border border-slate-400 px-3 py-2"
        />
      </div>
      <div>
        <label
          htmlFor="register-email"
          className="block text-sm font-medium text-slate-700"
        >
          Email address
        </label>
        <input
          id="register-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-1 w-full rounded border border-slate-400 px-3 py-2"
        />
      </div>
      <div>
        <label
          htmlFor="register-password"
          className="block text-sm font-medium text-slate-700"
        >
          Password
        </label>
        <input
          id="register-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
          className="mt-1 w-full rounded border border-slate-400 px-3 py-2"
        />
        <p className="mt-1 text-xs text-slate-600">
          At least twelve characters, as the security model asks for.
        </p>
      </div>
      <SubmitButton label="Create account" busyLabel="Creating your account" />
      <UserErrorMessages errors={state.errors} />
    </form>
  );
}
