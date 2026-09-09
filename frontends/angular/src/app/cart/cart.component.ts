import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductImageComponent } from '../../shared/components/product-image/product-image.component';
import { UserErrorsComponent } from '../../shared/components/user-errors/user-errors.component';
import { inputValueOf, numberValueOf } from '../../shared/input-value';
import { MoneyPipe } from '../../shared/money.pipe';
import { attempt } from '../api/attempt';
import { CartChangeFragment } from '../api/generated/contract';
import { UserError } from '../api/user-error';
import { CartService } from './cart.service';
import { stockNote } from './stock-note';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.scss',
  imports: [RouterLink, MoneyPipe, ProductImageComponent, UserErrorsComponent],
})
export class CartComponent {
  private readonly cartService = inject(CartService);

  protected readonly valueOf = inputValueOf;
  protected readonly quantityOf = numberValueOf;
  protected readonly promotionCode = signal('');
  protected readonly errors = signal<UserError[]>([]);
  protected readonly note = signal<string | null>(null);
  protected readonly problem = signal<string | null>(null);

  protected readonly loading = this.cartService.loading;
  protected readonly unreachable = this.cartService.unreachable;
  protected readonly cart = this.cartService.cart;
  protected readonly lines = this.cartService.lines;
  protected readonly empty = this.cartService.empty;
  protected readonly itemCount = this.cartService.itemCount;

  protected async changeQuantity(lineId: string, event: Event): Promise<void> {
    const quantity = numberValueOf(event);
    this.record(
      await attempt(() => this.cartService.changeLineQuantity(lineId, quantity), this.problem)
    );
  }

  protected async removeLine(lineId: string): Promise<void> {
    this.record(await attempt(() => this.cartService.removeLine(lineId), this.problem));
  }

  protected async applyPromotionCode(event: Event): Promise<void> {
    event.preventDefault();
    this.record(
      await attempt(() => this.cartService.applyPromotionCode(this.promotionCode()), this.problem)
    );
  }

  protected async removePromotionCode(): Promise<void> {
    this.promotionCode.set('');
    this.record(await attempt(() => this.cartService.removePromotionCode(), this.problem));
  }

  private record(change: CartChangeFragment | null): void {
    this.errors.set(change?.errors ?? []);
    this.note.set(stockNote(change));
  }
}
