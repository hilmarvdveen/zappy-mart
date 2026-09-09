const emailAddressPattern = /^[^\s@]+@[^\s@.]+\.[^\s@]+$/;

export type EmailAddress = string & { readonly emailAddress: unique symbol };

export function isEmailAddress(candidate: string): boolean {
  return emailAddressPattern.test(candidate.trim());
}

export function emailAddress(candidate: string): EmailAddress {
  const normalised = candidate.trim().toLowerCase();
  if (!emailAddressPattern.test(normalised)) {
    throw new Error("An email address needs a name, an at sign and a domain");
  }
  return normalised as EmailAddress;
}
