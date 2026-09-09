export const refreshCookieName = "zappy_refresh";
export const cartCookieName = "zappy_cart";

export type ApiCookies = {
  refreshCookie: string | null;
  cartCookie: string | null;
};

export type ApiCookieUpdate = {
  refreshCookie?: string | null;
  cartCookie?: string | null;
};

export function buildApiCookieHeader(cookies: ApiCookies): string | null {
  const parts: string[] = [];
  if (cookies.refreshCookie !== null) {
    parts.push(`${refreshCookieName}=${cookies.refreshCookie}`);
  }
  if (cookies.cartCookie !== null) {
    parts.push(`${cartCookieName}=${cookies.cartCookie}`);
  }
  return parts.length === 0 ? null : parts.join("; ");
}

export function readApiCookieUpdate(
  setCookieHeaders: readonly string[],
): ApiCookieUpdate {
  const update: ApiCookieUpdate = {};
  for (const header of setCookieHeaders) {
    const [assignment, ...attributes] = header.split(";");
    const separator = assignment.indexOf("=");
    if (separator < 0) {
      continue;
    }
    const name = assignment.slice(0, separator).trim();
    const rawValue = assignment.slice(separator + 1).trim();
    const cleared =
      rawValue.length === 0 ||
      attributes.some(
        (attribute) => attribute.trim().toLowerCase() === "max-age=0",
      );
    const value = cleared ? null : rawValue;
    if (name === refreshCookieName) {
      update.refreshCookie = value;
    }
    if (name === cartCookieName) {
      update.cartCookie = value;
    }
  }
  return update;
}

export function applyApiCookieUpdate(
  cookies: ApiCookies,
  update: ApiCookieUpdate,
): ApiCookies {
  return {
    refreshCookie:
      update.refreshCookie === undefined
        ? cookies.refreshCookie
        : update.refreshCookie,
    cartCookie:
      update.cartCookie === undefined ? cookies.cartCookie : update.cartCookie,
  };
}
