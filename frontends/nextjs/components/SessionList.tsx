"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/SubmitButton";
import { UserErrorMessages } from "@/components/UserErrorMessages";
import { formatMoment } from "@/formatting/moment";
import type { AccountQuery } from "@/graphql/generated/graphql";
import { revokeSession } from "@/server/actions/accountActions";
import { untouchedAction } from "@/server/actionState";

type CustomerSession = NonNullable<AccountQuery["me"]>["sessions"][number];

export function SessionList({
  sessions,
}: {
  sessions: readonly CustomerSession[];
}) {
  const [state, revoke] = useActionState(revokeSession, untouchedAction);

  return (
    <div>
      <ul className="divide-y divide-slate-200">
        {sessions.map((session) => (
          <li
            key={session.id}
            className="flex flex-wrap items-center justify-between gap-3 py-3"
          >
            <div>
              <p className="font-medium text-slate-900">
                {session.device}
                {session.current ? " (this device)" : ""}
              </p>
              <p className="text-sm text-slate-600">
                Signed in {formatMoment(session.createdAt)}, last used{" "}
                {formatMoment(session.lastUsedAt)}
              </p>
            </div>
            <form action={revoke}>
              <input type="hidden" name="sessionId" value={session.id} />
              <SubmitButton
                label={`Revoke ${session.device}`}
                busyLabel="Revoking"
                tone="secondary"
              />
            </form>
          </li>
        ))}
      </ul>
      <UserErrorMessages errors={state.errors} />
    </div>
  );
}
