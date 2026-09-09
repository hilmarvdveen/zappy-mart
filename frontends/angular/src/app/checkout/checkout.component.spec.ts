import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { byRole, queryByRole } from '../../testing/roles';
import { SessionService } from '../account/session.service';
import { CartService } from '../cart/cart.service';
import { CheckoutAttempt } from './checkout-attempt.service';
import { CheckoutComponent } from './checkout.component';
import { OrderService } from './order.service';

const jacket = {
  id: 'product-03',
  name: 'Mens Cotton Jacket',
  slug: 'mens-cotton-jacket',
  stock: 8,
  imageUrl: null,
  price: { amount: 5599, currency: 'EUR' },
  category: { id: 'category-mens-clothing', name: "Men's clothing", slug: 'mens-clothing' },
};

const filledCart = {
  id: 'cart-1',
  updatedAt: '2026-09-09T10:00:00Z',
  promotion: null,
  subtotal: { amount: 5599, currency: 'EUR' },
  shipping: { amount: 0, currency: 'EUR' },
  total: { amount: 5599, currency: 'EUR' },
  lines: [{ id: 'line-1', quantity: 1, lineTotal: { amount: 5599, currency: 'EUR' }, product: jacket }],
};

describe('CheckoutComponent', () => {
  let fixture: ComponentFixture<CheckoutComponent>;
  let signedIn: ReturnType<typeof signal<boolean>>;
  let place: jest.Mock;
  let finish: jest.Mock;
  let navigate: jest.SpyInstance;

  beforeEach(async () => {
    signedIn = signal(true);
    place = jest.fn().mockResolvedValue({ order: { id: 'order-1' }, errors: [] });
    finish = jest.fn();

    const cart = signal<typeof filledCart | null>(filledCart);

    await TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: CartService,
          useValue: {
            cart,
            lines: computed(() => cart()?.lines ?? []),
            empty: computed(() => (cart()?.lines.length ?? 0) === 0),
            itemCount: computed(() => 1),
          },
        },
        {
          provide: SessionService,
          useValue: {
            signedIn,
            customer: computed(() => ({ id: 'customer-01', name: 'Jane Doe', email: 'jane@example.com' })),
            logIn: jest.fn().mockResolvedValue([]),
            register: jest.fn().mockResolvedValue([]),
          },
        },
        { provide: OrderService, useValue: { place } },
        { provide: CheckoutAttempt, useValue: { idempotencyKey: () => 'attempt-1', finish } },
      ],
    }).compileComponents();

    navigate = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(CheckoutComponent);
    fixture.detectChanges();
  });

  it('shows what is about to be ordered and who is ordering it', () => {
    const page = fixture.nativeElement as HTMLElement;

    expect(byRole(page, 'heading', 'Checkout')).toBeTruthy();
    expect(byRole(page, 'status').textContent).toContain('Jane Doe');
    expect(byRole(page, 'rowheader', 'Mens Cotton Jacket')).toBeTruthy();
  });

  it('places the order with one idempotency key and goes to the confirmation', async () => {
    byRole(fixture.nativeElement as HTMLElement, 'button', 'Place order').click();
    await fixture.whenStable();

    expect(place).toHaveBeenCalledWith('attempt-1');
    expect(finish).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/orders', 'order-1']);
  });

  it('asks an anonymous visitor to log in instead of showing the order button', () => {
    signedIn.set(false);
    fixture.detectChanges();

    const page = fixture.nativeElement as HTMLElement;

    expect(byRole(page, 'form', 'Log in')).toBeTruthy();
    expect(queryByRole(page, 'button', 'Place order')).toBeNull();
  });
});
