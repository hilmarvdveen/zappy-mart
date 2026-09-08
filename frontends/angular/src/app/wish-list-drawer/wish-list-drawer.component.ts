import { Component, inject } from '@angular/core';
import { WishListDrawerService } from './wish-list-drawer.service';
import { WishListService } from '../../shared/services/wish-list.service';

@Component({
  selector: 'app-wish-list-drawer',
  templateUrl: './wish-list-drawer.component.html',
  styleUrl: './wish-list-drawer.component.scss',
})
export class WishListDrawerComponent {
  private readonly wishListDrawerService = inject(WishListDrawerService);
  private readonly wishlistService = inject(WishListService);

  public readonly isOpen = this.wishListDrawerService.isOpen;
  public readonly wishlist = this.wishlistService.wishlist;

  closeDrawer() {
    this.wishListDrawerService.close();
  }
}
