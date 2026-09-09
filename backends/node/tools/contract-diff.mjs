import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildSchema,
  isEnumType,
  isInputObjectType,
  isInterfaceType,
  isObjectType,
  isUnionType,
  printType
} from "graphql";
import { Supergraph } from "@apollo/federation-internals";
import { composeSupergraph } from "./compose.mjs";

function findRepositoryRoot() {
  let directory = dirname(fileURLToPath(import.meta.url));
  while (!existsSync(join(directory, "contract", "schema.graphql"))) {
    const parent = resolve(directory, "..");
    if (parent === directory) {
      throw new Error("No folder above this file holds contract/schema.graphql");
    }
    directory = parent;
  }
  return directory;
}

const repositoryRoot = findRepositoryRoot();

function readContractSchema(profile) {
  const store = readFileSync(join(repositoryRoot, "contract", "schema.graphql"), "utf8");
  if (profile === "production") {
    return store;
  }
  const development = readFileSync(join(repositoryRoot, "contract", "schema.development.graphql"), "utf8");
  return store + "\n\n" + development;
}

function apiSchemaOf(supergraphSdl) {
  return Supergraph.build(supergraphSdl).apiSchema().toGraphQLJSSchema();
}

function kindNameOf(type) {
  if (isInputObjectType(type)) {
    return "input";
  }
  return isInterfaceType(type) ? "interface" : "object";
}

function printDefault(value) {
  return value === undefined ? null : JSON.stringify(value);
}

function describeArguments(field) {
  const argumentShapes = {};
  for (const argument of field.args ?? []) {
    argumentShapes[argument.name] = {
      type: String(argument.type),
      defaultValue: printDefault(argument.defaultValue)
    };
  }
  return argumentShapes;
}

function describeFields(type) {
  const fields = {};
  for (const field of Object.values(type.getFields())) {
    fields[field.name] = {
      type: String(field.type),
      arguments: describeArguments(field),
      defaultValue: printDefault(field.defaultValue)
    };
  }
  return { kind: kindNameOf(type), fields };
}

function shapeOf(schema) {
  const shape = new Map();
  for (const type of Object.values(schema.getTypeMap())) {
    if (type.name.startsWith("__")) {
      continue;
    }
    if (isObjectType(type) || isInterfaceType(type) || isInputObjectType(type)) {
      shape.set(type.name, describeFields(type));
      continue;
    }
    if (isEnumType(type)) {
      shape.set(type.name, {
        kind: "enum",
        values: type.getValues().map((value) => value.name).sort()
      });
      continue;
    }
    if (isUnionType(type)) {
      shape.set(type.name, {
        kind: "union",
        members: type.getTypes().map((member) => member.name).sort()
      });
      continue;
    }
    shape.set(type.name, { kind: "scalar" });
  }
  return shape;
}

function compareLists(differences, label, expected, actual) {
  for (const value of expected) {
    if (!actual.includes(value)) {
      differences.push(label + " is missing " + value);
    }
  }
  for (const value of actual) {
    if (!expected.includes(value)) {
      differences.push(label + " adds " + value + ", which the contract does not have");
    }
  }
}

function compareArguments(differences, label, expected, actual) {
  for (const [argumentName, expectedArgument] of Object.entries(expected)) {
    const actualArgument = actual[argumentName];
    if (actualArgument === undefined) {
      differences.push(label + "(" + argumentName + ") is missing from the composed graph");
      continue;
    }
    if (expectedArgument.type !== actualArgument.type) {
      differences.push(
        label + "(" + argumentName + ") is " + expectedArgument.type + " in the contract and " +
          actualArgument.type + " in the graph"
      );
    }
    if (expectedArgument.defaultValue !== actualArgument.defaultValue) {
      differences.push(
        label + "(" + argumentName + ") defaults to " + expectedArgument.defaultValue +
          " in the contract and " + actualArgument.defaultValue + " in the graph"
      );
    }
  }
  for (const argumentName of Object.keys(actual)) {
    if (expected[argumentName] === undefined) {
      differences.push(label + "(" + argumentName + ") is in the composed graph and not in the contract");
    }
  }
}

function compareFields(differences, typeName, expected, actual) {
  for (const [fieldName, expectedField] of Object.entries(expected)) {
    const actualField = actual[fieldName];
    const label = typeName + "." + fieldName;
    if (actualField === undefined) {
      differences.push(label + " is missing from the composed graph");
      continue;
    }
    if (expectedField.type !== actualField.type) {
      differences.push(
        label + " is " + expectedField.type + " in the contract and " + actualField.type + " in the graph"
      );
    }
    if (expectedField.defaultValue !== actualField.defaultValue) {
      differences.push(
        label + " defaults to " + expectedField.defaultValue + " in the contract and " +
          actualField.defaultValue + " in the graph"
      );
    }
    compareArguments(differences, label, expectedField.arguments, actualField.arguments);
  }
  for (const fieldName of Object.keys(actual)) {
    if (expected[fieldName] === undefined) {
      differences.push(typeName + "." + fieldName + " is in the composed graph and not in the contract");
    }
  }
}

function compareShapes(expected, actual) {
  const differences = [];
  for (const [typeName, expectedType] of expected) {
    const actualType = actual.get(typeName);
    if (actualType === undefined) {
      differences.push("the composed graph is missing the type " + typeName);
      continue;
    }
    if (expectedType.kind !== actualType.kind) {
      differences.push(
        typeName + " is a " + expectedType.kind + " in the contract and a " + actualType.kind + " in the graph"
      );
      continue;
    }
    if (expectedType.kind === "enum") {
      compareLists(differences, typeName + " values", expectedType.values, actualType.values);
      continue;
    }
    if (expectedType.kind === "union") {
      compareLists(differences, typeName + " members", expectedType.members, actualType.members);
      continue;
    }
    if (expectedType.fields !== undefined) {
      compareFields(differences, typeName, expectedType.fields, actualType.fields);
    }
  }
  for (const typeName of actual.keys()) {
    if (!expected.has(typeName)) {
      differences.push("the composed graph adds the type " + typeName + ", which the contract does not have");
    }
  }
  return differences;
}

export function differencesWithContract(profile) {
  const contractSchema = buildSchema(readContractSchema(profile), { assumeValidSDL: true });
  const composedSchema = apiSchemaOf(composeSupergraph(profile));
  return compareShapes(shapeOf(contractSchema), shapeOf(composedSchema));
}

export function printedApiSchema(profile) {
  const schema = apiSchemaOf(composeSupergraph(profile));
  return Object.values(schema.getTypeMap())
    .filter((type) => !type.name.startsWith("__"))
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((type) => printType(type))
    .join("\n\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let failed = false;
  for (const profile of ["production", "development"]) {
    const differences = differencesWithContract(profile);
    if (differences.length === 0) {
      console.log("the " + profile + " graph matches the contract");
      continue;
    }
    failed = true;
    console.error("the " + profile + " graph differs from the contract in " + differences.length + " places:");
    for (const difference of differences) {
      console.error("  " + difference);
    }
  }
  process.exitCode = failed ? 1 : 0;
}
