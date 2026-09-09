import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { Router } from '@angular/router';
import ProductCardComponent from '../../shared/components/product-card/product-card.component';
import { UserErrorsComponent } from '../../shared/components/user-errors/user-errors.component';
import { checkedValueOf, inputValueOf } from '../../shared/input-value';
import { WishlistService } from '../../shared/services/wishlist.service';
import { attempt } from '../api/attempt';
import { CatalogueDocument, ProductSummaryFragment } from '../api/generated/contract';
import { graphqlResource } from '../api/graphql-resource';
import { UserError } from '../api/user-error';
import { CartService } from '../cart/cart.service';
import { stockNote } from '../cart/stock-note';

const cataloguePageSize = 24;
const maximumPageSize = 100;

@Component({
  selector: 'app-catalogue',
  templateUrl: './catalogue.component.html',
  styleUrl: './catalogue.component.scss',
  imports: [ProductCardComponent, UserErrorsComponent],
})
export class CatalogueComponent {
  private readonly router = inject(Router);
  private readonly cartService = inject(CartService);
  private readonly wishlistService = inject(WishlistService);

  readonly category = input('');
  readonly search = input('');
  readonly stock = input('');

  protected readonly valueOf = inputValueOf;
  protected readonly checkedOf = checkedValueOf;
  protected readonly searchTerm = linkedSignal(() => this.search());
  protected readonly chosenCategory = linkedSignal(() => this.category());
  protected readonly inStockOnly = linkedSignal(() => this.stock() === 'available');
  protected readonly pageSize = signal(cataloguePageSize);
  protected readonly errors = signal<UserError[]>([]);
  protected readonly note = signal<string | null>(null);
  protected readonly problem = signal<string | null>(null);

  private readonly catalogue = graphqlResource(CatalogueDocument, () => ({
    filter: {
      categorySlug: this.category() === '' ? null : this.category(),
      nameContains: this.search() === '' ? null : this.search(),
      inStockOnly: this.stock() === 'available',
    },
    first: this.pageSize(),
  }));

  protected readonly loading = this.catalogue.isLoading;
  protected readonly unreachable = computed(() => this.catalogue.error() !== undefined);
  protected readonly categories = computed(() => this.catalogue.value()?.categories ?? []);
  protected readonly products = computed(
    () => this.catalogue.value()?.products.edges.map((edge) => edge.node) ?? []
  );
  protected readonly totalCount = computed(() => this.catalogue.value()?.products.totalCount ?? 0);
  protected readonly canShowMore = computed(
    () =>
      (this.catalogue.value()?.products.pageInfo.hasNextPage ?? false) &&
      this.pageSize() < maximumPageSize
  );

  protected saved(product: ProductSummaryFragment): boolean {
    return this.wishlistService.contains(product.id);
  }

  protected applyFilter(event: Event): void {
    event.preventDefault();
    void this.router.navigate(['/'], {
      queryParams: {
        category: this.chosenCategory() === '' ? null : this.chosenCategory(),
        search: this.searchTerm() === '' ? null : this.searchTerm(),
        stock: this.inStockOnly() ? 'available' : null,
      },
    });
  }

  protected showMore(): void {
    this.pageSize.update((size) => Math.min(size + cataloguePageSize, maximumPageSize));
  }

  protected async addToCart(product: ProductSummaryFragment): Promise<void> {
    const change = await attempt(() => this.cartService.addProduct(product.id, 1), this.problem);

    this.errors.set(change?.errors ?? []);
    this.note.set(stockNote(change));
  }

  protected async toggleWishlist(product: ProductSummaryFragment): Promise<void> {
    await attempt(() => this.wishlistService.toggle(product), this.problem);
  }
}
