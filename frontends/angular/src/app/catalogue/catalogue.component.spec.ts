import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { WishlistService } from '../../shared/services/wishlist.service';
import { byRole } from '../../testing/roles';
import { GRAPHQL_URL } from '../api/graphql-url';
import { CartService } from '../cart/cart.service';
import { CatalogueComponent } from './catalogue.component';

const graphqlUrl = 'http://localhost:4000/graphql';

const jacket = {
  id: 'product-03',
  name: 'Mens Cotton Jacket',
  slug: 'mens-cotton-jacket',
  stock: 8,
  imageUrl: '/images/products/mens-cotton-jacket.svg',
  price: { amount: 5599, currency: 'EUR' },
  category: { id: 'category-mens-clothing', name: "Men's clothing", slug: 'mens-clothing' },
};

const catalogueAnswer = {
  data: {
    categories: [
      { id: 'category-mens-clothing', name: "Men's clothing", slug: 'mens-clothing' },
      { id: 'category-electronics', name: 'Electronics', slug: 'electronics' },
    ],
    products: {
      totalCount: 1,
      pageInfo: { hasNextPage: false, endCursor: 'cursor-1' },
      edges: [{ cursor: 'cursor-1', node: jacket }],
    },
  },
};

describe('CatalogueComponent', () => {
  let fixture: ComponentFixture<CatalogueComponent>;
  let httpTestingController: HttpTestingController;
  let addProduct: jest.Mock;
  let toggleWishlist: jest.Mock;

  beforeEach(async () => {
    addProduct = jest.fn().mockResolvedValue({ cart: null, availableStock: null, errors: [] });
    toggleWishlist = jest.fn().mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [CatalogueComponent],
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
            toggle: toggleWishlist,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CatalogueComponent);
    httpTestingController = TestBed.inject(HttpTestingController);

    fixture.detectChanges();
    httpTestingController.expectOne(graphqlUrl).flush(catalogueAnswer);
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('shows the catalogue heading, the categories and the products of the seed', () => {
    const page = fixture.nativeElement as HTMLElement;

    expect(byRole(page, 'heading', 'Catalogue')).toBeTruthy();
    expect(byRole(page, 'status').textContent).toContain('1 products match');
    expect((byRole(page, 'combobox', 'Category') as HTMLSelectElement).options.length).toBe(3);
    expect(byRole(page, 'heading', 'Mens Cotton Jacket')).toBeTruthy();
  });

  it('offers an in stock only checkbox', () => {
    expect(byRole(fixture.nativeElement as HTMLElement, 'checkbox', 'In stock only')).toBeTruthy();
  });

  it('puts the search term and the category in the url when the filter is submitted', () => {
    const page = fixture.nativeElement as HTMLElement;
    const navigate = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const searchBox = byRole(page, 'searchbox', 'Search by name') as HTMLInputElement;
    const categoryBox = byRole(page, 'combobox', 'Category') as HTMLSelectElement;

    searchBox.value = 'jacket';
    searchBox.dispatchEvent(new Event('input'));
    categoryBox.value = 'mens-clothing';
    categoryBox.dispatchEvent(new Event('change'));
    byRole(page, 'button', 'Filter').click();

    expect(navigate).toHaveBeenCalledWith(['/'], {
      queryParams: { category: 'mens-clothing', search: 'jacket', stock: null },
    });
  });

  it('adds a product to the cart from its card', async () => {
    byRole(fixture.nativeElement as HTMLElement, 'button', 'Add to cart').click();
    await fixture.whenStable();

    expect(addProduct).toHaveBeenCalledWith('product-03', 1);
  });

  it('saves a product to the wishlist from its card', async () => {
    byRole(fixture.nativeElement as HTMLElement, 'button', 'Save to wishlist').click();
    await fixture.whenStable();

    expect(toggleWishlist).toHaveBeenCalledWith(jacket);
  });
});
