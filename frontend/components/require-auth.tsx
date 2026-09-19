"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { readSession } from "@/lib/session";

/**
 * Client-side gate for signed-in screens. Static export has no server
 * middleware, so the check runs after hydration: nothing renders until the
 * session is confirmed, and visitors without one land back on sign-in.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (readSession() === null) {
      router.replace("/");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) return null;
  return <>{children}</>;
}
