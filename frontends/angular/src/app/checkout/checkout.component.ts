import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LoginFormComponent } from '../../shared/components/login-form/login-form.component';
import { UserErrorsComponent } from '../../shared/components/user-errors/user-errors.component';
import { MoneyPipe } from '../../shared/money.pipe';
import { SessionService } from '../account/session.service';
import { attempt } from '../api/attempt';
import { UserError } from '../api/user-error';
import { CartService } from '../cart/cart.service';
import { CheckoutAttempt } from './checkout-attempt.service';
import { OrderService } from './order.service';

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss',
  imports: [RouterLink, MoneyPipe, LoginFormComponent, UserErrorsComponent],
})
export class CheckoutComponent {
  private readonly router = inject(Router);
  private readonly cartService = inject(CartService);
  private readonly sessionService = inject(SessionService);
  private readonly orderService = inject(OrderService);
  private readonly checkoutAttempt = inject(CheckoutAttempt);

  protected readonly signedIn = this.sessionService.signedIn;
  protected readonly customer = this.sessionService.customer;
  protected readonly cart = this.cartService.cart;
  protected readonly lines = this.cartService.lines;
  protected readonly empty = this.cartService.empty;

  protected readonly placing = signal(false);
  protected readonly errors = signal<UserError[]>([]);
  protected readonly problem = signal<string | null>(null);

  protected async placeOrder(): Promise<void> {
    this.placing.set(true);

    const payload = await attempt(
      () => this.orderService.place(this.checkoutAttempt.idempotencyKey()),
      this.problem
    );

    this.placing.set(false);
    this.errors.set(payload?.errors ?? []);

    if (payload?.order != null) {
      this.checkoutAttempt.finish();
      await this.router.navigate(['/orders', payload.order.id]);
    }
  }
}
