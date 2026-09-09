import type { CodegenConfig } from "@graphql-codegen/cli";

const codegenConfiguration: CodegenConfig = {
  schema: "../../contract/schema.graphql",
  documents: ["graphql/operations.ts"],
  ignoreNoDocuments: false,
  generates: {
    "graphql/generated/": {
      preset: "client",
      presetConfig: {
        fragmentMasking: false,
      },
      config: {
        useTypeImports: true,
        enumsAsConst: true,
        scalars: {
          DateTime: "string",
          ID: "string",
        },
      },
    },
  },
};

export default codegenConfiguration;
