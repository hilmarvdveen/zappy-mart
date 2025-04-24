import { Component } from '@angular/core';
import { ProductStoreService } from '../../shared/services/product-signal-store.service';

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss',
  standalone: false,
})
export default class ProductsComponent {
  readonly products;
  readonly loading;
  readonly errorMessage;

  constructor(public productStoreService: ProductStoreService) {
    this.products = productStoreService.products;
    this.loading = productStoreService.loading;
    this.errorMessage = productStoreService.errorMessage;
  }
}
