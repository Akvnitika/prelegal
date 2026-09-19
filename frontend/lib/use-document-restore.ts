"use client";

import { useEffect, useState } from "react";
import {
  fetchSavedDocument,
  hasOpenHandoff,
  takeOpenHandoff,
  type SavedDocumentOut,
} from "@/lib/saved-documents";

export type RestoreState<T> =
  | { status: "checking" }
  | { status: "none" }
  | { status: "restored"; id: number; data: T }
  | { status: "error"; message: string };

/**
 * Consumes the /documents "open" handoff (a single-use sessionStorage id)
 * and fetches the saved document. Visits without a handoff start directly
 * at "none" (hasOpenHandoff is a pure read, and sessionStorage is absent
 * during the static prerender, so server and client HTML match).
 */
export function useDocumentRestore<T>(
  narrow: (doc: SavedDocumentOut) => T | null,
): RestoreState<T> {
  const [state, setState] = useState<RestoreState<T>>(() =>
    hasOpenHandoff() ? { status: "checking" } : { status: "none" },
  );

  useEffect(() => {
    if (state.status !== "checking") return;
    const id = takeOpenHandoff();
    let cancelled = false;
    // id can only be null if another tab consumed the handoff first.
    const load =
      id === null
        ? Promise.resolve<RestoreState<T>>({ status: "none" })
        : fetchSavedDocument(id)
            .then((doc): RestoreState<T> => {
              const narrowed = narrow(doc);
              return narrowed !== null
                ? { status: "restored", id: doc.id, data: narrowed }
                : { status: "none" }; // wrong creator for this document type
            })
            .catch(
              (): RestoreState<T> => ({
                status: "error",
                message:
                  "Couldn't load that saved document — starting a new one instead.",
              }),
            );
    void load.then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
    // narrow is intentionally read once; the handoff is single-use.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  return state;
}
