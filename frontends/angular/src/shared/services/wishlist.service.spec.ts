import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Apollo } from 'apollo-angular';
import { of } from 'rxjs';
import { AccessTokenStore } from '../../app/api/access-token-store';
import { ProductSummaryFragment } from '../../app/api/generated/contract';
import { WishlistService } from './wishlist.service';

const jacket: ProductSummaryFragment = {
  id: 'product-03',
  name: 'Mens Cotton Jacket',
  slug: 'mens-cotton-jacket',
  stock: 8,
  imageUrl: null,
  price: { amount: 5599, currency: 'EUR' },
  category: { id: 'category-mens-clothing', name: "Men's clothing", slug: 'mens-clothing' },
};

describe('WishlistService', () => {
  let service: WishlistService;
  let accessTokenStore: AccessTokenStore;
  let query: jest.Mock;
  let mutate: jest.Mock;

  async function settle(): Promise<void> {
    await TestBed.inject(ApplicationRef).whenStable();
  }

  beforeEach(async () => {
    query = jest.fn().mockReturnValue(of({ data: { wishlist: [jacket] } }));
    mutate = jest.fn().mockReturnValue(of({ data: { addToWishlist: { products: [], errors: [] } } }));

    TestBed.configureTestingModule({
      providers: [{ provide: Apollo, useValue: { query, mutate } }],
    });

    service = TestBed.inject(WishlistService);
    accessTokenStore = TestBed.inject(AccessTokenStore);

    await settle();
  });

  it('reads the wishlist of the visitor from the api', () => {
    expect(query).toHaveBeenCalledTimes(1);
    expect(service.products()).toEqual([jacket]);
    expect(service.count()).toBe(1);
  });

  it('knows whether a product is on the wishlist', () => {
    expect(service.contains('product-03')).toBe(true);
    expect(service.contains('product-07')).toBe(false);
  });

  it('adds a product through addToWishlist and keeps the answered list', async () => {
    mutate.mockReturnValue(of({ data: { addToWishlist: { products: [jacket], errors: [] } } }));

    await service.add(jacket);

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ variables: { productId: 'product-03' } })
    );
    expect(service.products()).toEqual([jacket]);
  });

  it('removes a product through removeFromWishlist and keeps the answered list', async () => {
    mutate.mockReturnValue(of({ data: { removeFromWishlist: { products: [], errors: [] } } }));

    await service.remove('product-03');

    expect(service.products()).toEqual([]);
    expect(service.count()).toBe(0);
  });

  it('toggles a saved product off and an unsaved product on', async () => {
    mutate.mockReturnValue(of({ data: { removeFromWishlist: { products: [], errors: [] } } }));
    await service.toggle(jacket);
    expect(service.products()).toEqual([]);

    mutate.mockReturnValue(of({ data: { addToWishlist: { products: [jacket], errors: [] } } }));
    await service.toggle(jacket);
    expect(service.products()).toEqual([jacket]);
  });

  it('reads the wishlist again when the visitor logs in, because the server merged it', async () => {
    accessTokenStore.hold('access-token', '2026-09-09T10:15:00Z');
    await settle();

    expect(query).toHaveBeenCalledTimes(2);
  });

  it('reads the wishlist again when the visitor logs out', async () => {
    accessTokenStore.hold('access-token', '2026-09-09T10:15:00Z');
    await settle();
    accessTokenStore.release();
    await settle();

    expect(query).toHaveBeenCalledTimes(3);
  });
});
