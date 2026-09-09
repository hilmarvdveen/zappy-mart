import { TestBed } from '@angular/core/testing';
import { AccessTokenStore } from './access-token-store';

describe('AccessTokenStore', () => {
  let store: AccessTokenStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(AccessTokenStore);
  });

  it('starts with no token, because the token lives in memory only', () => {
    expect(store.token()).toBeNull();
    expect(store.signedIn()).toBe(false);
  });

  it('holds the token and its expiry', () => {
    store.hold('access-token', '2026-09-09T10:15:00Z');

    expect(store.token()).toBe('access-token');
    expect(store.signedIn()).toBe(true);
  });

  it('releases the token', () => {
    store.hold('access-token', '2026-09-09T10:15:00Z');
    store.release();

    expect(store.token()).toBeNull();
    expect(store.signedIn()).toBe(false);
  });

  it('calls a token about to expire half a minute before the moment it stops being accepted', () => {
    store.hold('access-token', '2026-09-09T10:15:00Z');

    expect(store.aboutToExpire(Date.parse('2026-09-09T10:14:00Z'))).toBe(false);
    expect(store.aboutToExpire(Date.parse('2026-09-09T10:14:30Z'))).toBe(true);
    expect(store.aboutToExpire(Date.parse('2026-09-09T10:16:00Z'))).toBe(true);
  });

  it('never calls a token about to expire when it holds none', () => {
    expect(store.aboutToExpire()).toBe(false);
  });
});
