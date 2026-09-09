import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LoginFormComponent } from '../../shared/components/login-form/login-form.component';
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
  imports: [RouterLink, MoneyPipe, LoginFormComponent, UserErrorsComponent],
})
export class AccountComponent {
  private readonly sessionService = inject(SessionService);

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
  }

  protected async logOut(): Promise<void> {
    await attempt(() => this.sessionService.logOut(), this.problem);
    this.errors.set([]);
  }
}
