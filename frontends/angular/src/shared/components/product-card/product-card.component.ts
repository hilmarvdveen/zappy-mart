import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductSummaryFragment } from '../../../app/api/generated/contract';
import { MoneyPipe } from '../../money.pipe';
import { ProductImageComponent } from '../product-image/product-image.component';

@Component({
  selector: 'app-product-card',
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.scss',
  imports: [RouterLink, MoneyPipe, ProductImageComponent],
})
export default class ProductCardComponent {
  readonly product = input.required<ProductSummaryFragment>();
  readonly inWishlist = input(false);

  readonly addToCart = output<ProductSummaryFragment>();
  readonly toggleWishlist = output<ProductSummaryFragment>();
}
