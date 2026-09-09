import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductImageComponent } from '../../shared/components/product-image/product-image.component';
import { UserErrorsComponent } from '../../shared/components/user-errors/user-errors.component';
import { numberValueOf } from '../../shared/input-value';
import { MoneyPipe } from '../../shared/money.pipe';
import { WishlistService } from '../../shared/services/wishlist.service';
import { attempt } from '../api/attempt';
import { ProductBySlugDocument, ProductSummaryFragment } from '../api/generated/contract';
import { graphqlResource } from '../api/graphql-resource';
import { UserError } from '../api/user-error';
import { CartService } from '../cart/cart.service';
import { stockNote } from '../cart/stock-note';

@Component({
  selector: 'app-product',
  templateUrl: './product.component.html',
  styleUrl: './product.component.scss',
  imports: [RouterLink, MoneyPipe, ProductImageComponent, UserErrorsComponent],
})
export class ProductComponent {
  private readonly cartService = inject(CartService);
  private readonly wishlistService = inject(WishlistService);

  readonly slug = input.required<string>();

  protected readonly quantityOf = numberValueOf;
  protected readonly quantity = signal(1);
  protected readonly errors = signal<UserError[]>([]);
  protected readonly note = signal<string | null>(null);
  protected readonly problem = signal<string | null>(null);
  protected readonly added = signal(false);

  private readonly productQuery = graphqlResource(ProductBySlugDocument, () => ({
    slug: this.slug(),
  }));

  protected readonly loading = this.productQuery.isLoading;
  protected readonly unreachable = computed(() => this.productQuery.error() !== undefined);
  protected readonly product = computed(() => this.productQuery.value()?.product ?? null);

  protected saved(product: ProductSummaryFragment): boolean {
    return this.wishlistService.contains(product.id);
  }

  protected async addToCart(product: ProductSummaryFragment): Promise<void> {
    this.added.set(false);

    const change = await attempt(
      () => this.cartService.addProduct(product.id, this.quantity()),
      this.problem
    );

    this.errors.set(change?.errors ?? []);
    this.note.set(stockNote(change));
    this.added.set(change !== null && change.errors.length === 0);
  }

  protected async toggleWishlist(product: ProductSummaryFragment): Promise<void> {
    await attempt(() => this.wishlistService.toggle(product), this.problem);
  }
}
