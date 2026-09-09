import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class WishlistDrawerService {
  private readonly currentlyOpen = signal(false);
  readonly isOpen = this.currentlyOpen.asReadonly();

  open(): void {
    this.currentlyOpen.set(true);
  }

  close(): void {
    this.currentlyOpen.set(false);
  }

  toggle(): void {
    this.currentlyOpen.update((open) => !open);
  }
}
