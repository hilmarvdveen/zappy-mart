"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { requestSessionRefresh } from "@/browser/sessionRefresh";

const refreshMarginInMilliseconds = 60_000;

export function SessionRefresher({
  accessTokenExpiresAt,
}: {
  accessTokenExpiresAt: string;
}) {
  const router = useRouter();
  const [expiresAt, setExpiresAt] = useState<string | null>(
    accessTokenExpiresAt,
  );

  useEffect(() => {
    if (expiresAt === null) {
      return;
    }
    const wait = Math.max(
      new Date(expiresAt).getTime() - Date.now() - refreshMarginInMilliseconds,
      0,
    );
    const timer = window.setTimeout(() => {
      requestSessionRefresh()
        .then((answer) => {
          setExpiresAt(answer.accessTokenExpiresAt);
          if (!answer.signedIn) {
            router.refresh();
          }
        })
        .catch(() => {
          setExpiresAt(null);
        });
    }, wait);
    return () => {
      window.clearTimeout(timer);
    };
  }, [expiresAt, router]);

  return null;
}
