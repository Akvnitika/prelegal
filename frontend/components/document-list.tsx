"use client";

import Link from "next/link";
import { useState } from "react";
import {
  formatUpdatedAt,
  type SavedDocumentSummary,
} from "@/lib/saved-documents";

export function DocumentListSkeleton() {
  return (
    <ul aria-hidden className="space-y-3">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="h-20 animate-pulse rounded-lg border border-gray-text/25 border-t-4 border-t-accent-yellow bg-white"
        />
      ))}
    </ul>
  );
}

export function EmptyDocuments() {
  return (
    <div className="rounded-lg border border-gray-text/25 border-t-4 border-t-accent-yellow bg-white p-8 text-center shadow-sm">
      <p className="mb-1 text-lg font-semibold text-navy">No documents yet</p>
      <p className="mb-5 text-sm text-gray-text">
        Start a conversation with the drafting assistant and your document
        shows up here automatically as you go.
      </p>
      <Link
        href="/create/"
        className="inline-block rounded-md bg-purple-secondary px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-secondary"
      >
        Start a new document
      </Link>
    </div>
  );
}

function DocumentRow({
  doc,
  typeName,
  onOpen,
  onDelete,
}: {
  doc: SavedDocumentSummary;
  typeName: string;
  onOpen: () => void;
  onDelete: () => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-gray-text/25 border-t-4 border-t-accent-yellow bg-white p-4 shadow-sm">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-navy">{doc.title}</p>
        <p className="text-xs text-gray-text">
          {typeName} · Edited {formatUpdatedAt(doc.updatedAt)}
        </p>
      </div>
      {confirming ? (
        <div className="flex shrink-0 items-center gap-3 text-sm">
          <span className="text-gray-text">Delete this document?</span>
          <button
            type="button"
            disabled={deleting}
            onClick={async () => {
              setDeleting(true);
              try {
                await onDelete();
              } finally {
                setDeleting(false);
              }
            }}
            className="font-medium text-danger hover:underline disabled:opacity-60"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="text-blue-primary hover:underline"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-3 text-sm">
          <button
            type="button"
            onClick={onOpen}
            className="font-medium text-blue-primary hover:underline"
          >
            Open
          </button>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="font-medium text-gray-text hover:text-danger"
          >
            Delete
          </button>
        </div>
      )}
    </li>
  );
}

export function DocumentList({
  documents,
  typeNameFor,
  onOpen,
  onDelete,
}: {
  documents: SavedDocumentSummary[];
  typeNameFor: (documentKey: string) => string;
  onOpen: (doc: SavedDocumentSummary) => void;
  onDelete: (doc: SavedDocumentSummary) => Promise<void>;
}) {
  return (
    <ul className="space-y-3">
      {documents.map((doc) => (
        <DocumentRow
          key={doc.id}
          doc={doc}
          typeName={typeNameFor(doc.documentKey)}
          onOpen={() => onOpen(doc)}
          onDelete={() => onDelete(doc)}
        />
      ))}
    </ul>
  );
}
