import { Component } from '@angular/core';
import { ProductStoreService } from '../../shared/services/product-signal-store.service';
import { Product } from '../../shared/models/product.model';
import { WishListService } from '../../shared/services/wish-list.service';

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss',
  standalone: false,
})
export default class ProductsComponent {
  public readonly products;
  public readonly loading;
  public readonly errorMessage;
  public readonly wishList;

  constructor(
    private readonly productStoreService: ProductStoreService,
    private readonly wishListService: WishListService
  ) {
    this.products = this.productStoreService.products;
    this.loading = this.productStoreService.loading;
    this.errorMessage = this.productStoreService.errorMessage;
    this.wishList = this.wishListService.wishlist;
  }

  isInWishlist(product: Product): boolean {
    return this.wishListService.isInWishlist(product);
  }

  onToggleWishlist(product: Product): void {
    this.wishListService.toggle(product);
  }
}
