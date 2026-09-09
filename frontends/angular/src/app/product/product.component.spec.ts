import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { WishlistService } from '../../shared/services/wishlist.service';
import { byRole, queryByRole } from '../../testing/roles';
import { GRAPHQL_URL } from '../api/graphql-url';
import { CartService } from '../cart/cart.service';
import { ProductComponent } from './product.component';

const graphqlUrl = 'http://localhost:4000/graphql';

const productAnswer = {
  data: {
    product: {
      id: 'product-12',
      name: 'WD 4TB Gaming Drive',
      slug: 'wd-4tb-gaming-drive',
      description: 'Expand your storage without slowing the game down.',
      stock: 1,
      imageUrl: '/images/products/wd-4tb-gaming-drive.svg',
      price: { amount: 11499, currency: 'EUR' },
      category: { id: 'category-electronics', name: 'Electronics', slug: 'electronics' },
    },
  },
};

describe('ProductComponent', () => {
  let fixture: ComponentFixture<ProductComponent>;
  let httpTestingController: HttpTestingController;
  let addProduct: jest.Mock;

  async function renderWith(answer: unknown): Promise<void> {
    fixture = TestBed.createComponent(ProductComponent);
    httpTestingController = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('slug', 'wd-4tb-gaming-drive');

    fixture.detectChanges();
    httpTestingController.expectOne(graphqlUrl).flush(answer);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    addProduct = jest.fn().mockResolvedValue({ cart: null, availableStock: null, errors: [] });

    await TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: GRAPHQL_URL, useValue: graphqlUrl },
        { provide: CartService, useValue: { addProduct, itemCount: computed(() => 0) } },
        {
          provide: WishlistService,
          useValue: {
            products: signal([]),
            count: computed(() => 0),
            contains: () => false,
            toggle: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('shows the product of the slug with its price, stock and description', async () => {
    await renderWith(productAnswer);
    const page = fixture.nativeElement as HTMLElement;

    expect(byRole(page, 'heading', 'WD 4TB Gaming Drive')).toBeTruthy();
    expect(page.textContent).toContain('€114.99');
    expect(page.textContent).toContain('1 in stock');
    expect(page.textContent).toContain('Expand your storage without slowing the game down.');
  });

  it('adds the chosen quantity to the cart', async () => {
    await renderWith(productAnswer);
    const page = fixture.nativeElement as HTMLElement;
    const quantity = byRole(page, 'spinbutton') as HTMLInputElement;

    quantity.value = '2';
    quantity.dispatchEvent(new Event('input'));
    byRole(page, 'button', 'Add to cart').click();
    await fixture.whenStable();

    expect(addProduct).toHaveBeenCalledWith('product-12', 2);
  });

  it('says so when no product has that address', async () => {
    await renderWith({ data: { product: null } });
    const page = fixture.nativeElement as HTMLElement;

    expect(byRole(page, 'heading', 'Product not found')).toBeTruthy();
    expect(queryByRole(page, 'button', 'Add to cart')).toBeNull();
  });
});
