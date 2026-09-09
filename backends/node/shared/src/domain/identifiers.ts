import { randomUUID } from "node:crypto";

export function newIdentifier(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}

export function newOrderNumber(sequence: number): string {
  return `ZM-${String(sequence).padStart(6, "0")}`;
}
