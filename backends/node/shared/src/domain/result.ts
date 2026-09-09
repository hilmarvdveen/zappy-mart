import type { UserError } from "./userError.js";

export type Result<Value> =
  | { readonly kind: "success"; readonly value: Value }
  | { readonly kind: "refused"; readonly errors: readonly UserError[] };

export function succeeded<Value>(value: Value): Result<Value> {
  return { kind: "success", value };
}

export function refused<Value>(...errors: readonly UserError[]): Result<Value> {
  return { kind: "refused", errors };
}

export function isSuccess<Value>(
  result: Result<Value>
): result is { kind: "success"; value: Value } {
  return result.kind === "success";
}
