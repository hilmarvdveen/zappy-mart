import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { UserErrorsComponent } from '../../shared/components/user-errors/user-errors.component';
import { MoneyPipe } from '../../shared/money.pipe';
import { attempt } from '../api/attempt';
import { OrdersDocument } from '../api/generated/contract';
import { graphqlResource } from '../api/graphql-resource';
import { UserError } from '../api/user-error';
import { SessionService } from './session.service';

const orderPageSize = 10;

@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
  styleUrl: './account.component.scss',
  imports: [RouterLink, MoneyPipe, UserErrorsComponent],
})
export class AccountComponent {
  private readonly sessionService = inject(SessionService);
  private readonly router = inject(Router);

  protected readonly signedIn = this.sessionService.signedIn;
  protected readonly customer = this.sessionService.customer;
  protected readonly sessions = this.sessionService.sessions;
  protected readonly errors = signal<UserError[]>([]);
  protected readonly problem = signal<string | null>(null);

  private readonly ordersQuery = graphqlResource(OrdersDocument, () =>
    this.signedIn() ? { first: orderPageSize } : undefined
  );

  protected readonly loadingOrders = this.ordersQuery.isLoading;
  protected readonly orders = computed(
    () => this.ordersQuery.value()?.orders.edges.map((edge) => edge.node) ?? []
  );
  protected readonly orderCount = computed(() => this.ordersQuery.value()?.orders.totalCount ?? 0);

  protected async revokeSession(sessionId: string): Promise<void> {
    const answered = await attempt(
      () => this.sessionService.revokeSession(sessionId),
      this.problem
    );

    this.errors.set(answered ?? []);

    if (!this.signedIn()) {
      await this.router.navigate(['/login']);
    }
  }

  protected async logOut(): Promise<void> {
    await attempt(() => this.sessionService.logOut(), this.problem);
    this.errors.set([]);
    await this.router.navigate(['/login']);
  }
}
