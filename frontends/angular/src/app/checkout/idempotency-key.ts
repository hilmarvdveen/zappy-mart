export function newIdempotencyKey(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `checkout-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
