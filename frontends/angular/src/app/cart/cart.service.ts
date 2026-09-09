import { computed, inject, Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { firstValueFrom } from 'rxjs';
import {
  AddToCartDocument,
  AddToCartMutation,
  AddToCartMutationVariables,
  ApplyPromotionCodeDocument,
  ApplyPromotionCodeMutation,
  ApplyPromotionCodeMutationVariables,
  CartChangeFragment,
  CartDocument,
  ChangeCartLineQuantityDocument,
  ChangeCartLineQuantityMutation,
  ChangeCartLineQuantityMutationVariables,
  RemoveCartLineDocument,
  RemoveCartLineMutation,
  RemoveCartLineMutationVariables,
  RemovePromotionCodeDocument,
  RemovePromotionCodeMutation,
  RemovePromotionCodeMutationVariables,
} from '../api/generated/contract';
import { graphqlResource } from '../api/graphql-resource';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly apollo = inject(Apollo);
  private readonly cartQuery = graphqlResource(CartDocument, () => ({}));

  readonly loading = this.cartQuery.isLoading;
  readonly unreachable = computed(() => this.cartQuery.error() !== undefined);
  readonly cart = computed(() => this.cartQuery.value()?.cart ?? null);
  readonly lines = computed(() => this.cart()?.lines ?? []);
  readonly itemCount = computed(() =>
    this.lines().reduce((count, line) => count + line.quantity, 0)
  );
  readonly total = computed(() => this.cart()?.total ?? null);
  readonly empty = computed(() => this.lines().length === 0);

  reload(): void {
    this.cartQuery.reload();
  }

  async addProduct(productId: string, quantity: number): Promise<CartChangeFragment> {
    const answer = await firstValueFrom(
      this.apollo.mutate<AddToCartMutation, AddToCartMutationVariables>({
        mutation: AddToCartDocument,
        variables: { productId, quantity },
      })
    );

    return this.accept(answer.data?.addToCart);
  }

  async changeLineQuantity(lineId: string, quantity: number): Promise<CartChangeFragment> {
    const answer = await firstValueFrom(
      this.apollo.mutate<ChangeCartLineQuantityMutation, ChangeCartLineQuantityMutationVariables>({
        mutation: ChangeCartLineQuantityDocument,
        variables: { lineId, quantity },
      })
    );

    return this.accept(answer.data?.changeCartLineQuantity);
  }

  async removeLine(lineId: string): Promise<CartChangeFragment> {
    const answer = await firstValueFrom(
      this.apollo.mutate<RemoveCartLineMutation, RemoveCartLineMutationVariables>({
        mutation: RemoveCartLineDocument,
        variables: { lineId },
      })
    );

    return this.accept(answer.data?.removeCartLine);
  }

  async applyPromotionCode(code: string): Promise<CartChangeFragment> {
    const answer = await firstValueFrom(
      this.apollo.mutate<ApplyPromotionCodeMutation, ApplyPromotionCodeMutationVariables>({
        mutation: ApplyPromotionCodeDocument,
        variables: { code },
      })
    );

    return this.accept(answer.data?.applyPromotionCode);
  }

  async removePromotionCode(): Promise<CartChangeFragment> {
    const answer = await firstValueFrom(
      this.apollo.mutate<RemovePromotionCodeMutation, RemovePromotionCodeMutationVariables>({
        mutation: RemovePromotionCodeDocument,
      })
    );

    return this.accept(answer.data?.removePromotionCode);
  }

  private accept(change: CartChangeFragment | undefined): CartChangeFragment {
    if (change === undefined) {
      throw new Error('The store API answered without a cart payload.');
    }

    if (change.cart !== null) {
      this.cartQuery.set({ cart: change.cart });
    }

    return change;
  }
}
