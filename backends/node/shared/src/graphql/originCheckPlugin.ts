import { GraphQLError } from "graphql";
import type { ApolloServerPlugin, BaseContext } from "@apollo/server";
import { judgeOrigin } from "../security/originCheck.js";

export function originCheckPlugin<Context extends BaseContext>(
  originOf: (context: Context) => string | null
): ApolloServerPlugin<Context> {
  return {
    async requestDidStart() {
      return {
        async didResolveOperation(requestContext) {
          if (requestContext.operation?.operation !== "mutation") {
            return;
          }
          if (judgeOrigin(originOf(requestContext.contextValue)) === "allowed") {
            return;
          }
          throw new GraphQLError("A mutation needs an Origin header this store allows.", {
            extensions: { code: "ORIGIN_NOT_ALLOWED", http: { status: 403 } }
          });
        }
      };
    }
  };
}
