import { ComponentFixture, TestBed } from '@angular/core/testing';
import HeaderComponent from './header.component';
import { Router } from '@angular/router';
import { WishListDrawerService } from '../wish-list-drawer/wish-list-drawer.service';
import { WishListService } from '../../shared/services/wish-list.service';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';

describe('HeaderComponent', () => {
  let fixture: ComponentFixture<HeaderComponent>;
  let mockRouter: Partial<Router>;
  let mockDrawerService: Partial<WishListDrawerService>;
  let mockWishListService: Partial<WishListService>;

  beforeEach(async () => {
    mockRouter = {
      url: '/blog',
    };

    mockDrawerService = {
      toggle: jest.fn(),
    };

    mockWishListService = {
      count: signal(3),
    };

    await TestBed.configureTestingModule({
      declarations: [HeaderComponent],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: WishListDrawerService, useValue: mockDrawerService },
        { provide: WishListService, useValue: mockWishListService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
  });

  it('should render all menu links', () => {
    const links = fixture.debugElement.queryAll(By.css('.desktop-navbar__link'));
    expect(links.length).toBe(3);
    expect(links.map((link) => link.nativeElement.textContent.trim())).toEqual([
      'Blog',
      'Over ons',
      'Contact',
    ]);
  });

  it('should set the correct active link', () => {
    const activeItem = fixture.debugElement.query(By.css('[data-active="true"]'));
    expect(activeItem.nativeElement.textContent).toContain('Blog');
  });

  it('should display the wishlist count', () => {
    const badge = fixture.debugElement.query(By.css('.wishlist-count-badge'));
    expect(badge.nativeElement.textContent).toContain('3');
  });

  it('should call openDrawer when heart button is clicked', () => {
    const button = fixture.debugElement.query(By.css('.desktop-navbar__check-wish-list'));
    button.nativeElement.click();
    expect(mockDrawerService.toggle).toHaveBeenCalled();
  });
});
