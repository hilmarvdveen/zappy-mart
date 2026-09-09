import { createContext } from "react-router";
import type { StoreConnection } from "./storeConnection.server";

export const storeConnectionContext = createContext<StoreConnection | null>(
  null,
);

export function storeConnectionFrom(reader: {
  get: (context: typeof storeConnectionContext) => StoreConnection | null;
}): StoreConnection {
  const connection = reader.get(storeConnectionContext);
  if (connection === null) {
    throw new Error(
      "No store connection on this request. The root middleware opens it for every route.",
    );
  }
  return connection;
}
