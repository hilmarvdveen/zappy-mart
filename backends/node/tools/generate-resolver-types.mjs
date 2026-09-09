import { writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { generate } from "@graphql-codegen/cli";

const backendFolder = dirname(dirname(fileURLToPath(import.meta.url)));

const mappersPerSubgraph = {
  catalogue: {
    Product: "../adapters/graphql/models.js#ProductModel",
    Category: "../adapters/graphql/models.js#CategoryModel"
  },
  cart: {
    Cart: "../adapters/graphql/models.js#CartModel",
    CartLine: "../adapters/graphql/models.js#CartLineModel",
    Product: "../adapters/graphql/models.js#ProductReferenceModel"
  },
  promotions: {
    Cart: "../adapters/graphql/models.js#CartReferenceModel"
  },
  ordering: {
    Order: "../adapters/graphql/models.js#OrderModel"
  },
  accounts: {
    Customer: "../adapters/graphql/models.js#CustomerModel",
    Session: "../adapters/graphql/models.js#SessionModel",
    Product: "../adapters/graphql/models.js#ProductReferenceModel"
  }
};

const contextTypePerSubgraph = {
  catalogue: "../adapters/graphql/context.js#CatalogueContext",
  cart: "../adapters/graphql/context.js#CartContext",
  promotions: "../adapters/graphql/context.js#PromotionsContext",
  ordering: "../adapters/graphql/context.js#OrderingContext",
  accounts: "../adapters/graphql/context.js#AccountsContext"
};

const federationScalars = {
  DateTime: "string",
  _Any: "Record<string, unknown>",
  _FieldSet: "string",
  federation__FieldSet: "string",
  link__Import: "string",
  link__Purpose: "string"
};

const generates = {};
for (const [name, mappers] of Object.entries(mappersPerSubgraph)) {
  generates[`${backendFolder}/subgraphs/${name}/src/generated/resolvers.ts`] = {
    schema: [
      `${backendFolder}/subgraphs/${name}/schema.graphql`,
      `${backendFolder}/subgraphs/${name}/schema.development.graphql`
    ],
    plugins: ["typescript", "typescript-resolvers"],
    config: {
      federation: true,
      contextType: contextTypePerSubgraph[name],
      mappers,
      scalars: federationScalars,
      strictScalars: true,
      enumsAsTypes: true,
      useTypeImports: true,
      immutableTypes: false,
      skipTypename: true,
      namingConvention: "keep"
    }
  };
}

const wholeLineComment = /^\s*\/\*\*.*\*\/\s*$/;

function withoutComments(source) {
  return source
    .split("\n")
    .filter((line) => !wholeLineComment.test(line))
    .join("\n");
}

const written = await generate({ overwrite: true, generates, errorsOnly: true }, false);
for (const file of written) {
  writeFileSync(file.filename, withoutComments(file.content), "utf8");
  console.log(`generated ${file.filename}`);
}
