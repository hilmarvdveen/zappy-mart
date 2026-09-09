import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from './session.service';

export const signedInGuard: CanActivateFn = (route, state) => {
  if (inject(SessionService).signedIn()) {
    return true;
  }

  return inject(Router).createUrlTree(['/login'], { queryParams: { returnTo: state.url } });
};
