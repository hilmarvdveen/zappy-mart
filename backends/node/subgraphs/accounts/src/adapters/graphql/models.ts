import type { Customer } from "../../domain/customer.js";
import type { Session } from "../../domain/session.js";

export type CustomerModel = Customer;

export type SessionModel = Session;

export type ProductReferenceModel = {
  readonly id: string;
};
