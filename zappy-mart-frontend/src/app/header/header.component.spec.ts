import { ComponentFixture, TestBed } from '@angular/core/testing';
import HeaderComponent from './header.component';
import { RouterTestingModule } from '@angular/router/testing';
import { WishListDrawerService } from '../wish-list-drawer/wish-list-drawer.service';
import { WishListService } from '../../shared/services/wish-list.service';
import { Component, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';

describe('HeaderComponent', () => {
  let fixture: ComponentFixture<HeaderComponent>;
  let mockDrawerService: Partial<WishListDrawerService>;
  let mockWishListService: Partial<WishListService>;

  beforeEach(async () => {
    mockDrawerService = {
      toggle: jest.fn(),
    };

    mockWishListService = {
      count: signal(3),
    };

    await TestBed.configureTestingModule({
      declarations: [HeaderComponent, DummyComponent],
      imports: [RouterTestingModule.withRoutes([{ path: 'over-ons', component: DummyComponent }])],
      providers: [
        { provide: WishListDrawerService, useValue: mockDrawerService },
        { provide: WishListService, useValue: mockWishListService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
  });

  it('should render all menu links', () => {
    const links = fixture.debugElement.queryAll(By.css('.desktop-navbar__link'));
    expect(links.length).toBe(1);
    expect(links[0].nativeElement.textContent.trim()).toBe('Over ons');
  });

  it('should set the correct active link', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/over-ons');
    fixture.detectChanges();

    const activeItem = fixture.debugElement.query(By.css('[data-active="true"]'));
    expect(activeItem?.nativeElement.textContent).toContain('Over ons');
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

@Component({
  selector: 'app-dummy',
  template: '<p>Dummy</p>',
  standalone: false,
})
class DummyComponent {}
