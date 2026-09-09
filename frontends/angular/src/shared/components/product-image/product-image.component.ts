import { Component, computed, input, signal } from '@angular/core';

export const placeholderImageUrl = '/images/products/placeholder.svg';

export type ProductImageSize = 'small' | 'medium' | 'large';

@Component({
  selector: 'app-product-image',
  template: `<img
    class="product-image"
    [class]="'product-image--' + size()"
    [src]="source()"
    [alt]="alternativeText()"
    (error)="usePlaceholder()"
  />`,
  styleUrl: './product-image.component.scss',
})
export class ProductImageComponent {
  readonly imageUrl = input<string | null>(null);
  readonly name = input.required<string>();
  readonly size = input<ProductImageSize>('medium');
  readonly decorative = input(false);

  private readonly imageMissing = signal(false);

  protected readonly source = computed(() => {
    const url = this.imageUrl();
    return this.imageMissing() || url === null ? placeholderImageUrl : url;
  });

  protected readonly alternativeText = computed(() => (this.decorative() ? '' : this.name()));

  protected usePlaceholder(): void {
    this.imageMissing.set(true);
  }
}
