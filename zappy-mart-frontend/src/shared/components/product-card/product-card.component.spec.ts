import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Product } from '../../models/product.model';
import { By } from '@angular/platform-browser';
import ProductCardComponent from './product-card.component';

describe('ProductCardComponent', () => {
  let component: ProductCardComponent;
  let fixture: ComponentFixture<ProductCardComponent>;
  let mockProduct: Product;

  beforeEach(() => {
    mockProduct = {
      id: 1,
      title: 'Test Product',
      price: 42.5,
      image: 'test-image.jpg',
      category: 'Test Category',
      description: 'A test product description',
      rating: {
        rate: 0,
        count: 0,
      },
    };

    TestBed.configureTestingModule({
      declarations: [ProductCardComponent],
    });

    fixture = TestBed.createComponent(ProductCardComponent);
    component = fixture.componentInstance;
    component.product = mockProduct;
    fixture.detectChanges();
  });

  it.each([
    ['.card__title', 'Test Product'],
    ['.card__price', '€42.5'],
    ['.card__category', 'Test Category'],
  ])('should render %s with correct content', (selector: string, expected: string) => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector(selector)?.textContent).toContain(expected);
  });

  it('should render product image with correct src', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.card__image')?.getAttribute('src')).toBe('test-image.jpg');
  });

  it('should show "Voeg toe aan favorieten" when inWishlist is false', () => {
    component.inWishlist = false;
    fixture.detectChanges();

    const button = fixture.debugElement.query(By.css('.card__action-wish-list'));
    expect(button.nativeElement.textContent).toContain('Voeg toe aan favorieten');
  });

  it('should show "Verwijder uit favorieten" when inWishlist is true', () => {
    component.inWishlist = true;
    fixture.detectChanges();

    const button = fixture.debugElement.query(By.css('.card__action-wish-list'));
    expect(button.nativeElement.textContent).toContain('Verwijder uit favorieten');
  });

  it('should emit toggleWishlist event when button is clicked', () => {
    fixture.detectChanges();
    jest.spyOn(component.toggleWishlist, 'emit');

    const button = fixture.debugElement.query(By.css('.card__action-wish-list'));
    button.triggerEventHandler('click', null);

    expect(component.toggleWishlist.emit).toHaveBeenCalledWith(component.product);
  });
});
