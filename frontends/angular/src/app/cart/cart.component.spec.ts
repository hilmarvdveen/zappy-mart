import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { allByRole, byRole } from '../../testing/roles';
import { CartComponent } from './cart.component';
import { CartService } from './cart.service';

const jacket = {
  id: 'product-03',
  name: 'Mens Cotton Jacket',
  slug: 'mens-cotton-jacket',
  stock: 8,
  imageUrl: '/images/products/mens-cotton-jacket.svg',
  price: { amount: 5599, currency: 'EUR' },
  category: { id: 'category-mens-clothing', name: "Men's clothing", slug: 'mens-clothing' },
};

const line = {
  id: 'line-1',
  quantity: 2,
  lineTotal: { amount: 11198, currency: 'EUR' },
  product: jacket,
};

const filledCart = {
  id: 'cart-1',
  updatedAt: '2026-09-09T10:00:00Z',
  promotion: null,
  subtotal: { amount: 11198, currency: 'EUR' },
  shipping: { amount: 0, currency: 'EUR' },
  total: { amount: 11198, currency: 'EUR' },
  lines: [line],
};

describe('CartComponent', () => {
  let fixture: ComponentFixture<CartComponent>;
  let cartService: {
    loading: ReturnType<typeof signal<boolean>>;
    unreachable: ReturnType<typeof signal<boolean>>;
    cart: ReturnType<typeof signal<typeof filledCart | null>>;
    changeLineQuantity: jest.Mock;
    removeLine: jest.Mock;
    applyPromotionCode: jest.Mock;
    removePromotionCode: jest.Mock;
  };

  beforeEach(async () => {
    const cart = signal<typeof filledCart | null>(filledCart);
    const noChange = { cart: filledCart, availableStock: null, errors: [] };

    cartService = {
      loading: signal(false),
      unreachable: signal(false),
      cart,
      changeLineQuantity: jest.fn().mockResolvedValue(noChange),
      removeLine: jest.fn().mockResolvedValue(noChange),
      applyPromotionCode: jest.fn().mockResolvedValue(noChange),
      removePromotionCode: jest.fn().mockResolvedValue(noChange),
    };

    await TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: CartService,
          useValue: {
            ...cartService,
            lines: computed(() => cart()?.lines ?? []),
            empty: computed(() => (cart()?.lines.length ?? 0) === 0),
            itemCount: computed(() =>
              (cart()?.lines ?? []).reduce((count, cartLine) => count + cartLine.quantity, 0)
            ),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CartComponent);
    fixture.detectChanges();
  });

  it('lists the lines of the cart with the totals', () => {
    const page = fixture.nativeElement as HTMLElement;

    expect(byRole(page, 'heading', 'Your cart')).toBeTruthy();
    expect(byRole(page, 'table')).toBeTruthy();
    expect(byRole(page, 'rowheader', /Mens Cotton Jacket/)).toBeTruthy();
    expect(allByRole(page, 'cell').some((cell) => cell.textContent?.includes('€111.98'))).toBe(
      true
    );
  });

  it('changes the quantity of a line', async () => {
    const quantity = byRole(fixture.nativeElement as HTMLElement, 'spinbutton') as HTMLInputElement;

    quantity.value = '3';
    quantity.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    expect(cartService.changeLineQuantity).toHaveBeenCalledWith('line-1', 3);
  });

  it('removes a line', async () => {
    byRole(fixture.nativeElement as HTMLElement, 'button', 'Remove Mens Cotton Jacket').click();
    await fixture.whenStable();

    expect(cartService.removeLine).toHaveBeenCalledWith('line-1');
  });

  it('applies a promotion code', async () => {
    const page = fixture.nativeElement as HTMLElement;
    const code = byRole(page, 'textbox') as HTMLInputElement;

    code.value = 'WELCOME10';
    code.dispatchEvent(new Event('input'));
    byRole(page, 'button', 'Apply').click();
    await fixture.whenStable();

    expect(cartService.applyPromotionCode).toHaveBeenCalledWith('WELCOME10');
  });

  it('says the cart is empty when it has no lines', () => {
    cartService.cart.set(null);
    fixture.detectChanges();

    expect(byRole(fixture.nativeElement as HTMLElement, 'status').textContent).toContain(
      'Your cart is empty'
    );
  });
});
