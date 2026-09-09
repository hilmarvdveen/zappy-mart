import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { byRole } from '../../testing/roles';
import { SessionService } from '../account/session.service';
import { CartService } from '../cart/cart.service';
import { CheckoutAttempt } from './checkout-attempt.service';
import { CheckoutComponent } from './checkout.component';
import { OrderService } from './order.service';

const boatNeck = {
  id: 'product-18',
  name: "MBJ Women's Solid Short Sleeve Boat Neck V",
  slug: 'mbj-womens-solid-short-sleeve-boat-neck-v',
  stock: 25,
  imageUrl: null,
  price: { amount: 985, currency: 'EUR' },
  category: { id: 'category-womens-clothing', name: "Women's clothing", slug: 'womens-clothing' },
};

const appliedPromotion = {
  code: 'WELCOME10',
  kind: 'PERCENTAGE',
  discount: { amount: 197, currency: 'EUR' },
};

const filledCart = {
  id: 'cart-1',
  updatedAt: '2026-09-09T10:00:00Z',
  promotion: null as typeof appliedPromotion | null,
  subtotal: { amount: 1970, currency: 'EUR' },
  shipping: { amount: 495, currency: 'EUR' },
  total: { amount: 2465, currency: 'EUR' },
  lines: [
    { id: 'line-1', quantity: 2, lineTotal: { amount: 1970, currency: 'EUR' }, product: boatNeck },
  ],
};

const discountedCart = {
  ...filledCart,
  promotion: appliedPromotion,
  total: { amount: 2268, currency: 'EUR' },
};

describe('CheckoutComponent', () => {
  let fixture: ComponentFixture<CheckoutComponent>;
  let cart: ReturnType<typeof signal<typeof filledCart | null>>;
  let place: jest.Mock;
  let finish: jest.Mock;
  let applyPromotionCode: jest.Mock;
  let navigate: jest.SpyInstance;

  beforeEach(async () => {
    place = jest.fn().mockResolvedValue({ order: { id: 'order-1' }, errors: [] });
    finish = jest.fn();
    cart = signal<typeof filledCart | null>(filledCart);
    applyPromotionCode = jest.fn().mockImplementation(async () => {
      cart.set(discountedCart);
      return { cart: discountedCart, availableStock: null, errors: [] };
    });

    await TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: CartService,
          useValue: {
            cart,
            lines: computed(() => cart()?.lines ?? []),
            empty: computed(() => (cart()?.lines.length ?? 0) === 0),
            itemCount: computed(() => 2),
            applyPromotionCode,
          },
        },
        {
          provide: SessionService,
          useValue: {
            signedIn: signal(true),
            customer: computed(() => ({
              id: 'customer-01',
              name: 'Jane Doe',
              email: 'jane@example.com',
            })),
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
    expect(page.textContent).toContain('Jane Doe, check your order and place it.');
    expect(byRole(page, 'rowheader', "MBJ Women's Solid Short Sleeve Boat Neck V")).toBeTruthy();
    expect(page.textContent).toContain('€24.65');
  });

  it('applies a promotion code and says what it takes off', async () => {
    const page = fixture.nativeElement as HTMLElement;
    const code = byRole(page, 'textbox', 'Promotion code') as HTMLInputElement;

    code.value = 'WELCOME10';
    code.dispatchEvent(new Event('input'));
    byRole(page, 'button', 'Apply code').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(applyPromotionCode).toHaveBeenCalledWith('WELCOME10');
    expect(page.textContent).toContain('WELCOME10 takes off €1.97.');
    expect(page.textContent).toContain('€22.68');
  });

  it('places the order with one idempotency key and goes to the confirmation', async () => {
    byRole(fixture.nativeElement as HTMLElement, 'button', 'Place order').click();
    await fixture.whenStable();

    expect(place).toHaveBeenCalledWith('attempt-1');
    expect(finish).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/orders', 'order-1']);
  });
});
