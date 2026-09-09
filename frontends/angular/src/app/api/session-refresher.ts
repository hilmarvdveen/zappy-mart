import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { print } from 'graphql';
import { catchError, finalize, map, Observable, of, shareReplay } from 'rxjs';
import { AccessTokenStore } from './access-token-store';
import { withoutAccessToken } from './authentication-context';
import { RefreshSessionDocument, RefreshSessionMutation } from './generated/contract';
import { GraphqlAnswer } from './graphql-answer';
import { GRAPHQL_URL } from './graphql-url';

@Injectable({ providedIn: 'root' })
export class SessionRefresher {
  private readonly httpClient = inject(HttpClient);
  private readonly graphqlUrl = inject(GRAPHQL_URL);
  private readonly accessTokenStore = inject(AccessTokenStore);

  private runningRefresh: Observable<boolean> | null = null;

  refresh(): Observable<boolean> {
    if (this.runningRefresh === null) {
      this.runningRefresh = this.askForNewAccessToken().pipe(
        finalize(() => {
          this.runningRefresh = null;
        }),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }

    return this.runningRefresh;
  }

  private askForNewAccessToken(): Observable<boolean> {
    return this.httpClient
      .post<GraphqlAnswer<RefreshSessionMutation>>(
        this.graphqlUrl,
        { query: print(RefreshSessionDocument), variables: {} },
        {
          headers: { 'Content-Type': 'application/json' },
          context: new HttpContext().set(withoutAccessToken, true),
          withCredentials: true,
        }
      )
      .pipe(
        map((answer) => this.holdTokenFrom(answer)),
        catchError(() => {
          this.accessTokenStore.release();
          return of(false);
        })
      );
  }

  private holdTokenFrom(answer: GraphqlAnswer<RefreshSessionMutation>): boolean {
    const payload = answer.data?.refreshSession;

    if (payload === undefined || payload.accessToken === null) {
      this.accessTokenStore.release();
      return false;
    }

    this.accessTokenStore.hold(payload.accessToken, payload.accessTokenExpiresAt);
    return true;
  }
}
