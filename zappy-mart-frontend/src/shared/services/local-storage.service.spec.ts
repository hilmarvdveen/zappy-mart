import { LocalStorageService } from "./local-storage.service";


describe('LocalStorageService', () => {
  let service: LocalStorageService;

  beforeEach(() => {
    service = new LocalStorageService();
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('should store and retrieve an object', () => {
    const data = { id: 1, name: 'Test' };
    service.set('testKey', data);
    const result = service.get<typeof data>('testKey');
    expect(result).toEqual(data);
  });

  it('should return null if key does not exist', () => {
    const result = service.get('nonexistent');
    expect(result).toBeNull();
  });

  it('should handle invalid JSON on get', () => {
    localStorage.setItem('bad', 'not-json');
    const result = service.get('bad');
    expect(result).toBeNull();
  });

  it('should remove an item', () => {
    localStorage.setItem('toRemove', JSON.stringify({}));
    service.remove('toRemove');
    expect(localStorage.getItem('toRemove')).toBeNull();
  });

  it('should clear all storage', () => {
    localStorage.setItem('key1', 'value1');
    localStorage.setItem('key2', 'value2');
    service.clear();
    expect(localStorage.length).toBe(0);
  });

  it('should detect if a key exists', () => {
    localStorage.setItem('exists', 'true');
    expect(service.has('exists')).toBe(true);
    expect(service.has('missing')).toBe(false);
  });
});
