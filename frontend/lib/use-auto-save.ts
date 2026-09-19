"use client";

import { useEffect, useRef, useState } from "react";
import {
  createSavedDocument,
  updateSavedDocument,
  type GenericDocData,
  type NdaDocData,
} from "@/lib/saved-documents";

const DEBOUNCE_MS = 1500;

export type SaveStatus = "idle" | "saving" | "saved";

interface Snapshot {
  documentKey: string;
  title: string;
  data: GenericDocData | NdaDocData;
}

/**
 * Debounced persistence for a creator document. Creates the saved row on the
 * first meaningful change, then updates it; identical snapshots are skipped.
 * A change arriving while a save is in flight chains one follow-up save with
 * the newest state, so nothing is silently dropped. Failures return the
 * status to "idle" and the next change retries.
 */
export function useAutoSave(args: {
  initialId: number | null;
  documentKey: string | null;
  title: string;
  data: GenericDocData | NdaDocData;
  enabled: boolean;
}): { status: SaveStatus } {
  const { initialId, documentKey, title, data, enabled } = args;
  const [status, setStatus] = useState<SaveStatus>(
    initialId !== null ? "saved" : "idle",
  );
  const idRef = useRef<number | null>(initialId);
  const serialized = JSON.stringify({ title, data });
  const lastSavedRef = useRef<string | null>(
    initialId !== null ? serialized : null,
  );
  const latestRef = useRef<Snapshot | null>(null);
  const inFlightRef = useRef(false);
  const dirtyRef = useRef(false);

  useEffect(() => {
    latestRef.current =
      documentKey !== null ? { documentKey, title, data } : null;
    if (!enabled || documentKey === null) return;
    if (serialized === lastSavedRef.current) return;

    const runSave = async (): Promise<void> => {
      const snapshot = latestRef.current;
      if (snapshot === null) return;
      inFlightRef.current = true;
      setStatus("saving");
      try {
        const payload = { title: snapshot.title, data: snapshot.data };
        if (idRef.current === null) {
          const created = await createSavedDocument({
            documentKey: snapshot.documentKey,
            ...payload,
          });
          idRef.current = created.id;
        } else {
          await updateSavedDocument(idRef.current, payload);
        }
        lastSavedRef.current = JSON.stringify(payload);
        setStatus("saved");
      } catch {
        setStatus("idle"); // retried on the next change
      } finally {
        inFlightRef.current = false;
        if (dirtyRef.current) {
          dirtyRef.current = false;
          void runSave(); // re-reads latestRef — always the freshest state
        }
      }
    };

    const timer = setTimeout(() => {
      if (inFlightRef.current) {
        dirtyRef.current = true;
        return;
      }
      void runSave();
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
    // `data`/`title` are captured through latestRef + serialized.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized, enabled, documentKey]);

  return { status };
}
