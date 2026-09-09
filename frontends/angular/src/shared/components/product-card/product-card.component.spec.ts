import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { ProductSummaryFragment } from '../../../app/api/generated/contract';
import ProductCardComponent from './product-card.component';

describe('ProductCardComponent', () => {
  let component: ProductCardComponent;
  let fixture: ComponentFixture<ProductCardComponent>;
  let mockProduct: ProductSummaryFragment;

  beforeEach(() => {
    mockProduct = {
      id: 'product-03',
      name: 'Mens Cotton Jacket',
      slug: 'mens-cotton-jacket',
      stock: 8,
      imageUrl: '/images/products/mens-cotton-jacket.svg',
      price: { amount: 4250, currency: 'EUR' },
      category: { id: 'category-mens-clothing', name: "Men's clothing", slug: 'mens-clothing' },
    };

    TestBed.configureTestingModule({
      imports: [ProductCardComponent],
      providers: [provideRouter([])],
    });

    fixture = TestBed.createComponent(ProductCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('product', mockProduct);
    fixture.detectChanges();
  });

  it.each([
    ['.card__title', 'Mens Cotton Jacket'],
    ['.card__price', '€42.50'],
    ['.card__category', "Men's clothing"],
    ['.card__stock', '8 in stock'],
  ])('should render %s with correct content', (selector: string, expected: string) => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector(selector)?.textContent).toContain(expected);
  });

  it('should render product image with correct src', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.product-image')?.getAttribute('src')).toBe(
      '/images/products/mens-cotton-jacket.svg'
    );
  });

  it('should link to the product page', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.card__link')?.getAttribute('href')).toBe(
      '/product/mens-cotton-jacket'
    );
  });

  it('should show "Save to wishlist" when inWishlist is false', () => {
    fixture.componentRef.setInput('inWishlist', false);
    fixture.detectChanges();

    const button = fixture.debugElement.query(By.css('.card__action-wish-list'));
    expect(button.nativeElement.textContent).toContain('Save to wishlist');
  });

  it('should show "Remove from wishlist" when inWishlist is true', () => {
    fixture.componentRef.setInput('inWishlist', true);
    fixture.detectChanges();

    const button = fixture.debugElement.query(By.css('.card__action-wish-list'));
    expect(button.nativeElement.textContent).toContain('Remove from wishlist');
  });

  it('should emit toggleWishlist event when the wishlist button is clicked', () => {
    const emitted: ProductSummaryFragment[] = [];
    component.toggleWishlist.subscribe((product) => emitted.push(product));

    fixture.debugElement.query(By.css('.card__action-wish-list')).nativeElement.click();

    expect(emitted).toEqual([mockProduct]);
  });

  it('should emit addToCart event when the cart button is clicked', () => {
    const emitted: ProductSummaryFragment[] = [];
    component.addToCart.subscribe((product) => emitted.push(product));

    fixture.debugElement.query(By.css('.card__action')).nativeElement.click();

    expect(emitted).toEqual([mockProduct]);
  });

  it('should disable the cart button when the product has no stock', () => {
    fixture.componentRef.setInput('product', { ...mockProduct, stock: 0 });
    fixture.detectChanges();

    const button = fixture.debugElement.query(By.css('.card__action'));
    expect(button.nativeElement.disabled).toBe(true);
  });
});
