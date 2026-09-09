export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-slate-600">
        <p>
          Zappy Mart is a teaching store. Every backend serves one GraphQL
          contract and every frontend consumes it, so any frontend runs against
          any backend.
        </p>
        <p className="mt-1">
          This store front is the React Router version. Loaders read, actions
          write, and the session stays on the server.
        </p>
      </div>
    </footer>
  );
}
