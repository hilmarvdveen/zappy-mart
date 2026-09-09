import { Component, computed, inject } from '@angular/core';
import { isActive, Router, RouterLink } from '@angular/router';
import { WishlistService } from '../../shared/services/wishlist.service';
import { CartService } from '../cart/cart.service';
import { WishlistDrawerService } from '../wishlist-drawer/wishlist-drawer.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  imports: [RouterLink],
})
export default class HeaderComponent {
  private readonly router = inject(Router);
  private readonly wishlistDrawerService = inject(WishlistDrawerService);

  readonly count = inject(WishlistService).count;
  readonly itemCount = inject(CartService).itemCount;

  readonly cartLabel = computed(
    () => `Cart, ${this.itemCount()} ${this.itemCount() === 1 ? 'item' : 'items'}`
  );
  readonly wishlistLabel = computed(() => `Wishlist, ${this.count()}`);

  readonly menuLinks = [
    { path: '/', label: 'Catalogue' },
    { path: '/about', label: 'About' },
  ].map((menuLink) => ({
    ...menuLink,
    isActive: isActive(menuLink.path, this.router, {
      paths: 'exact',
      queryParams: 'ignored',
      fragment: 'ignored',
      matrixParams: 'ignored',
    }),
  }));

  openDrawer(): void {
    this.wishlistDrawerService.toggle();
  }
}
