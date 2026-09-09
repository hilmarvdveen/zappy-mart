import { inject, Provider } from '@angular/core';
import { ApolloLink, InMemoryCache } from '@apollo/client';
import { SetContextLink } from '@apollo/client/link/context';
import { provideApollo } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { accessTokenHeader } from './access-token-header';
import { AccessTokenStore } from './access-token-store';
import { GRAPHQL_URL } from './graphql-url';

export function provideStoreApiClient(): Provider {
  return provideApollo(() => {
    const accessTokenStore = inject(AccessTokenStore);

    const authorisationLink = new SetContextLink((previousContext) => ({
      headers: {
        ...previousContext.headers,
        ...accessTokenHeader(accessTokenStore.token()),
      },
    }));

    return {
      link: ApolloLink.from([authorisationLink, inject(HttpLink).create({ uri: inject(GRAPHQL_URL) })]),
      cache: new InMemoryCache(),
    };
  });
}
