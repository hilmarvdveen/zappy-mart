import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { circuitBreaker, CircuitOpenError, throughCircuitBreaker } from "../src/http/circuitBreaker.js";

const settings = {
  failuresBeforeOpening: 3,
  openDurationInMilliseconds: 1000,
  successesBeforeClosing: 1
};

describe("the circuit breaker", () => {
  it("stays closed while the calls succeed", () => {
    const breaker = circuitBreaker("catalogue", settings, () => 0);
    breaker.recordSuccess();
    breaker.recordSuccess();
    assert.equal(breaker.state(), "closed");
    assert.equal(breaker.allowsCall(), true);
  });

  it("opens after the configured failures in a row and refuses the next call", () => {
    const breaker = circuitBreaker("catalogue", settings, () => 0);
    breaker.recordFailure();
    breaker.recordFailure();
    assert.equal(breaker.state(), "closed");
    breaker.recordFailure();
    assert.equal(breaker.state(), "open");
    assert.equal(breaker.allowsCall(), false);
  });

  it("forgets the failures when a call succeeds in between", () => {
    const breaker = circuitBreaker("catalogue", settings, () => 0);
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordSuccess();
    breaker.recordFailure();
    breaker.recordFailure();
    assert.equal(breaker.state(), "closed");
  });

  it("half opens after the open period and closes on the probe that succeeds", () => {
    let clock = 0;
    const breaker = circuitBreaker("catalogue", settings, () => clock);
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();
    assert.equal(breaker.allowsCall(), false);
    clock = 1000;
    assert.equal(breaker.state(), "halfOpen");
    assert.equal(breaker.allowsCall(), true);
    breaker.recordSuccess();
    assert.equal(breaker.state(), "closed");
  });

  it("opens again when the probe fails", () => {
    let clock = 0;
    const breaker = circuitBreaker("catalogue", settings, () => clock);
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();
    clock = 1000;
    assert.equal(breaker.state(), "halfOpen");
    breaker.recordFailure();
    assert.equal(breaker.state(), "open");
    assert.equal(breaker.allowsCall(), false);
  });

  it("does not even attempt the work while the circuit is open", async () => {
    const breaker = circuitBreaker("catalogue", settings, () => 0);
    let attempts = 0;
    for (let failure = 0; failure < 3; failure = failure + 1) {
      await assert.rejects(
        throughCircuitBreaker(breaker, async () => {
          attempts = attempts + 1;
          throw new Error("connection refused");
        })
      );
    }
    assert.equal(attempts, 3);
    await assert.rejects(
      throughCircuitBreaker(breaker, async () => {
        attempts = attempts + 1;
        return "never reached";
      }),
      (failure: unknown) => failure instanceof CircuitOpenError
    );
    assert.equal(attempts, 3);
  });
});
