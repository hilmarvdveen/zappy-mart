export type CookieChanges = Map<string, string | null>;

function attributeSaysTheCookieIsGone(attribute: string): boolean {
  const [name, value] = attribute.split("=", 2);
  const lowercaseName = name?.trim().toLowerCase() ?? "";
  if (lowercaseName === "max-age") {
    return Number.parseInt(value?.trim() ?? "", 10) <= 0;
  }
  if (lowercaseName === "expires") {
    const moment = Date.parse(value?.trim() ?? "");
    return !Number.isNaN(moment) && moment <= Date.now();
  }
  return false;
}

export function readCookieChanges(setCookieHeaders: string[]): CookieChanges {
  const changes: CookieChanges = new Map();
  for (const header of setCookieHeaders) {
    const [pair, ...attributes] = header.split(";");
    if (pair === undefined) {
      continue;
    }
    const separator = pair.indexOf("=");
    if (separator < 0) {
      continue;
    }
    const name = pair.slice(0, separator).trim();
    const value = pair.slice(separator + 1).trim();
    const removed =
      value.length === 0 || attributes.some(attributeSaysTheCookieIsGone);
    changes.set(name, removed ? null : value);
  }
  return changes;
}

export function buildCookieHeader(
  cookies: Record<string, string | null>,
): string | null {
  const pairs = Object.entries(cookies)
    .filter(([, value]) => value !== null && value.length > 0)
    .map(([name, value]) => `${name}=${value}`);
  return pairs.length === 0 ? null : pairs.join("; ");
}
