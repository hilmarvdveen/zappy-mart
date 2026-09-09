export function ApiUnavailableNotice({ subject }: { subject: string }) {
  return (
    <div
      role="status"
      className="rounded border border-amber-400 bg-amber-50 p-4 text-sm text-amber-900"
    >
      <p className="font-medium">The Zappy Mart API did not answer.</p>
      <p className="mt-1">
        {subject} could not be loaded. Start a backend from the repository, or
        the mock server in <code>tools/mock-server</code>, and reload this page.
      </p>
    </div>
  );
}
