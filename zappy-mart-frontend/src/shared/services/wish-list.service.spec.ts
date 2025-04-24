import { WishListService } from './wish-list.service';
import { Product } from '../models/product.model';
import { LocalStorageService } from './local-storage.service';

describe('WishListService', () => {
  let service: WishListService;
  let storage: jest.Mocked<LocalStorageService>;

  const mockProduct: Product = {
    id: 1,
    title: 'Mock Product',
    price: 10,
    category: 'mock',
    image: 'mock.jpg',
    description: '',
    rating: { rate: 4.5, count: 10 },
  };

  beforeEach(() => {
    storage = {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<LocalStorageService>;

    service = new WishListService(storage);
  });

  it('should initialize with items from local storage', () => {
    storage.get.mockReturnValueOnce([mockProduct]);
    const initializedService = new WishListService(storage);
    expect(initializedService.wishlist()).toEqual([mockProduct]);
  });

  it('should add product to wishlist', () => {
    service.add(mockProduct);
    expect(service.wishlist()).toContainEqual(mockProduct);
    expect(storage.set).toHaveBeenCalledWith('wishlist', [mockProduct]);
  });

  it('should not add product if already in wishlist', () => {
    service.add(mockProduct);
    expect(service.wishlist()).toEqual([mockProduct]);
  });

  it('should remove product from wishlist', () => {
    service.add(mockProduct);
    service.remove(mockProduct.id);
    expect(service.wishlist()).not.toContainEqual(mockProduct);
    expect(storage.set).toHaveBeenCalledWith('wishlist', []);
  });

  it('should toggle: add when not present', () => {
    service.toggle(mockProduct);
    expect(service.wishlist()).toContainEqual(mockProduct);
  });

  it('should toggle: remove when already present', () => {
    service.add(mockProduct);
    service.toggle(mockProduct);
    expect(service.wishlist()).not.toContainEqual(mockProduct);
  });

  it('should clear the wishlist', () => {
    service.add(mockProduct);
    service.clear();
    expect(service.wishlist()).toEqual([]);
    expect(storage.remove).toHaveBeenCalledWith('wishlist');
  });

  it('should return true if product is in wishlist', () => {
    service.add(mockProduct);
    expect(service.isInWishlist(mockProduct)).toBe(true);
  });

  it('should return false if product is not in wishlist', () => {
    expect(service.isInWishlist(mockProduct)).toBe(false);
  });

  it('should compute the correct count', () => {
    expect(service.count()).toBe(0);
    service.add(mockProduct);
    expect(service.count()).toBe(1);
  });
});
