import { Component, inject } from '@angular/core';
import { Product } from '../../shared/models/product.model';
import { WishListService } from '../../shared/services/wish-list.service';
import { ProductSignalStoreService } from '../../shared/services/product-signal-store.service';
import ProductCardComponent from '../../shared/components/product-card/product-card.component';

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss',
  imports: [ProductCardComponent],
})
export default class ProductsComponent {
  private readonly productSignalStoreService = inject(ProductSignalStoreService);
  private readonly wishListService = inject(WishListService);

  public readonly products = this.productSignalStoreService.products;
  public readonly loading = this.productSignalStoreService.loading;
  public readonly errorMessage = this.productSignalStoreService.errorMessage;
  public readonly wishList = this.wishListService.wishlist;

  isInWishlist(product: Product): boolean {
    return this.wishListService.isInWishlist(product);
  }

  onToggleWishlist(product: Product): void {
    this.wishListService.toggle(product);
  }
}
