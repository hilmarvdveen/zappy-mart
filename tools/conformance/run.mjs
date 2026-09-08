import { createClient } from "./client.mjs";
import {
  documentFailures,
  expectedLoadedProducts,
  readContractSchema,
  readScenarios,
  resetSeedName,
  resetSeedSource,
} from "./documents.mjs";
import {
  capturedValuesFrom,
  findDifferences,
  resolveVariables,
} from "./placeholders.mjs";

export const defaultOrigin = "http://localhost:5173";

export const usage =
  "Usage: node run.mjs --url <graphql url> [--origin <origin>]";

const scenariosWithoutOriginHeader = new Set(["mutation-without-origin"]);
const scenariosReplayingTheRefreshCookie = new Set([
  "refresh-session-replayed",
]);

export function parseCommandLine(commandLineArguments) {
  let url = null;
  let origin = defaultOrigin;
  let position = 0;
  while (position < commandLineArguments.length) {
    const argument = commandLineArguments[position];
    const value = commandLineArguments[position + 1];
    if (argument === "--url" || argument === "--origin") {
      if (value === undefined || value.startsWith("--")) {
        throw new Error(`${argument} needs a value. ${usage}`);
      }
      if (argument === "--url") {
        url = value;
      } else {
        origin = value;
      }
      position += 2;
      continue;
    }
    throw new Error(`${argument} is not an argument this runner takes. ${usage}`);
  }
  if (url === null) {
    throw new Error(`The backend url is missing. ${usage}`);
  }
  return { url, origin };
}

function formatValue(value) {
  return value === undefined ? "nothing" : JSON.stringify(value);
}

function differenceLines(differences) {
  return differences.flatMap((difference) => [
    `      ${difference.path}: ${difference.reason}`,
    `        expected ${formatValue(difference.expected)}`,
    `        answered ${formatValue(difference.actual)}`,
  ]);
}

function endsTheSession(data) {
  return data?.logout?.success === true;
}

function scenarioLine(position, total, name, outcome) {
  const counter = `${String(position).padStart(String(total).length, " ")}/${total}`;
  return `  ${counter}  ${name.padEnd(32, " ")}${outcome}`;
}

export async function runConformance({
  url,
  origin = defaultOrigin,
  contractDirectory,
  fetchImplementation,
  write = (line) => process.stdout.write(`${line}\n`),
}) {
  const schema = await readContractSchema(contractDirectory);
  const scenarios = await readScenarios(contractDirectory);
  const failures = documentFailures(schema, [
    { name: resetSeedName, source: resetSeedSource },
    ...scenarios,
  ]);
  if (failures.length > 0) {
    for (const failure of failures) {
      write(`${failure.name} does not match the schema`);
      for (const message of failure.messages) {
        write(`      ${message}`);
      }
    }
    write(`${failures.length} documents do not match the schema, nothing ran`);
    return { exitCode: 1, matched: 0, total: scenarios.length };
  }
  write(
    `${scenarios.length + 1} documents match contract/schema.graphql and contract/schema.development.graphql`,
  );

  const client = createClient({ url, origin, fetchImplementation });
  const reset = await client.send({ source: resetSeedSource, variables: {} });
  const resetDifferences = findDifferences(
    {
      data: {
        resetSeed: {
          success: true,
          loadedProducts: expectedLoadedProducts,
          errors: [],
        },
      },
      errors: [],
    },
    reset.answer,
    "resetSeed",
  );
  if (resetDifferences.length > 0) {
    write("the seed did not load, so no scenario ran");
    for (const line of differenceLines(resetDifferences)) {
      write(line);
    }
    return { exitCode: 1, matched: 0, total: scenarios.length };
  }
  write(`seed loaded, ${expectedLoadedProducts} products`);

  let capturedValues = {};
  let matched = 0;
  for (const [index, scenario] of scenarios.entries()) {
    const position = index + 1;
    let answer;
    try {
      const variables = resolveVariables(scenario.variables, capturedValues);
      ({ answer } = await client.send({
        source: scenario.source,
        variables,
        includeOrigin: !scenariosWithoutOriginHeader.has(scenario.name),
        replayPreviousRefreshCookie: scenariosReplayingTheRefreshCookie.has(
          scenario.name,
        ),
      }));
    } catch (error) {
      write(
        scenarioLine(position, scenarios.length, scenario.name, "could not run"),
      );
      write(`      ${error.message}`);
      write(
        `${matched} of ${scenarios.length} scenarios matched, ${scenario.name} could not run`,
      );
      return { exitCode: 1, matched, total: scenarios.length };
    }
    const differences = findDifferences(scenario.expected, answer);
    if (differences.length > 0) {
      write(scenarioLine(position, scenarios.length, scenario.name, "differs"));
      for (const line of differenceLines(differences)) {
        write(line);
      }
      write(
        `${matched} of ${scenarios.length} scenarios matched, ${scenario.name} differs from contract/expected/${scenario.name}.json`,
      );
      return { exitCode: 1, matched, total: scenarios.length };
    }
    matched += 1;
    write(scenarioLine(position, scenarios.length, scenario.name, "matches"));
    const nextValues = capturedValuesFrom(answer.data, capturedValues);
    if (endsTheSession(answer.data)) {
      client.forgetSession();
      delete nextValues.accessToken;
    } else if (nextValues.accessToken !== undefined) {
      client.useAccessToken(nextValues.accessToken);
    }
    capturedValues = nextValues;
  }
  write(`${matched} of ${scenarios.length} scenarios matched contract/expected`);
  return { exitCode: 0, matched, total: scenarios.length };
}

if (import.meta.main) {
  try {
    const { url, origin } = parseCommandLine(process.argv.slice(2));
    const result = await runConformance({ url, origin });
    process.exitCode = result.exitCode;
  } catch (error) {
    process.stdout.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
