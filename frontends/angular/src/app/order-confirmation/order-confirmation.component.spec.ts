import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { byRole } from '../../testing/roles';
import { GRAPHQL_URL } from '../api/graphql-url';
import { SessionService } from '../account/session.service';
import { OrderConfirmationComponent } from './order-confirmation.component';

const graphqlUrl = 'http://localhost:4000/graphql';

const orderAnswer = {
  data: {
    order: {
      id: 'order-1',
      number: 'ZM-2026-0001',
      status: 'PAID',
      placedAt: '2026-09-09T10:05:00Z',
      promotionCode: 'WELCOME10',
      subtotal: { amount: 5599, currency: 'EUR' },
      discount: { amount: 560, currency: 'EUR' },
      shipping: { amount: 0, currency: 'EUR' },
      total: { amount: 5039, currency: 'EUR' },
      lines: [
        {
          productName: 'Mens Cotton Jacket',
          quantity: 1,
          unitPrice: { amount: 5599, currency: 'EUR' },
          lineTotal: { amount: 5599, currency: 'EUR' },
        },
      ],
    },
  },
};

describe('OrderConfirmationComponent', () => {
  let fixture: ComponentFixture<OrderConfirmationComponent>;
  let httpTestingController: HttpTestingController;

  async function renderWith(answer: unknown): Promise<void> {
    fixture = TestBed.createComponent(OrderConfirmationComponent);
    httpTestingController = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('orderId', 'order-1');

    fixture.detectChanges();
    httpTestingController.expectOne(graphqlUrl).flush(answer);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: GRAPHQL_URL, useValue: graphqlUrl },
        {
          provide: SessionService,
          useValue: { signedIn: signal(true), customer: computed(() => null) },
        },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('thanks the customer and shows the order with its totals', async () => {
    await renderWith(orderAnswer);
    const page = fixture.nativeElement as HTMLElement;

    expect(byRole(page, 'heading', 'Thank you for your order')).toBeTruthy();
    expect(byRole(page, 'status').textContent).toContain('ZM-2026-0001');
    expect(byRole(page, 'rowheader', 'Mens Cotton Jacket')).toBeTruthy();
    expect(page.textContent).toContain('€50.39');
  });

  it('says so when no order with that address belongs to the customer', async () => {
    await renderWith({ data: { order: null } });

    expect(byRole(fixture.nativeElement as HTMLElement, 'heading', 'Order not found')).toBeTruthy();
  });
});
