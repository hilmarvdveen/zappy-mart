import type { CodegenConfig } from '@graphql-codegen/cli';

const configuration: CodegenConfig = {
  schema: '../../contract/schema.graphql',
  documents: ['src/app/api/operations/*.graphql'],
  ignoreNoDocuments: false,
  generates: {
    'src/app/api/generated/contract.ts': {
      plugins: ['typescript-operations', 'typed-document-node'],
      config: {
        useTypeImports: true,
        skipTypename: true,
        enumsAsTypes: true,
        dedupeFragments: true,
        strictScalars: true,
        avoidOptionals: { field: true },
        scalars: { DateTime: 'string' },
      },
    },
  },
};

export default configuration;
