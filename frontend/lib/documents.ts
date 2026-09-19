"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

/** The bespoke NDA creator handles this key; the generic creator routes
 * there when the chat selects it. Must match the backend's NDA_KEY. */
export const MUTUAL_NDA_KEY = "mutual-nda";

export interface FieldMeta {
  name: string;
  label: string;
  hint: string;
  group: string;
}

export interface DocumentSummary {
  key: string;
  name: string;
  description: string;
  about: string;
  fields: FieldMeta[];
}

export interface DocumentDetail extends DocumentSummary {
  templateMarkdown: string;
}

export const fetchDocuments = () =>
  apiGet<{ documents: DocumentSummary[] }>("/api/documents");

export const fetchDocument = (key: string) =>
  apiGet<DocumentDetail>(`/api/documents/${key}`);

const LOAD_ERROR = "Couldn't load the document catalog. Please try again.";

export function useDocumentCatalog() {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchDocuments()
      .then((response) => {
        if (cancelled) return;
        setDocuments(response.documents);
        setError(null);
      })
      .catch(() => {
        if (!cancelled) setError(LOAD_ERROR);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setError(null);
    setAttempt((n) => n + 1);
  }, []);
  return { documents, error, retry };
}

export function useDocumentDetail(key: string | null) {
  // Results are stored with the key they belong to and derived against the
  // current key, so switching (or clearing) the key needs no state reset.
  const [loaded, setLoaded] = useState<{
    key: string;
    detail: DocumentDetail;
  } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(
    null,
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (key === null) return;
    let cancelled = false;
    fetchDocument(key)
      .then((response) => {
        if (cancelled) return;
        setLoaded({ key, detail: response });
        setFailure(null);
      })
      .catch(() => {
        if (!cancelled) setFailure({ key, message: LOAD_ERROR });
      });
    return () => {
      cancelled = true;
    };
  }, [key, attempt]);

  const retry = useCallback(() => {
    setFailure(null);
    setAttempt((n) => n + 1);
  }, []);

  return {
    detail: loaded && loaded.key === key ? loaded.detail : null,
    error: failure && failure.key === key ? failure.message : null,
    retry,
  };
}
