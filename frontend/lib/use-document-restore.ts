"use client";

import { useEffect, useState } from "react";
import {
  clearOpenHandoff,
  fetchSavedDocument,
  hasOpenHandoff,
  peekOpenHandoff,
  type SavedDocumentOut,
} from "@/lib/saved-documents";

export type RestoreState<T> =
  | { status: "checking" }
  | { status: "none" }
  | { status: "restored"; id: number; data: T }
  | { status: "error"; message: string };

/** The screen props both creator pages derive from a restore. */
export function restoreProps<T>(restore: RestoreState<T>): {
  restoredId: number | null;
  initial: T | null;
  restoreError: string | null;
} {
  return {
    restoredId: restore.status === "restored" ? restore.id : null,
    initial: restore.status === "restored" ? restore.data : null,
    restoreError: restore.status === "error" ? restore.message : null,
  };
}

/**
 * Consumes the /documents "open" handoff (a single-use sessionStorage id)
 * and fetches the saved document. The id is only cleared after the fetch
 * settles, so StrictMode's double-invoked dev effects re-read it instead of
 * losing it. Visits without a handoff start directly at "none".
 */
export function useDocumentRestore<T>(
  narrow: (doc: SavedDocumentOut) => T | null,
): RestoreState<T> {
  const [state, setState] = useState<RestoreState<T>>(() =>
    hasOpenHandoff() ? { status: "checking" } : { status: "none" },
  );

  useEffect(() => {
    if (state.status !== "checking") return;
    const id = peekOpenHandoff();
    if (id === null) {
      // Consumed by a concurrent visit; nothing to restore.
      queueMicrotask(() => setState({ status: "none" }));
      return;
    }
    let cancelled = false;
    fetchSavedDocument(id)
      .then((doc) => {
        if (cancelled) return;
        clearOpenHandoff();
        const narrowed = narrow(doc);
        setState(
          narrowed !== null
            ? { status: "restored", id: doc.id, data: narrowed }
            : { status: "none" }, // wrong creator for this document type
        );
      })
      .catch(() => {
        if (cancelled) return;
        clearOpenHandoff();
        setState({
          status: "error",
          message:
            "Couldn't load that saved document — starting a new one instead.",
        });
      });
    return () => {
      cancelled = true;
    };
    // narrow is intentionally read once; the handoff is single-use.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  return state;
}
