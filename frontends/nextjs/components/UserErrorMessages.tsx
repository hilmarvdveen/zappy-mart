import { describeUserError } from "@/formatting/userErrorText";
import type { UserErrorView } from "@/server/actionState";

export function UserErrorMessages({
  errors,
  availableStock = null,
}: {
  errors: readonly UserErrorView[];
  availableStock?: number | null;
}) {
  if (errors.length === 0) {
    return null;
  }
  return (
    <ul role="alert" className="mt-2 space-y-1 text-sm text-red-700">
      {errors.map((error) => (
        <li key={`${error.code}-${error.field ?? "operation"}`}>
          {describeUserError(error, availableStock)}
        </li>
      ))}
    </ul>
  );
}
