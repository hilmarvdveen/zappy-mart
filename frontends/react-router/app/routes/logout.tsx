import { redirect } from "react-router";
import type { Route } from "./+types/logout";
import { logoutMutation } from "~/graphql/documents";
import { storeConnectionFrom } from "~/session/storeContext";

export async function loader() {
  return redirect("/");
}

export async function action({ context }: Route.ActionArgs) {
  const connection = storeConnectionFrom(context);
  if (connection.signedIn) {
    await connection.run(logoutMutation, {});
  }
  connection.endSession();
  return redirect("/");
}
