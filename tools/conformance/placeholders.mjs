const isoUtcSecondPrecision = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

function isNonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}

function isJsonWebToken(value) {
  if (!isNonEmptyString(value)) {
    return false;
  }
  const parts = value.split(".");
  return parts.length === 3 && parts.every((part) => part.length > 0);
}

function isMomentInUtc(value) {
  return (
    isNonEmptyString(value) &&
    isoUtcSecondPrecision.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

const placeholderMatchers = new Map([
  ["@id", isNonEmptyString],
  ["@dateTime", isMomentInUtc],
  ["@token", isJsonWebToken],
  ["@cursor", isNonEmptyString],
]);

export const placeholderNames = [...placeholderMatchers.keys()];

export function isPlaceholder(value) {
  return typeof value === "string" && placeholderMatchers.has(value);
}

export function matchesPlaceholder(placeholder, value) {
  const matcher = placeholderMatchers.get(placeholder);
  if (matcher === undefined) {
    throw new Error(`${placeholder} is not a placeholder this runner knows`);
  }
  return matcher(value);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function findDifferences(expected, actual, path = "answer") {
  if (isPlaceholder(expected)) {
    if (matchesPlaceholder(expected, actual)) {
      return [];
    }
    return [{ path, expected, actual, reason: `no value matching ${expected}` }];
  }
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) {
      return [{ path, expected, actual, reason: "expected a list" }];
    }
    if (expected.length !== actual.length) {
      return [
        {
          path,
          expected: expected.length,
          actual: actual.length,
          reason: "a different number of entries",
        },
      ];
    }
    return expected.flatMap((entry, position) =>
      findDifferences(entry, actual[position], `${path}[${position}]`),
    );
  }
  if (isPlainObject(expected)) {
    if (!isPlainObject(actual)) {
      return [{ path, expected, actual, reason: "expected an object" }];
    }
    const differences = [];
    for (const key of Object.keys(expected)) {
      if (!(key in actual)) {
        differences.push({
          path: `${path}.${key}`,
          expected: expected[key],
          actual: undefined,
          reason: "missing field",
        });
        continue;
      }
      differences.push(
        ...findDifferences(expected[key], actual[key], `${path}.${key}`),
      );
    }
    for (const key of Object.keys(actual)) {
      if (!(key in expected)) {
        differences.push({
          path: `${path}.${key}`,
          expected: undefined,
          actual: actual[key],
          reason: "unexpected field",
        });
      }
    }
    return differences;
  }
  if (Object.is(expected, actual)) {
    return [];
  }
  return [{ path, expected, actual, reason: "a different value" }];
}

function forEachObject(value, visitor, key = "") {
  if (Array.isArray(value)) {
    for (const entry of value) {
      forEachObject(entry, visitor, key);
    }
    return;
  }
  if (!isPlainObject(value)) {
    return;
  }
  visitor(value, key);
  for (const [entryKey, entry] of Object.entries(value)) {
    forEachObject(entry, visitor, entryKey);
  }
}

export function capturedValuesFrom(data, previous = {}) {
  const captured = { ...previous };
  forEachObject(data, (node, key) => {
    if (isNonEmptyString(node.accessToken)) {
      captured.accessToken = node.accessToken;
    }
    if (isNonEmptyString(node.id) && node.current === true) {
      captured.sessionId = node.id;
    }
    if (isNonEmptyString(node.id) && node.current === false) {
      captured.otherSessionId = node.id;
    }
    if (key === "order" && isNonEmptyString(node.id)) {
      captured.orderId = node.id;
    }
  });
  return captured;
}

function isReference(value) {
  return typeof value === "string" && value.startsWith("$");
}

export function resolveVariables(variables, capturedValues) {
  if (isReference(variables)) {
    const name = variables.slice(1);
    const value = capturedValues[name];
    if (value === undefined) {
      throw new Error(
        `No scenario before this one answered with a value for ${variables}`,
      );
    }
    return value;
  }
  if (Array.isArray(variables)) {
    return variables.map((entry) => resolveVariables(entry, capturedValues));
  }
  if (isPlainObject(variables)) {
    return Object.fromEntries(
      Object.entries(variables).map(([key, value]) => [
        key,
        resolveVariables(value, capturedValues),
      ]),
    );
  }
  return variables;
}
