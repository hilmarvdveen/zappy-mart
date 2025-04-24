import { Component } from '@angular/core';
import { WishListDrawerService } from './wish-list-drawer.service';
import { WishListService } from '../../shared/services/wish-list.service';

@Component({
  selector: 'app-wish-list-drawer',
  templateUrl: './wish-list-drawer.component.html',
  styleUrl: './wish-list-drawer.component.scss',
  standalone: false,
})
export class WishListDrawerComponent {
  public readonly isOpen;
  public readonly wishlist;

  constructor(
    private readonly wishListDrawerService: WishListDrawerService,
    private readonly wishlistService: WishListService
  ) {
    this.isOpen = this.wishListDrawerService.isOpen;
    this.wishlist = this.wishlistService.wishlist;
  }

  closeDrawer() {
    this.wishListDrawerService.close();
  }
}
