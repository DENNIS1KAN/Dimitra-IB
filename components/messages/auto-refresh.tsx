"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Polling refresh (SPEC §15.4: "simple polling is fine; no websockets").
// Re-renders the server components of the current route while the tab is
// visible, and once more when it becomes visible again.
export function AutoRefresh({ intervalMs = 15000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router, intervalMs]);
  return null;
}
