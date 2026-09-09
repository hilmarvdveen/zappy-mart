import { inject, Injectable } from '@angular/core';
import { LocalStorageService } from '../../shared/services/local-storage.service';
import { newIdempotencyKey } from './idempotency-key';

const storageKey = 'checkout-idempotency-key';

@Injectable({ providedIn: 'root' })
export class CheckoutAttempt {
  private readonly storage = inject(LocalStorageService);

  idempotencyKey(): string {
    const stored = this.storage.get<string>(storageKey);

    if (stored !== null) {
      return stored;
    }

    const created = newIdempotencyKey();
    this.storage.set(storageKey, created);

    return created;
  }

  finish(): void {
    this.storage.remove(storageKey);
  }
}
