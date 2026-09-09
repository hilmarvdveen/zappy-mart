import { provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';
import { ApplicationConfig, inject, provideAppInitializer } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { environment } from '../environments/environment';
import { SessionService } from './account/session.service';
import { authenticationInterceptor } from './api/authentication.interceptor';
import { GRAPHQL_URL } from './api/graphql-url';
import { provideStoreApiClient } from './api/store-api-client';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withXhr(), withInterceptors([authenticationInterceptor])),
    { provide: GRAPHQL_URL, useValue: environment.graphqlUrl },
    provideStoreApiClient(),
    provideAppInitializer(() => inject(SessionService).restore()),
  ],
};
