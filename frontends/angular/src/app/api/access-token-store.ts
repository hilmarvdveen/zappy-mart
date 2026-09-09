import { computed, Injectable, signal } from '@angular/core';

const refreshMarginInMilliseconds = 30_000;

@Injectable({ providedIn: 'root' })
export class AccessTokenStore {
  private readonly currentToken = signal<string | null>(null);
  private readonly currentExpiry = signal<number | null>(null);

  readonly token = this.currentToken.asReadonly();
  readonly signedIn = computed(() => this.currentToken() !== null);

  hold(token: string, expiresAt: string | null): void {
    this.currentToken.set(token);
    this.currentExpiry.set(expiresAt === null ? null : Date.parse(expiresAt));
  }

  release(): void {
    this.currentToken.set(null);
    this.currentExpiry.set(null);
  }

  aboutToExpire(atMoment: number = Date.now()): boolean {
    const expiry = this.currentExpiry();

    if (expiry === null) {
      return false;
    }

    return expiry - refreshMarginInMilliseconds <= atMoment;
  }
}
