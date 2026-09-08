import { Component, inject } from '@angular/core';
import { isActive, Router, RouterLink } from '@angular/router';
import { WishListDrawerService } from '../wish-list-drawer/wish-list-drawer.service';
import { WishListService } from '../../shared/services/wish-list.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  imports: [RouterLink],
})
export default class HeaderComponent {
  private readonly router = inject(Router);
  private readonly wishListDrawerService = inject(WishListDrawerService);

  readonly count = inject(WishListService).count;

  readonly menuLinks = [{ path: '/over-ons', label: 'Over ons' }].map((menuLink) => ({
    ...menuLink,
    isActive: isActive(menuLink.path, this.router),
  }));

  openDrawer(): void {
    this.wishListDrawerService.toggle();
  }
}
