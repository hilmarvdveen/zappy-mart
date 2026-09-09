import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { accessTokenHeader } from './access-token-header';
import { AccessTokenStore } from './access-token-store';
import { withoutAccessToken } from './authentication-context';
import { GRAPHQL_URL } from './graphql-url';
import { SessionRefresher } from './session-refresher';

const unauthorisedStatus = 401;

export const authenticationInterceptor: HttpInterceptorFn = (request, next) => {
  if (request.url !== inject(GRAPHQL_URL)) {
    return next(request);
  }

  const carriesCookies = request.clone({ withCredentials: true });

  if (carriesCookies.context.get(withoutAccessToken)) {
    return next(carriesCookies);
  }

  const accessTokenStore = inject(AccessTokenStore);
  const sessionRefresher = inject(SessionRefresher);
  const sendAgainWithTheNewToken = () =>
    next(carriesCookies.clone({ setHeaders: accessTokenHeader(accessTokenStore.token()) }));

  if (accessTokenStore.aboutToExpire()) {
    return sessionRefresher.refresh().pipe(switchMap(sendAgainWithTheNewToken));
  }

  return next(carriesCookies).pipe(
    catchError((failure: unknown) => {
      if (!(failure instanceof HttpErrorResponse) || failure.status !== unauthorisedStatus) {
        return throwError(() => failure);
      }

      return sessionRefresher
        .refresh()
        .pipe(
          switchMap((refreshed) =>
            refreshed ? sendAgainWithTheNewToken() : throwError(() => failure)
          )
        );
    })
  );
};
