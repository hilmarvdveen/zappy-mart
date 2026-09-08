import { readdir, readFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSchema, extendSchema, parse, validate } from "graphql";

export const contractDirectory = fileURLToPath(
  new URL("../../contract/", import.meta.url),
);

export const scenarioOrder = [
  "catalogue-list",
  "catalogue-filter-by-category",
  "product-by-slug",
  "product-unknown-slug",
  "cart-add",
  "cart-add-again-raises-quantity",
  "cart-add-above-stock",
  "promotion-apply-percentage",
  "promotion-apply-expired",
  "promotion-apply-exhausted",
  "promotion-apply-below-minimum",
  "promotion-replace",
  "promotion-remove",
  "register",
  "register-duplicate-email",
  "login",
  "login-wrong-password",
  "refresh-session",
  "refresh-session-replayed",
  "logout",
  "login-again",
  "login-second-device",
  "revoke-session",
  "logout-again",
  "revoke-session-signed-out",
  "wishlist-add",
  "wishlist-remove",
  "wishlist-merge-on-login",
  "order-place",
  "order-place-empty-cart",
  "orders-list",
  "order-by-id",
  "mutation-without-origin",
];

export const resetSeedName = "reset-seed";

export const resetSeedSource = `mutation ResetSeed {
  resetSeed {
    success
    loadedProducts
    errors {
      code
      field
    }
  }
}
`;

export const expectedLoadedProducts = 20;

export async function readContractSchema(directory = contractDirectory) {
  const schemaSource = await readFile(join(directory, "schema.graphql"), "utf8");
  const developmentSource = await readFile(
    join(directory, "schema.development.graphql"),
    "utf8",
  );
  return extendSchema(buildSchema(schemaSource), parse(developmentSource));
}

async function readJsonFile(path) {
  const contents = await readFile(path, "utf8");
  try {
    return JSON.parse(contents);
  } catch (error) {
    throw new Error(`${path} is not valid JSON: ${error.message}`);
  }
}

function reportOrderMismatch(documentNames) {
  const missingFromOrder = documentNames.filter(
    (name) => !scenarioOrder.includes(name),
  );
  const missingFromFolder = scenarioOrder.filter(
    (name) => !documentNames.includes(name),
  );
  if (missingFromOrder.length > 0) {
    throw new Error(
      `contract/operations holds documents that scenarioOrder in documents.mjs does not name: ${missingFromOrder.join(", ")}`,
    );
  }
  if (missingFromFolder.length > 0) {
    throw new Error(
      `scenarioOrder in documents.mjs names documents that contract/operations does not hold: ${missingFromFolder.join(", ")}`,
    );
  }
}

export async function readScenarios(directory = contractDirectory) {
  const operationsDirectory = join(directory, "operations");
  const expectedDirectory = join(directory, "expected");
  const entries = await readdir(operationsDirectory);
  const documentNames = entries
    .filter((entry) => extname(entry) === ".graphql")
    .map((entry) => basename(entry, ".graphql"));
  reportOrderMismatch(documentNames);
  return Promise.all(
    scenarioOrder.map(async (name) => ({
      name,
      source: await readFile(
        join(operationsDirectory, `${name}.graphql`),
        "utf8",
      ),
      variables: await readJsonFile(join(operationsDirectory, `${name}.json`)),
      expected: await readJsonFile(join(expectedDirectory, `${name}.json`)),
    })),
  );
}

export function documentFailures(schema, documents) {
  const failures = [];
  for (const document of documents) {
    try {
      const errors = validate(schema, parse(document.source));
      if (errors.length > 0) {
        failures.push({
          name: document.name,
          messages: errors.map((error) => error.message),
        });
      }
    } catch (error) {
      failures.push({ name: document.name, messages: [error.message] });
    }
  }
  return failures;
}
