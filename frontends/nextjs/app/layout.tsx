import type { Metadata } from "next";

import { PoliteRouteAnnouncer } from "@/components/PoliteRouteAnnouncer";
import { SessionRefresher } from "@/components/SessionRefresher";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { readSession } from "@/server/session";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Zappy Mart", template: "%s, Zappy Mart" },
  description:
    "The Zappy Mart store front on the Next.js App Router: server components read, server actions write.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await readSession();

  return (
    <html lang="en-GB">
      <body className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
        {session.accessTokenExpiresAt === null ? null : (
          <SessionRefresher
            key={session.accessTokenExpiresAt}
            accessTokenExpiresAt={session.accessTokenExpiresAt}
          />
        )}
        <PoliteRouteAnnouncer />
        <SiteHeader />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
