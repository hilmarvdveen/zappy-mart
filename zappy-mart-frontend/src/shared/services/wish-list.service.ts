import { computed, Injectable, signal, Signal } from '@angular/core';
import { Product } from '../models/product.model';
import { LocalStorageService } from './local-storage.service';

const STORAGE_KEY = 'wishlist';

@Injectable({ providedIn: 'root' })
export class WishListService {
  private readonly _wishlist = signal<Product[]>([]);
  readonly wishlist: Signal<Product[]> = this._wishlist.asReadonly();
  readonly count = computed(() => this._wishlist().length);

  constructor(private storage: LocalStorageService) {
    this._wishlist.set(this.storage.get<Product[]>(STORAGE_KEY) ?? []);
  }

  private persist(updated: Product[]): void {
    this._wishlist.set(updated);
    this.storage.set(STORAGE_KEY, updated);
  }

  isInWishlist(product: Product | number): boolean {
    const id = typeof product === 'number' ? product : product.id;
    return this._wishlist().some((p) => p.id === id);
  }

  toggle(product: Product): void {
    if (this.isInWishlist(product)) {
      this.remove(product.id);
    } else {
      this.add(product);
    }
  }

  add(product: Product): void {
    if (this.isInWishlist(product)) return;
    this.persist([...this._wishlist(), product]);
  }

  remove(productId: number): void {
    this.persist(this._wishlist().filter((p) => p.id !== productId));
  }

  clear(): void {
    this._wishlist.set([]);
    this.storage.remove(STORAGE_KEY);
  }
}
