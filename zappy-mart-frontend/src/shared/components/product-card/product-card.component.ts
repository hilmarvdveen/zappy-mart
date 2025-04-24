import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Product } from '../../models/product.model';

@Component({
  selector: 'app-product-card',
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.scss',
  standalone: false,
})
export default class ProductCardComponent {
  @Input({ required: true }) product!: Product;
  @Input() inWishlist = false;
  @Output() toggleWishlist = new EventEmitter<Product>();

  onToggleWishlist() {
    this.toggleWishlist.emit(this.product);
  }
}
