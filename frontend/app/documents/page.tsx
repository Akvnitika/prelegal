"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import {
  DocumentList,
  DocumentListSkeleton,
  EmptyDocuments,
} from "@/components/document-list";
import { ErrorNotice } from "@/components/error-notice";
import { MUTUAL_NDA_KEY, useDocumentCatalog } from "@/lib/documents";
import {
  deleteSavedDocument,
  fetchSavedDocuments,
  setOpenHandoff,
  type SavedDocumentSummary,
} from "@/lib/saved-documents";

function useSavedDocumentsList() {
  const [documents, setDocuments] = useState<SavedDocumentSummary[] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchSavedDocuments()
      .then((response) => {
        if (cancelled) return;
        setDocuments(response.documents);
        setError(null);
      })
      .catch(() => {
        if (!cancelled)
          setError("Couldn't load your documents. Please try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setError(null);
    setAttempt((n) => n + 1);
  }, []);

  const remove = useCallback(async (doc: SavedDocumentSummary) => {
    await deleteSavedDocument(doc.id);
    setDocuments((docs) => docs?.filter((d) => d.id !== doc.id) ?? docs);
  }, []);

  return { documents, error, retry, remove };
}

export default function DocumentsPage() {
  const router = useRouter();
  const { documents, error, retry, remove } = useSavedDocumentsList();
  const catalog = useDocumentCatalog();

  const typeNameFor = (documentKey: string): string => {
    if (documentKey === MUTUAL_NDA_KEY) return "Mutual Non-Disclosure Agreement";
    return (
      catalog.documents.find((doc) => doc.key === documentKey)?.name ??
      documentKey
    );
  };

  const openDocument = (doc: SavedDocumentSummary) => {
    setOpenHandoff(doc.id);
    router.push(doc.documentKey === MUTUAL_NDA_KEY ? "/nda/" : "/create/");
  };

  return (
    <div className="flex min-h-dvh flex-col bg-desk">
      <AppHeader title="My documents" activeNav="documents" />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-navy">My documents</h1>
            <p className="text-sm text-gray-text">
              Drafts save automatically while you work.
            </p>
          </div>
          <Link
            href="/create/"
            className="rounded-md bg-purple-secondary px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-secondary"
          >
            Start a new document
          </Link>
        </div>

        {error ? (
          <ErrorNotice message={error} onRetry={retry} />
        ) : documents === null ? (
          <DocumentListSkeleton />
        ) : documents.length === 0 ? (
          <EmptyDocuments />
        ) : (
          <DocumentList
            documents={documents}
            typeNameFor={typeNameFor}
            onOpen={openDocument}
            onDelete={remove}
          />
        )}
      </main>
    </div>
  );
}
