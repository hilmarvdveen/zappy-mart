import { initGraphQLTada } from "gql.tada";
import type { introspection } from "./graphqlEnvironment";

export const graphql = initGraphQLTada<{
  introspection: introspection;
  disableMasking: true;
  scalars: {
    ID: string;
    DateTime: string;
  };
}>();

export type { ResultOf, VariablesOf } from "gql.tada";
