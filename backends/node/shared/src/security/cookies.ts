export function readCookie(cookieHeader: string | null | undefined, name: string): string | null {
  if (cookieHeader === null || cookieHeader === undefined) {
    return null;
  }
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) {
      continue;
    }
    if (part.slice(0, separator).trim() === name) {
      return decodeURIComponent(part.slice(separator + 1).trim());
    }
  }
  return null;
}

export type CookieOptions = {
  readonly path: string;
  readonly maximumAgeInSeconds: number;
  readonly secure: boolean;
};

export function writeCookie(name: string, value: string, options: CookieOptions): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${options.path}`,
    `Max-Age=${options.maximumAgeInSeconds}`,
    "HttpOnly",
    "SameSite=Lax"
  ];
  if (options.secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

export function clearCookie(name: string, path: string): string {
  return `${name}=; Path=${path}; Max-Age=0; HttpOnly; SameSite=Lax`;
}
