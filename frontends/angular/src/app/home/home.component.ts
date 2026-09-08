import { Component, Signal } from '@angular/core';
import { WishListDrawerService } from '../wish-list-drawer/wish-list-drawer.service';

@Component({ selector: 'app-home', templateUrl: './home.component.html', standalone: false })
export class HomeComponent {
  public readonly isOpen: Signal<boolean>;

  constructor(private readonly wishListDrawerService: WishListDrawerService) {
    this.isOpen = this.wishListDrawerService.isOpen;
  }
}
