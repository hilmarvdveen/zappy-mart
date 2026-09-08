export const refreshCookieName = "zappy_refresh";

export function parseSetCookie(header) {
  const [pair, ...attributes] = header.split(";");
  const separator = pair.indexOf("=");
  if (separator < 0) {
    return null;
  }
  const name = pair.slice(0, separator).trim();
  if (name.length === 0) {
    return null;
  }
  const value = pair.slice(separator + 1).trim();
  const expired = attributes.some((attribute) => {
    const attributeSeparator = attribute.indexOf("=");
    const attributeName = (
      attributeSeparator < 0 ? attribute : attribute.slice(0, attributeSeparator)
    )
      .trim()
      .toLowerCase();
    const attributeValue =
      attributeSeparator < 0
        ? ""
        : attribute.slice(attributeSeparator + 1).trim();
    if (attributeName === "max-age") {
      return Number(attributeValue) <= 0;
    }
    if (attributeName === "expires") {
      const moment = Date.parse(attributeValue);
      return Number.isFinite(moment) && moment <= Date.now();
    }
    return false;
  });
  return { name, value, expired };
}

export function normaliseAnswer(body) {
  const errors = Array.isArray(body.errors) ? body.errors : [];
  return {
    data: body.data ?? null,
    errors: errors.map((error) => ({ message: String(error?.message ?? error) })),
  };
}

function describeNetworkFailure(url, error) {
  const cause = error.cause;
  const detail = cause?.code ?? cause?.message ?? error.message;
  return `Could not reach ${url}: ${detail}`;
}

export function createClient({ url, origin, fetchImplementation = fetch }) {
  const cookies = new Map();
  const previousCookies = new Map();
  let accessToken = null;

  function storeCookie({ name, value, expired }) {
    const currentValue = cookies.get(name);
    if (currentValue !== undefined && currentValue !== value) {
      previousCookies.set(name, currentValue);
    }
    if (expired) {
      cookies.delete(name);
      return;
    }
    cookies.set(name, value);
  }

  function storeCookiesFrom(response) {
    for (const header of response.headers.getSetCookie()) {
      const cookie = parseSetCookie(header);
      if (cookie !== null) {
        storeCookie(cookie);
      }
    }
  }

  function cookieHeader(replayPreviousRefreshCookie) {
    const pairs = [];
    for (const [name, value] of cookies) {
      if (name === refreshCookieName && replayPreviousRefreshCookie) {
        continue;
      }
      pairs.push(`${name}=${value}`);
    }
    if (replayPreviousRefreshCookie) {
      const previousValue = previousCookies.get(refreshCookieName);
      if (previousValue === undefined) {
        throw new Error(
          `No earlier value of ${refreshCookieName} to replay, so the rotation never happened`,
        );
      }
      pairs.push(`${refreshCookieName}=${previousValue}`);
    }
    return pairs.join("; ");
  }

  async function send({
    source,
    variables,
    includeOrigin = true,
    replayPreviousRefreshCookie = false,
  }) {
    const headers = {
      "content-type": "application/json",
      accept: "application/graphql-response+json, application/json",
    };
    if (includeOrigin) {
      headers.origin = origin;
    }
    if (accessToken !== null) {
      headers.authorization = `Bearer ${accessToken}`;
    }
    const cookieValue = cookieHeader(replayPreviousRefreshCookie);
    if (cookieValue.length > 0) {
      headers.cookie = cookieValue;
    }
    let response;
    try {
      response = await fetchImplementation(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ query: source, variables }),
      });
    } catch (error) {
      throw new Error(describeNetworkFailure(url, error), { cause: error });
    }
    storeCookiesFrom(response);
    const text = await response.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      throw new Error(
        `The backend answered status ${response.status} with a body that is not JSON: ${text.slice(0, 200)}`,
      );
    }
    return { status: response.status, answer: normaliseAnswer(body) };
  }

  return {
    send,
    cookies,
    previousCookies,
    readAccessToken() {
      return accessToken;
    },
    useAccessToken(token) {
      accessToken = token;
    },
    forgetSession() {
      accessToken = null;
      cookies.delete(refreshCookieName);
    },
  };
}
