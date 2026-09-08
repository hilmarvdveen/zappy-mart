import { Component, inject } from '@angular/core';
import { WishListDrawerService } from '../wish-list-drawer/wish-list-drawer.service';
import ProductsComponent from '../products/products.component';
import { WishListDrawerComponent } from '../wish-list-drawer/wish-list-drawer.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  imports: [ProductsComponent, WishListDrawerComponent],
})
export class HomeComponent {
  private readonly wishListDrawerService = inject(WishListDrawerService);

  public readonly isOpen = this.wishListDrawerService.isOpen;
}
