const browsers = [
  { marker: "Edg/", name: "Edge" },
  { marker: "OPR/", name: "Opera" },
  { marker: "Firefox/", name: "Firefox" },
  { marker: "Chrome/", name: "Chrome" },
  { marker: "Safari/", name: "Safari" },
];

const systems = [
  { marker: "Windows", name: "Windows" },
  { marker: "Android", name: "Android" },
  { marker: "iPhone", name: "iPhone" },
  { marker: "iPad", name: "iPad" },
  { marker: "Mac OS X", name: "macOS" },
  { marker: "Linux", name: "Linux" },
];

export function describeDevice(userAgent: string | null): string {
  if (userAgent === null || userAgent.trim().length === 0) {
    return "Unknown browser";
  }
  const browser = browsers.find((candidate) =>
    userAgent.includes(candidate.marker),
  );
  const system = systems.find((candidate) =>
    userAgent.includes(candidate.marker),
  );
  if (browser === undefined && system === undefined) {
    return "Unknown browser";
  }
  if (system === undefined) {
    return browser?.name ?? "Unknown browser";
  }
  if (browser === undefined) {
    return system.name;
  }
  return `${browser.name} on ${system.name}`;
}
