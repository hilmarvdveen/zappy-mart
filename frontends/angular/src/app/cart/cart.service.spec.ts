import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Apollo } from 'apollo-angular';
import { of } from 'rxjs';
import { AccessTokenStore } from '../api/access-token-store';
import { GRAPHQL_URL } from '../api/graphql-url';
import { CartService } from './cart.service';

const graphqlUrl = 'http://localhost:4000/graphql';

const jacket = {
  id: 'product-03',
  name: 'Mens Cotton Jacket',
  slug: 'mens-cotton-jacket',
  stock: 8,
  imageUrl: null,
  price: { amount: 5599, currency: 'EUR' },
  category: { id: 'category-mens-clothing', name: "Men's clothing", slug: 'mens-clothing' },
};

function cartWith(quantity: number) {
  return {
    id: 'cart-1',
    updatedAt: '2026-09-09T10:00:00Z',
    promotion: null,
    subtotal: { amount: 5599 * quantity, currency: 'EUR' },
    shipping: { amount: 0, currency: 'EUR' },
    total: { amount: 5599 * quantity, currency: 'EUR' },
    lines: [
      {
        id: 'line-1',
        quantity,
        lineTotal: { amount: 5599 * quantity, currency: 'EUR' },
        product: jacket,
      },
    ],
  };
}

describe('CartService', () => {
  let service: CartService;
  let httpTestingController: HttpTestingController;
  let mutate: jest.Mock;

  beforeEach(async () => {
    mutate = jest.fn();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: GRAPHQL_URL, useValue: graphqlUrl },
        { provide: Apollo, useValue: { mutate } },
      ],
    });

    service = TestBed.inject(CartService);
    httpTestingController = TestBed.inject(HttpTestingController);

    TestBed.tick();
    httpTestingController.expectOne(graphqlUrl).flush({ data: { cart: cartWith(2) } });
    await TestBed.inject(ApplicationRef).whenStable();
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('reads the cart of the visitor and derives the item count and the total', () => {
    expect(service.lines().length).toBe(1);
    expect(service.itemCount()).toBe(2);
    expect(service.total()).toEqual({ amount: 11198, currency: 'EUR' });
    expect(service.empty()).toBe(false);
  });

  it('takes the answered cart from a mutation without reading the cart again', async () => {
    mutate.mockReturnValue(
      of({ data: { addToCart: { cart: cartWith(3), availableStock: null, errors: [] } } })
    );

    const change = await service.addProduct('product-03', 1);

    expect(change.errors).toEqual([]);
    expect(service.itemCount()).toBe(3);
  });

  it('keeps the cart it had when a mutation is refused', async () => {
    mutate.mockReturnValue(
      of({
        data: {
          addToCart: {
            cart: null,
            availableStock: 1,
            errors: [{ code: 'OUT_OF_STOCK', message: 'Not enough stock.', field: null }],
          },
        },
      })
    );

    const change = await service.addProduct('product-12', 2);

    expect(change.availableStock).toBe(1);
    expect(service.itemCount()).toBe(2);
  });

  it('reads the cart again as the customer when the visitor logs in', async () => {
    TestBed.inject(AccessTokenStore).hold('access-token', '2030-01-01T00:00:00Z');
    TestBed.tick();

    const request = httpTestingController.expectOne(graphqlUrl);
    expect(request.request.headers.get('Authorization')).toBe('Bearer access-token');

    request.flush({ data: { cart: cartWith(5) } });
    await TestBed.inject(ApplicationRef).whenStable();

    expect(service.itemCount()).toBe(5);
  });

  it('asks for the cart of the anonymous visitor without a bearer token', () => {
    expect(service.lines().length).toBe(1);
  });

  it('refuses an answer without a cart payload', async () => {
    mutate.mockReturnValue(of({ data: undefined }));

    await expect(service.removeLine('line-1')).rejects.toThrow(
      'The store API answered without a cart payload.'
    );
  });
});
