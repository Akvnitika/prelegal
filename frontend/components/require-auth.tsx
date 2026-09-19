"use client";

import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { readSessionSnapshot, subscribeNever } from "@/lib/session";

/**
 * Client-side gate for signed-in screens. Static export has no server
 * middleware, so the check runs after hydration: the prerendered HTML is a
 * neutral loading placeholder, a signed-in visitor swaps to the page on the
 * first client render, and everyone else is sent back to sign-in.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const session = useSyncExternalStore(
    subscribeNever,
    readSessionSnapshot,
    () => null,
  );

  useEffect(() => {
    if (session === null) router.replace("/");
  }, [session, router]);

  if (session === null) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-desk">
        <p className="text-sm text-gray-text">Loading…</p>
      </div>
    );
  }
  return <>{children}</>;
}
