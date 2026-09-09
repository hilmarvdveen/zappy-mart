import { httpResource, HttpResourceRef } from '@angular/common/http';
import { inject } from '@angular/core';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { print } from 'graphql';
import { AccessTokenStore } from './access-token-store';
import { accessTokenHeader } from './access-token-header';
import { readGraphqlData } from './graphql-answer';
import { GRAPHQL_URL } from './graphql-url';

export function graphqlResource<TResult, TVariables>(
  document: TypedDocumentNode<TResult, TVariables>,
  variables: () => TVariables | undefined
): HttpResourceRef<TResult | undefined> {
  const graphqlUrl = inject(GRAPHQL_URL);
  const accessTokenStore = inject(AccessTokenStore);
  const query = print(document);

  return httpResource<TResult>(
    () => {
      const currentVariables = variables();

      if (currentVariables === undefined) {
        return undefined;
      }

      return {
        url: graphqlUrl,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...accessTokenHeader(accessTokenStore.token()),
        },
        body: { query, variables: currentVariables },
      };
    },
    { parse: (answer) => readGraphqlData<TResult>(answer) }
  );
}
