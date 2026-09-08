import assert from "node:assert/strict";
import { test } from "node:test";
import {
  documentFailures,
  readContractSchema,
  readScenarios,
  resetSeedName,
  resetSeedSource,
  scenarioOrder,
} from "./documents.mjs";

const schema = await readContractSchema();
const scenarios = await readScenarios();

test("the development schema adds resetSeed to the contract schema", () => {
  const mutationFields = schema.getMutationType().getFields();
  assert.equal("resetSeed" in mutationFields, true);
  assert.equal("placeOrder" in mutationFields, true);
});

test("the scenarios are the ones the order names, in that order", () => {
  assert.equal(scenarios.length, 33);
  assert.deepEqual(
    scenarios.map((scenario) => scenario.name),
    scenarioOrder,
  );
});

test("every scenario has a document, variables and an expected answer", () => {
  for (const scenario of scenarios) {
    assert.equal(scenario.source.length > 0, true, scenario.name);
    assert.equal(typeof scenario.variables, "object", scenario.name);
    assert.equal("data" in scenario.expected, true, scenario.name);
    assert.equal(
      Array.isArray(scenario.expected.errors),
      true,
      scenario.name,
    );
  }
});

test("every document and the reset match the schema", () => {
  const failures = documentFailures(schema, [
    { name: resetSeedName, source: resetSeedSource },
    ...scenarios,
  ]);
  assert.deepEqual(failures, []);
});

test("a field the schema does not have is caught before any request", () => {
  const failures = documentFailures(schema, [
    {
      name: "typo",
      source: "query Typo { produts(first: 5) { totalCount } }",
    },
  ]);
  assert.equal(failures.length, 1);
  assert.equal(failures[0].name, "typo");
  assert.match(failures[0].messages[0], /Cannot query field "produts"/);
});

test("a document that does not parse is caught the same way", () => {
  const failures = documentFailures(schema, [
    { name: "broken", source: "query Broken { products(first: 5 }" },
  ]);
  assert.equal(failures.length, 1);
  assert.equal(failures[0].name, "broken");
});

test("only mutation-without-origin expects a GraphQL error", () => {
  for (const scenario of scenarios) {
    const expectsAnError = scenario.expected.errors.length > 0;
    assert.equal(
      expectsAnError,
      scenario.name === "mutation-without-origin",
      scenario.name,
    );
  }
});
