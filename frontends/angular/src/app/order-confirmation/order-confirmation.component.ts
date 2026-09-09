import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MoneyPipe } from '../../shared/money.pipe';
import { SessionService } from '../account/session.service';
import { OrderByIdDocument } from '../api/generated/contract';
import { graphqlResource } from '../api/graphql-resource';

@Component({
  selector: 'app-order-confirmation',
  templateUrl: './order-confirmation.component.html',
  styleUrl: './order-confirmation.component.scss',
  imports: [RouterLink, MoneyPipe],
})
export class OrderConfirmationComponent {
  private readonly sessionService = inject(SessionService);

  readonly orderId = input.required<string>();

  protected readonly signedIn = this.sessionService.signedIn;

  private readonly orderQuery = graphqlResource(OrderByIdDocument, () =>
    this.signedIn() ? { id: this.orderId() } : undefined
  );

  protected readonly loading = this.orderQuery.isLoading;
  protected readonly unreachable = computed(() => this.orderQuery.error() !== undefined);
  protected readonly order = computed(() => this.orderQuery.value()?.order ?? null);
}
