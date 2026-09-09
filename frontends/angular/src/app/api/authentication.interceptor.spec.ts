import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { AccessTokenStore } from './access-token-store';
import { authenticationInterceptor } from './authentication.interceptor';
import { GRAPHQL_URL } from './graphql-url';

const graphqlUrl = 'http://localhost:4000/graphql';

function refreshAnswer(token: string) {
  return {
    data: {
      refreshSession: {
        customer: null,
        accessToken: token,
        accessTokenExpiresAt: '2030-01-01T00:00:00Z',
        errors: [],
      },
    },
  };
}

describe('authenticationInterceptor', () => {
  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;
  let accessTokenStore: AccessTokenStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authenticationInterceptor])),
        provideHttpClientTesting(),
        { provide: GRAPHQL_URL, useValue: graphqlUrl },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
    accessTokenStore = TestBed.inject(AccessTokenStore);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('leaves a request to another address alone', async () => {
    accessTokenStore.hold('access-token', '2030-01-01T00:00:00Z');

    const answer = firstValueFrom(httpClient.get('/assets/logo.svg'));
    const request = httpTestingController.expectOne('/assets/logo.svg');

    expect(request.request.headers.has('Authorization')).toBe(false);
    expect(request.request.withCredentials).toBe(false);

    request.flush({});
    await answer;
  });

  it('sends the cookies and no bearer token for an anonymous visitor', async () => {
    const answer = firstValueFrom(httpClient.post(graphqlUrl, {}));
    const request = httpTestingController.expectOne(graphqlUrl);

    expect(request.request.withCredentials).toBe(true);
    expect(request.request.headers.has('Authorization')).toBe(false);

    request.flush({ data: {} });
    await answer;
  });

  it('leaves the token the caller put on the request alone while it is valid', async () => {
    accessTokenStore.hold('access-token', '2030-01-01T00:00:00Z');

    const answer = firstValueFrom(
      httpClient.post(graphqlUrl, {}, { headers: { Authorization: 'Bearer access-token' } })
    );
    const request = httpTestingController.expectOne(graphqlUrl);

    expect(request.request.headers.get('Authorization')).toBe('Bearer access-token');

    request.flush({ data: {} });
    await answer;
  });

  it('refreshes through the cookie before sending an expired token', async () => {
    accessTokenStore.hold('old-token', '2020-01-01T00:00:00Z');

    const answer = firstValueFrom(httpClient.post(graphqlUrl, {}));

    const refresh = httpTestingController.expectOne(graphqlUrl);
    expect(refresh.request.headers.has('Authorization')).toBe(false);
    expect(refresh.request.withCredentials).toBe(true);
    refresh.flush(refreshAnswer('fresh-token'));

    const retried = httpTestingController.expectOne(graphqlUrl);
    expect(retried.request.headers.get('Authorization')).toBe('Bearer fresh-token');
    retried.flush({ data: {} });

    await answer;
  });

  it('refreshes through the cookie and sends the request again after a 401', async () => {
    accessTokenStore.hold('old-token', '2030-01-01T00:00:00Z');

    const answer = firstValueFrom(httpClient.post(graphqlUrl, {}));

    httpTestingController
      .expectOne(graphqlUrl)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    httpTestingController.expectOne(graphqlUrl).flush(refreshAnswer('fresh-token'));

    const retried = httpTestingController.expectOne(graphqlUrl);
    expect(retried.request.headers.get('Authorization')).toBe('Bearer fresh-token');
    retried.flush({ data: {} });

    await answer;
    expect(accessTokenStore.token()).toBe('fresh-token');
  });

  it('gives up and forgets the token when the refresh is refused', async () => {
    accessTokenStore.hold('old-token', '2030-01-01T00:00:00Z');

    const answer = firstValueFrom(httpClient.post(graphqlUrl, {}));

    httpTestingController
      .expectOne(graphqlUrl)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    httpTestingController.expectOne(graphqlUrl).flush({
      data: {
        refreshSession: {
          customer: null,
          accessToken: null,
          accessTokenExpiresAt: null,
          errors: [{ code: 'SESSION_INVALID', message: 'Session invalid.', field: null }],
        },
      },
    });

    await expect(answer).rejects.toMatchObject({ status: 401 });
    expect(accessTokenStore.token()).toBeNull();
  });
});
