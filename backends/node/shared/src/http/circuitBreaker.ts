export type CircuitState = "closed" | "open" | "halfOpen";

export type CircuitBreakerSettings = {
  readonly failuresBeforeOpening: number;
  readonly openDurationInMilliseconds: number;
  readonly successesBeforeClosing: number;
};

export const defaultCircuitBreakerSettings: CircuitBreakerSettings = {
  failuresBeforeOpening: 3,
  openDurationInMilliseconds: 5000,
  successesBeforeClosing: 1
};

export class CircuitOpenError extends Error {
  readonly downstream: string;

  constructor(downstream: string) {
    super(`The circuit to ${downstream} is open, so the call was not attempted.`);
    this.name = "CircuitOpenError";
    this.downstream = downstream;
  }
}

export type CircuitBreaker = {
  readonly downstream: string;
  state(): CircuitState;
  allowsCall(): boolean;
  recordSuccess(): void;
  recordFailure(): void;
};

export function circuitBreaker(
  downstream: string,
  settings: CircuitBreakerSettings = defaultCircuitBreakerSettings,
  now: () => number = Date.now
): CircuitBreaker {
  let state: CircuitState = "closed";
  let failuresInARow = 0;
  let successesInARow = 0;
  let openedAt = 0;

  function openTheCircuit(): void {
    state = "open";
    openedAt = now();
    failuresInARow = 0;
    successesInARow = 0;
  }

  return {
    downstream,

    state(): CircuitState {
      if (state === "open" && now() - openedAt >= settings.openDurationInMilliseconds) {
        state = "halfOpen";
      }
      return state;
    },

    allowsCall(): boolean {
      return this.state() !== "open";
    },

    recordSuccess(): void {
      failuresInARow = 0;
      if (state !== "halfOpen") {
        state = "closed";
        return;
      }
      successesInARow = successesInARow + 1;
      if (successesInARow >= settings.successesBeforeClosing) {
        state = "closed";
        successesInARow = 0;
      }
    },

    recordFailure(): void {
      if (state === "halfOpen") {
        openTheCircuit();
        return;
      }
      failuresInARow = failuresInARow + 1;
      if (failuresInARow >= settings.failuresBeforeOpening) {
        openTheCircuit();
      }
    }
  };
}

export async function throughCircuitBreaker<Value>(
  breaker: CircuitBreaker,
  work: () => Promise<Value>
): Promise<Value> {
  if (!breaker.allowsCall()) {
    throw new CircuitOpenError(breaker.downstream);
  }
  try {
    const value = await work();
    breaker.recordSuccess();
    return value;
  } catch (failure) {
    breaker.recordFailure();
    throw failure;
  }
}
