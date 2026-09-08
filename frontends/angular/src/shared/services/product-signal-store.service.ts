import { Injectable, Signal, signal, computed, effect, inject } from '@angular/core';
import { ProductApiService } from './product-api.service';
import { Product } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductSignalStoreService {
  private readonly productApi = inject(ProductApiService);

  private readonly _products = signal<Product[]>([]);
  readonly products = this._products.asReadonly();

  private readonly _loading = signal(false);
  readonly loading = this._loading.asReadonly();

  private readonly _error = signal<unknown | null>(null);
  readonly error = this._error.asReadonly();

  private readonly _loaded = signal(false);

  constructor() {
    effect(() => {
      this.products();
      this.load();
    });
  }

  readonly hasProducts = computed(() => this._products().length > 0);

  readonly errorMessage = computed(() => {
    const error = this._error();
    if (!error) return null;

    if (typeof error === 'string') return error;

    if (error instanceof Error) return error.message;

    if (typeof error === 'object' && error !== null && 'message' in error) {
      return error.message;
    }

    return 'Something went wrong while loading products.';
  });

  load(): void {
    if (this._loaded()) return;

    this._loading.set(true);
    this._error.set(null);

    this.productApi.getAll().subscribe({
      next: (products) => {
        this._products.set(products);
        this._loaded.set(true);
      },
      error: (loadError) => {
        this._error.set(loadError);
        console.error('Product loading failed:', loadError);
      },
      complete: () => this._loading.set(false),
    });
  }

  getById(id: number): Product | undefined {
    return this._products().find((product) => product.id === id);
  }

  filterByCategory(category: string): Signal<Product[]> {
    return computed(() => this._products().filter((product) => product.category === category));
  }
}
