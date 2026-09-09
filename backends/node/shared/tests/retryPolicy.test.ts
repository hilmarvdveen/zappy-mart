import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  backoffCeilingInMilliseconds,
  backoffDelayInMilliseconds,
  defaultBackoffSettings,
  retryBudget,
  withRetries,
  type RetryBudget,
  type RetryPlan
} from "../src/http/retryPolicy.js";

const slowGrowth = {
  firstDelayInMilliseconds: 100,
  growthFactor: 2,
  maximumDelayInMilliseconds: 400,
  jitterFraction: 0.5
};

function planWithoutWaiting(budget: RetryBudget, maximumAttempts: number): RetryPlan {
  return {
    maximumAttempts,
    backoff: defaultBackoffSettings,
    budget,
    async sleep(): Promise<void> {
      return undefined;
    },
    randomFraction: () => 0.5
  };
}

describe("the backoff", () => {
  it("doubles every attempt and stops at the ceiling", () => {
    assert.equal(backoffCeilingInMilliseconds(1, slowGrowth), 100);
    assert.equal(backoffCeilingInMilliseconds(2, slowGrowth), 200);
    assert.equal(backoffCeilingInMilliseconds(3, slowGrowth), 400);
    assert.equal(backoffCeilingInMilliseconds(4, slowGrowth), 400);
  });

  it("keeps every jittered delay inside the band the ceiling allows", () => {
    for (let attemptNumber = 1; attemptNumber <= 6; attemptNumber = attemptNumber + 1) {
      const ceiling = backoffCeilingInMilliseconds(attemptNumber, slowGrowth);
      for (const randomFraction of [0, 0.25, 0.5, 0.75, 1]) {
        const delay = backoffDelayInMilliseconds(attemptNumber, slowGrowth, randomFraction);
        assert.ok(delay <= ceiling);
        assert.ok(delay >= ceiling / 2);
      }
    }
  });

  it("draws a different delay for a different random draw", () => {
    assert.notEqual(
      backoffDelayInMilliseconds(3, slowGrowth, 0),
      backoffDelayInMilliseconds(3, slowGrowth, 1)
    );
  });
});

describe("the retry budget", () => {
  it("allows the minimum before a single call has been recorded", () => {
    const budget = retryBudget({ retryRatio: 0.2, minimumRetriesPerWindow: 3, windowInMilliseconds: 1000 });
    assert.equal(budget.tryToSpendRetry(), true);
    assert.equal(budget.tryToSpendRetry(), true);
    assert.equal(budget.tryToSpendRetry(), true);
    assert.equal(budget.tryToSpendRetry(), false);
  });

  it("grows the allowance with the calls in the window", () => {
    const budget = retryBudget({ retryRatio: 0.5, minimumRetriesPerWindow: 0, windowInMilliseconds: 1000 });
    budget.recordCall();
    budget.recordCall();
    assert.equal(budget.tryToSpendRetry(), true);
    assert.equal(budget.tryToSpendRetry(), false);
  });

  it("forgets the calls and the retries that fell out of the window", () => {
    let clock = 1000;
    const budget = retryBudget(
      { retryRatio: 1, minimumRetriesPerWindow: 0, windowInMilliseconds: 100 },
      () => clock
    );
    budget.recordCall();
    assert.equal(budget.tryToSpendRetry(), true);
    clock = clock + 500;
    assert.equal(budget.callsInWindow(), 0);
    assert.equal(budget.retriesInWindow(), 0);
  });

  it("stops a retry storm, because a hundred failing calls do not make three hundred retries", async () => {
    const budget = retryBudget({ retryRatio: 0.2, minimumRetriesPerWindow: 5, windowInMilliseconds: 60_000 });
    const plan = planWithoutWaiting(budget, 4);
    let attempts = 0;
    for (let call = 0; call < 100; call = call + 1) {
      await assert.rejects(
        withRetries(plan, () => true, async () => {
          attempts = attempts + 1;
          throw new Error("the downstream is on the floor");
        })
      );
    }
    assert.equal(budget.callsInWindow(), 100);
    assert.ok(budget.retriesInWindow() <= 25);
    assert.ok(attempts <= 125);
    assert.ok(attempts >= 100);
  });
});

describe("running an attempt with retries", () => {
  it("answers on the attempt that succeeds", async () => {
    const budget = retryBudget();
    let attempts = 0;
    const answer = await withRetries(planWithoutWaiting(budget, 3), () => true, async () => {
      attempts = attempts + 1;
      if (attempts < 3) {
        throw new Error("not yet");
      }
      return "the answer";
    });
    assert.equal(answer, "the answer");
    assert.equal(attempts, 3);
    assert.equal(budget.retriesInWindow(), 2);
  });

  it("does not retry a failure the caller calls final", async () => {
    const budget = retryBudget();
    let attempts = 0;
    await assert.rejects(
      withRetries(planWithoutWaiting(budget, 5), () => false, async () => {
        attempts = attempts + 1;
        throw new Error("no promotion code reads NOSUCHCODE");
      })
    );
    assert.equal(attempts, 1);
    assert.equal(budget.retriesInWindow(), 0);
  });

  it("stops at the maximum number of attempts", async () => {
    const budget = retryBudget();
    let attempts = 0;
    await assert.rejects(
      withRetries(planWithoutWaiting(budget, 3), () => true, async () => {
        attempts = attempts + 1;
        throw new Error("still down");
      })
    );
    assert.equal(attempts, 3);
  });
});
