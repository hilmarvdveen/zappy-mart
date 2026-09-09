"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  label,
  busyLabel,
  disabled = false,
  tone = "primary",
}: {
  label: string;
  busyLabel?: string;
  disabled?: boolean;
  tone?: "primary" | "secondary";
}) {
  const { pending } = useFormStatus();
  const toneClasses =
    tone === "primary"
      ? "bg-slate-900 text-white hover:bg-slate-700 disabled:bg-slate-400"
      : "border border-slate-400 text-slate-700 hover:bg-slate-100 disabled:text-slate-400";
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={`rounded px-3 py-2 text-sm font-medium transition ${toneClasses}`}
    >
      {pending && busyLabel !== undefined ? busyLabel : label}
    </button>
  );
}
