import { computed, Injectable, signal, Signal, inject } from '@angular/core';
import { Product } from '../models/product.model';
import { LocalStorageService } from './local-storage.service';

const STORAGE_KEY = 'wishlist';

@Injectable({ providedIn: 'root' })
export class WishListService {
  private readonly storage = inject(LocalStorageService);

  private readonly _wishlist = signal<Product[]>(this.storage.get<Product[]>(STORAGE_KEY) ?? []);
  readonly wishlist: Signal<Product[]> = this._wishlist.asReadonly();
  readonly count = computed(() => this._wishlist().length);

  private persist(updated: Product[]): void {
    this._wishlist.set(updated);
    this.storage.set(STORAGE_KEY, updated);
  }

  isInWishlist(product: Product | number): boolean {
    const id = typeof product === 'number' ? product : product.id;
    return this._wishlist().some((wishedProduct) => wishedProduct.id === id);
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
    this.persist(this._wishlist().filter((wishedProduct) => wishedProduct.id !== productId));
  }

  clear(): void {
    this._wishlist.set([]);
    this.storage.remove(STORAGE_KEY);
  }
}
