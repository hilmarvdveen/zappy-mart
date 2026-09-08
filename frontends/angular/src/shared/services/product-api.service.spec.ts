import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ProductApiService } from './product-api.service';
import { Product } from '../models/product.model';
import { provideHttpClient } from '@angular/common/http';

describe('ProductApiService', () => {
  let service: ProductApiService;
  let httpMock: HttpTestingController;

  const mockProducts: Product[] = [
    {
      id: 1,
      title: 'Product 1',
      price: 100,
      description: '',
      category: 'test',
      image: '',
      rating: { rate: 4.5, count: 10 },
    },
    {
      id: 2,
      title: 'Product 2',
      price: 200,
      description: '',
      category: 'test',
      image: '',
      rating: { rate: 4.0, count: 5 },
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ProductApiService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(ProductApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch all products', () => {
    service.getAll().subscribe((products) => {
      expect(products.length).toBe(2);
      expect(products).toEqual(mockProducts);
    });

    const pendingRequest = httpMock.expectOne('assets/products.json');
    expect(pendingRequest.request.method).toBe('GET');
    pendingRequest.flush(mockProducts);
  });

  it('should fetch product by ID', () => {
    service.getById(2).subscribe((product) => {
      expect(product).toBeTruthy();
      expect(product?.id).toBe(2);
    });

    const pendingRequest = httpMock.expectOne('assets/products.json');
    expect(pendingRequest.request.method).toBe('GET');
    pendingRequest.flush(mockProducts);
  });

  it('should return undefined for non-existent product ID', () => {
    service.getById(999).subscribe((product) => {
      expect(product).toBeUndefined();
    });

    const pendingRequest = httpMock.expectOne('assets/products.json');
    pendingRequest.flush(mockProducts);
  });
});
