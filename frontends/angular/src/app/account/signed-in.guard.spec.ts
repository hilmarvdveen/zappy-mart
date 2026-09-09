import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
  type ActivatedRouteSnapshot,
} from '@angular/router';
import { SessionService } from './session.service';
import { signedInGuard } from './signed-in.guard';

describe('signedInGuard', () => {
  let signedIn: ReturnType<typeof signal<boolean>>;

  function guardFor(url: string): boolean | UrlTree {
    return TestBed.runInInjectionContext(
      () =>
        signedInGuard(
          {} as ActivatedRouteSnapshot,
          { url } as RouterStateSnapshot
        ) as boolean | UrlTree
    );
  }

  beforeEach(() => {
    signedIn = signal(false);

    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: SessionService, useValue: { signedIn } }],
    });
  });

  it('lets a signed in customer through', () => {
    signedIn.set(true);

    expect(guardFor('/checkout')).toBe(true);
  });

  it('sends an anonymous visitor to the login screen with the way back', () => {
    const answer = guardFor('/checkout');

    expect(TestBed.inject(Router).serializeUrl(answer as UrlTree)).toBe(
      '/login?returnTo=%2Fcheckout'
    );
  });
});
