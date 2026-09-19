"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSyncExternalStore, type ReactNode } from "react";
import { signOut } from "@/lib/auth";
import { readSessionSnapshot, subscribeNever } from "@/lib/session";

interface AppHeaderProps {
  /** Context shown beside the wordmark, e.g. the current document's name. */
  title: string;
  /** Page-specific actions (Print, Download…) rendered before the user chip. */
  actions?: ReactNode;
  /** Subtle auto-save indicator ("Saving…" / "Saved"). */
  saveStatus?: string;
  /** Highlights the matching nav entry instead of linking it. */
  activeNav?: "documents";
}

/**
 * The shared signed-in chrome. Keeps the "app-header" class — the print
 * stylesheet hides it — and the same vertical geometry the two-pane layouts
 * size against (calc(100dvh-3.8rem)).
 */
export function AppHeader({ title, actions, saveStatus, activeNav }: AppHeaderProps) {
  const router = useRouter();
  // Session comes from localStorage: null during prerender, resolved on the
  // client via the same useSyncExternalStore idiom as useToday.
  const user =
    useSyncExternalStore(subscribeNever, readSessionSnapshot, () => null)
      ?.user ?? null;

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <header className="app-header flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-gray-text/25 bg-white px-5 py-3 sm:px-8">
      <Link
        href="/documents/"
        className="font-serif text-xl font-semibold text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-primary"
      >
        prelegal<span className="text-accent-yellow">.</span>
      </Link>
      <span aria-hidden className="hidden h-5 w-px bg-gray-text/30 sm:block" />
      <p className="truncate text-sm text-gray-text">{title}</p>
      {saveStatus && (
        <p aria-live="polite" className="text-xs text-gray-text/90">
          {saveStatus}
        </p>
      )}

      <div className="ms-auto flex flex-wrap items-center gap-x-4 gap-y-2">
        <nav>
          {activeNav === "documents" ? (
            <span aria-current="page" className="text-sm font-semibold text-navy">
              My documents
            </span>
          ) : (
            <Link
              href="/documents/"
              className="text-sm font-medium text-navy transition-colors hover:text-blue-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-primary"
            >
              My documents
            </Link>
          )}
        </nav>
        {actions}
        {user && (
          <div className="flex items-center gap-2 border-s border-gray-text/25 ps-4">
            <span
              aria-hidden
              className="flex h-7 w-7 items-center justify-center rounded-full bg-navy text-xs font-semibold text-white"
            >
              {(user.name || user.email).charAt(0).toUpperCase()}
            </span>
            <span className="hidden max-w-36 truncate text-sm text-navy md:inline">
              {user.name || user.email}
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-sm text-gray-text transition-colors hover:text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-primary"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
