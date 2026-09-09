import { computed, inject, Injectable, resource } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { firstValueFrom } from 'rxjs';
import { AccessTokenStore } from '../../app/api/access-token-store';
import {
  AddToWishlistDocument,
  AddToWishlistMutation,
  AddToWishlistMutationVariables,
  ProductSummaryFragment,
  RemoveFromWishlistDocument,
  RemoveFromWishlistMutation,
  RemoveFromWishlistMutationVariables,
  WishlistDocument,
  WishlistQuery,
  WishlistQueryVariables,
} from '../../app/api/generated/contract';

@Injectable({ providedIn: 'root' })
export class WishlistService {
  private readonly apollo = inject(Apollo);
  private readonly accessTokenStore = inject(AccessTokenStore);

  private readonly wishlist = resource({
    params: () => ({ savedFor: this.accessTokenStore.token() }),
    loader: () => this.readFromApi(),
    defaultValue: [] as ProductSummaryFragment[],
  });

  readonly products = this.wishlist.value.asReadonly();
  readonly count = computed(() => this.products().length);
  readonly loading = this.wishlist.isLoading;

  reload(): void {
    this.wishlist.reload();
  }

  contains(productId: string): boolean {
    return this.products().some((product) => product.id === productId);
  }

  async toggle(product: ProductSummaryFragment): Promise<void> {
    if (this.contains(product.id)) {
      await this.remove(product.id);
      return;
    }

    await this.add(product);
  }

  async add(product: ProductSummaryFragment): Promise<void> {
    const answer = await firstValueFrom(
      this.apollo.mutate<AddToWishlistMutation, AddToWishlistMutationVariables>({
        mutation: AddToWishlistDocument,
        variables: { productId: product.id },
      })
    );

    this.wishlist.set(answer.data?.addToWishlist.products ?? this.products());
  }

  async remove(productId: string): Promise<void> {
    const answer = await firstValueFrom(
      this.apollo.mutate<RemoveFromWishlistMutation, RemoveFromWishlistMutationVariables>({
        mutation: RemoveFromWishlistDocument,
        variables: { productId },
      })
    );

    this.wishlist.set(answer.data?.removeFromWishlist.products ?? this.products());
  }

  private async readFromApi(): Promise<ProductSummaryFragment[]> {
    const answer = await firstValueFrom(
      this.apollo.query<WishlistQuery, WishlistQueryVariables>({
        query: WishlistDocument,
        fetchPolicy: 'network-only',
      })
    );

    return answer.data?.wishlist ?? [];
  }
}
