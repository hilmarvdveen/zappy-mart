export type BackoffSettings = {
  readonly firstDelayInMilliseconds: number;
  readonly growthFactor: number;
  readonly maximumDelayInMilliseconds: number;
  readonly jitterFraction: number;
};

export const defaultBackoffSettings: BackoffSettings = {
  firstDelayInMilliseconds: 50,
  growthFactor: 2,
  maximumDelayInMilliseconds: 2000,
  jitterFraction: 0.5
};

export function backoffCeilingInMilliseconds(attemptNumber: number, settings: BackoffSettings): number {
  const grown =
    settings.firstDelayInMilliseconds * Math.pow(settings.growthFactor, Math.max(attemptNumber - 1, 0));
  return Math.min(grown, settings.maximumDelayInMilliseconds);
}

export function backoffDelayInMilliseconds(
  attemptNumber: number,
  settings: BackoffSettings,
  randomFraction: number
): number {
  const ceiling = backoffCeilingInMilliseconds(attemptNumber, settings);
  return Math.round(ceiling * (1 - settings.jitterFraction * randomFraction));
}

export type RetryBudgetSettings = {
  readonly retryRatio: number;
  readonly minimumRetriesPerWindow: number;
  readonly windowInMilliseconds: number;
};

export const defaultRetryBudgetSettings: RetryBudgetSettings = {
  retryRatio: 0.2,
  minimumRetriesPerWindow: 5,
  windowInMilliseconds: 10_000
};

export type RetryBudget = {
  recordCall(): void;
  tryToSpendRetry(): boolean;
  callsInWindow(): number;
  retriesInWindow(): number;
};

export function retryBudget(
  settings: RetryBudgetSettings = defaultRetryBudgetSettings,
  now: () => number = Date.now
): RetryBudget {
  const callMoments: number[] = [];
  const retryMoments: number[] = [];

  function forgetOlderThanWindow(moments: number[], edge: number): void {
    while (moments.length > 0 && (moments[0] as number) <= edge) {
      moments.shift();
    }
  }

  function refresh(): void {
    const edge = now() - settings.windowInMilliseconds;
    forgetOlderThanWindow(callMoments, edge);
    forgetOlderThanWindow(retryMoments, edge);
  }

  return {
    recordCall(): void {
      refresh();
      callMoments.push(now());
    },

    tryToSpendRetry(): boolean {
      refresh();
      const allowance = settings.minimumRetriesPerWindow + settings.retryRatio * callMoments.length;
      if (retryMoments.length >= allowance) {
        return false;
      }
      retryMoments.push(now());
      return true;
    },

    callsInWindow(): number {
      refresh();
      return callMoments.length;
    },

    retriesInWindow(): number {
      refresh();
      return retryMoments.length;
    }
  };
}

export type RetryPlan = {
  readonly maximumAttempts: number;
  readonly backoff: BackoffSettings;
  readonly budget: RetryBudget;
  readonly sleep: (milliseconds: number) => Promise<void>;
  readonly randomFraction: () => number;
};

export function sleepFor(milliseconds: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

export function retryPlan(budget: RetryBudget, maximumAttempts = 3): RetryPlan {
  return {
    maximumAttempts,
    backoff: defaultBackoffSettings,
    budget,
    sleep: sleepFor,
    randomFraction: Math.random
  };
}

export async function withRetries<Value>(
  plan: RetryPlan,
  isRetryable: (failure: unknown) => boolean,
  attempt: (attemptNumber: number) => Promise<Value>
): Promise<Value> {
  plan.budget.recordCall();
  let attemptNumber = 1;
  for (;;) {
    try {
      return await attempt(attemptNumber);
    } catch (failure) {
      const anotherAttemptIsAllowed =
        attemptNumber < plan.maximumAttempts && isRetryable(failure) && plan.budget.tryToSpendRetry();
      if (!anotherAttemptIsAllowed) {
        throw failure;
      }
      await plan.sleep(backoffDelayInMilliseconds(attemptNumber, plan.backoff, plan.randomFraction()));
      attemptNumber = attemptNumber + 1;
    }
  }
}
