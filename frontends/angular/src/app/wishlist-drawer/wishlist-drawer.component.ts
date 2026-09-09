import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductImageComponent } from '../../shared/components/product-image/product-image.component';
import { UserErrorsComponent } from '../../shared/components/user-errors/user-errors.component';
import { MoneyPipe } from '../../shared/money.pipe';
import { WishlistService } from '../../shared/services/wishlist.service';
import { attempt } from '../api/attempt';
import { WishlistDrawerService } from './wishlist-drawer.service';

@Component({
  selector: 'app-wishlist-drawer',
  templateUrl: './wishlist-drawer.component.html',
  styleUrl: './wishlist-drawer.component.scss',
  imports: [RouterLink, MoneyPipe, ProductImageComponent, UserErrorsComponent],
})
export class WishlistDrawerComponent {
  private readonly wishlistDrawerService = inject(WishlistDrawerService);
  private readonly wishlistService = inject(WishlistService);

  protected readonly products = this.wishlistService.products;
  protected readonly problem = signal<string | null>(null);

  protected closeDrawer(): void {
    this.wishlistDrawerService.close();
  }

  protected async remove(productId: string): Promise<void> {
    await attempt(() => this.wishlistService.remove(productId), this.problem);
  }
}
