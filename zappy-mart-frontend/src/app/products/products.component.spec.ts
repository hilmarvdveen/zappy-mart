import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { By } from '@angular/platform-browser';
import { signal } from '@angular/core';

import { ProductStoreService } from '../../shared/services/product-signal-store.service';
import { WishListService } from '../../shared/services/wish-list.service';
import { Product } from '../../shared/models/product.model';
import ProductsComponent from './products.component';

@Component({
  selector: 'app-product-card',
  standalone: false,
  template:
    '<div>{{ product?.title }}</div><button (click)="toggleWishlist.emit(product)">Toggle</button>',
})
class MockProductCardComponent {
  @Input() product!: Product;
  @Input() inWishlist = false;
  @Output() toggleWishlist = new EventEmitter<Product>();
}

describe('ProductsComponent', () => {
  let fixture: ComponentFixture<ProductsComponent>;

  const mockProducts: Product[] = [
    {
      id: 1,
      title: 'Test Product',
      category: 'Test Category',
      price: 10,
      image: 'test.jpg',
      description: '',
      rating: { rate: 0, count: 0 },
    },
  ];

  const mockStore: Partial<ProductStoreService> = {
    products: signal(mockProducts),
    loading: signal(false),
    errorMessage: signal(''),
  };

  const mockWishlist: Partial<WishListService> = {
    wishlist: signal([]),
    isInWishlist: jest.fn().mockReturnValue(false),
    toggle: jest.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ProductsComponent, MockProductCardComponent],
      providers: [
        { provide: ProductStoreService, useValue: mockStore },
        { provide: WishListService, useValue: mockWishlist },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductsComponent);
    fixture.detectChanges();
  });

  it('should render product title from mock product', () => {
    const cardText = fixture.nativeElement.textContent;
    expect(cardText).toContain('Test Product');
  });

  it('should call toggleWishlist when event is emitted from card', () => {
    const cardDebugEl = fixture.debugElement.query(By.directive(MockProductCardComponent));
    const cardInstance = cardDebugEl.componentInstance as MockProductCardComponent;

    cardInstance.toggleWishlist.emit(mockProducts[0]);

    expect(mockWishlist.toggle).toHaveBeenCalledWith(mockProducts[0]);
  });
});
