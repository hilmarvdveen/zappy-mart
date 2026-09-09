export type UserErrorView = {
  code: string;
  message: string;
  field: string | null;
};

export type ActionOutcome =
  | "untouched"
  | "succeeded"
  | "refused"
  | "unavailable";

export type ActionState = {
  outcome: ActionOutcome;
  errors: UserErrorView[];
  availableStock: number | null;
};

export const untouchedAction: ActionState = {
  outcome: "untouched",
  errors: [],
  availableStock: null,
};

export const succeededAction: ActionState = {
  outcome: "succeeded",
  errors: [],
  availableStock: null,
};

export const unavailableAction: ActionState = {
  outcome: "unavailable",
  errors: [
    {
      code: "API_UNAVAILABLE",
      message: "The Zappy Mart API could not be reached. Try again shortly.",
      field: null,
    },
  ],
  availableStock: null,
};

export function refusedAction(
  errors: readonly UserErrorView[],
  availableStock: number | null = null,
): ActionState {
  return {
    outcome: "refused",
    errors: errors.map((error) => ({
      code: error.code,
      message: error.message,
      field: error.field,
    })),
    availableStock,
  };
}
