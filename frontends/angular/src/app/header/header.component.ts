import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { WishListDrawerService } from '../wish-list-drawer/wish-list-drawer.service';
import { WishListService } from '../../shared/services/wish-list.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  standalone: false,
})
export default class HeaderComponent {
  menuLinks = [
    { path: '/over-ons', label: 'Over ons' },
  ];

  public readonly count;

  constructor(
    private readonly router: Router,
    private readonly wishListDrawerService: WishListDrawerService,
    private readonly wishListService: WishListService
  ) {
    this.count = this.wishListService.count;
  }

  isActive(path: string): boolean {
    return this.router.url === path;
  }

  openDrawer() {
    this.wishListDrawerService.toggle();
  }
}
