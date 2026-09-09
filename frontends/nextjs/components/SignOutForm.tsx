import { SubmitButton } from "@/components/SubmitButton";
import { signOut } from "@/server/actions/accountActions";

export function SignOutForm() {
  return (
    <form action={signOut}>
      <SubmitButton label="Sign out" busyLabel="Signing out" tone="secondary" />
    </form>
  );
}
