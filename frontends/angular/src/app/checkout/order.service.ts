import { inject, Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { firstValueFrom } from 'rxjs';
import {
  PlaceOrderDocument,
  PlaceOrderMutation,
  PlaceOrderMutationVariables,
} from '../api/generated/contract';
import { CartService } from '../cart/cart.service';

export type PlacedOrder = PlaceOrderMutation['placeOrder'];

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly apollo = inject(Apollo);
  private readonly cartService = inject(CartService);

  async place(idempotencyKey: string): Promise<PlacedOrder> {
    const answer = await firstValueFrom(
      this.apollo.mutate<PlaceOrderMutation, PlaceOrderMutationVariables>({
        mutation: PlaceOrderDocument,
        variables: { idempotencyKey },
      })
    );

    const payload = answer.data?.placeOrder;

    if (payload === undefined) {
      throw new Error('The store API answered without an order payload.');
    }

    if (payload.order !== null) {
      this.cartService.reload();
    }

    return payload;
  }
}
