import { ComponentFixture, TestBed } from '@angular/core/testing';
import HeaderComponent from './header.component';
import { WishlistDrawerService } from '../wishlist-drawer/wishlist-drawer.service';
import { WishlistService } from '../../shared/services/wishlist.service';
import { CartService } from '../cart/cart.service';
import { Component, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';

describe('HeaderComponent', () => {
  let fixture: ComponentFixture<HeaderComponent>;
  let mockDrawerService: Partial<WishlistDrawerService>;
  let mockWishlistService: Partial<WishlistService>;
  let mockCartService: Partial<CartService>;

  beforeEach(async () => {
    mockDrawerService = {
      toggle: jest.fn(),
    };

    mockWishlistService = {
      count: signal(3),
    };

    mockCartService = {
      itemCount: signal(2),
    };

    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        provideRouter([{ path: 'about', component: DummyComponent }]),
        { provide: WishlistDrawerService, useValue: mockDrawerService },
        { provide: WishlistService, useValue: mockWishlistService },
        { provide: CartService, useValue: mockCartService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
  });

  it('should render all menu links', () => {
    const links = fixture.debugElement.queryAll(By.css('.desktop-navbar__link'));
    expect(links.length).toBe(2);
    expect(links[0].nativeElement.textContent.trim()).toBe('Catalogue');
    expect(links[1].nativeElement.textContent.trim()).toBe('About');
  });

  it('should set the correct active link', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/about');
    fixture.detectChanges();

    const activeItem = fixture.debugElement.query(By.css('[data-active="true"]'));
    expect(activeItem?.nativeElement.textContent).toContain('About');
  });

  it('should display the wishlist count', () => {
    const badge = fixture.debugElement.query(By.css('.wishlist-count-badge'));
    expect(badge.nativeElement.textContent).toContain('3');
  });

  it('should display the number of items in the cart', () => {
    const badge = fixture.debugElement.query(By.css('.cart-count-badge'));
    expect(badge.nativeElement.textContent).toContain('2');
  });

  it('should call openDrawer when heart button is clicked', () => {
    const button = fixture.debugElement.query(By.css('.desktop-navbar__check-wish-list'));
    button.nativeElement.click();
    expect(mockDrawerService.toggle).toHaveBeenCalled();
  });
});

@Component({
  selector: 'app-dummy',
  template: '<p>Dummy</p>',
})
class DummyComponent {}
