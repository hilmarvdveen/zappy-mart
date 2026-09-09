import { WritableSignal } from '@angular/core';

export const storeUnreachableMessage = 'The store could not be reached. Please try again.';

export async function attempt<TPayload>(
  action: () => Promise<TPayload>,
  problem: WritableSignal<string | null>
): Promise<TPayload | null> {
  problem.set(null);

  try {
    return await action();
  } catch {
    problem.set(storeUnreachableMessage);
    return null;
  }
}
