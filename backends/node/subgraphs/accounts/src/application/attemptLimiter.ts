import type { AttemptLimiter } from "./ports.js";

export const attemptsAllowedPerWindow = 20;

export const attemptWindowInMilliseconds = 60_000;

export function inMemoryAttemptLimiter(now: () => number = () => Date.now()): AttemptLimiter {
  const attempts = new Map<string, number[]>();

  function recent(key: string): number[] {
    const moment = now();
    const kept = (attempts.get(key) ?? []).filter(
      (recorded) => moment - recorded < attemptWindowInMilliseconds
    );
    attempts.set(key, kept);
    return kept;
  }

  return {
    isWithinLimit(key: string): boolean {
      return recent(key).length < attemptsAllowedPerWindow;
    },

    recordAttempt(key: string): void {
      const kept = recent(key);
      kept.push(now());
      attempts.set(key, kept);
    }
  };
}
