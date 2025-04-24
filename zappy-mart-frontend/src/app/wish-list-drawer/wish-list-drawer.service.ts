import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class WishListDrawerService {
  private readonly _isOpen = signal(false);
  readonly isOpen = this._isOpen.asReadonly();

  open() {
    this._isOpen.set(true);
  }

  close() {
    this._isOpen.set(false);
  }

  toggle() {
    this._isOpen.update((toggleValue) => !toggleValue);
  }
}
