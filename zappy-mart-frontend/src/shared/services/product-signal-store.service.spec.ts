import { TestBed } from '@angular/core/testing';
import { ProductSignalStoreService } from './product-signal-store.service';
import { ProductApiService } from './product-api.service';
import { of, throwError } from 'rxjs';
import { Product } from '../models/product.model';

const mockProducts: Product[] = [
  {
    id: 1,
    title: 'Test Product',
    category: 'Test Category',
    price: 100,
    image: '',
    description: '',
    rating: { rate: 4, count: 100 },
  },
];

describe('ProductSignalStoreService (Jest)', () => {
  let service: ProductSignalStoreService;
  let productApiService: jest.Mocked<ProductApiService>;

  beforeEach(() => {
    const mockApiService: jest.Mocked<ProductApiService> = {
      getAll: jest.fn(),
    } as unknown as jest.Mocked<ProductApiService>;

    TestBed.configureTestingModule({
      providers: [
        ProductSignalStoreService,
        { provide: ProductApiService, useValue: mockApiService },
      ],
    });

    service = TestBed.inject(ProductSignalStoreService);
    productApiService = TestBed.inject(ProductApiService) as jest.Mocked<ProductApiService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should load products successfully', () => {
    productApiService.getAll.mockReturnValue(of(mockProducts));

    service.load();

    expect(service.products()).toEqual(mockProducts);
    expect(service.hasProducts()).toBe(true);
    expect(service.error()).toBeNull();
  });

  it('should handle errors on load', () => {
    const error = new Error('Failed to load');
    productApiService.getAll.mockReturnValue(throwError(() => error));

    service.load();

    expect(service.products()).toEqual([]);
    expect(service.error()).toBe(error);
    expect(service.errorMessage()).toBe('Failed to load');
  });

  it('should get product by ID', () => {
    productApiService.getAll.mockReturnValue(of(mockProducts));
    service.load();

    expect(service.getById(1)).toEqual(mockProducts[0]);
  });

  it('should filter products by category', () => {
    productApiService.getAll.mockReturnValue(of(mockProducts));
    service.load();

    const filtered = service.filterByCategory('Test Category');
    expect(filtered()).toEqual([mockProducts[0]]);
  });
});
