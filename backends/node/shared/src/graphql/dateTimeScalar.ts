import { GraphQLError, GraphQLScalarType, Kind } from "graphql";
import { fromContractDateTime, toContractDateTime } from "../domain/dateTime.js";

export const dateTimeScalar = new GraphQLScalarType<Date | string, string>({
  name: "DateTime",
  description: "A moment in time as an ISO 8601 string in UTC with second precision.",

  serialize(value: unknown): string {
    if (value instanceof Date) {
      return toContractDateTime(value);
    }
    if (typeof value === "string") {
      return toContractDateTime(fromContractDateTime(value));
    }
    throw new GraphQLError("A DateTime is answered as a Date or as an ISO 8601 string.");
  },

  parseValue(value: unknown): Date {
    if (typeof value !== "string") {
      throw new GraphQLError("A DateTime is given as an ISO 8601 string.");
    }
    return fromContractDateTime(value);
  },

  parseLiteral(node): Date {
    if (node.kind !== Kind.STRING) {
      throw new GraphQLError("A DateTime is given as an ISO 8601 string.");
    }
    return fromContractDateTime(node.value);
  }
});
