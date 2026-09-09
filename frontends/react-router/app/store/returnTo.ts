export function safeReturnTo(value: string | null, fallback: string): string {
  if (value === null) {
    return fallback;
  }
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallback;
  }
  return trimmed;
}
