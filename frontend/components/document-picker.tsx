"use client";

import { type DocumentSummary } from "@/lib/documents";

/** Placeholder while the catalog loads, mirroring the gallery's card grid. */
export function GallerySkeleton() {
  return (
    <div aria-hidden className="mx-auto max-w-3xl">
      <div className="mb-2 h-6 w-64 animate-pulse rounded bg-gray-text/20" />
      <div className="mb-5 h-4 w-80 animate-pulse rounded bg-gray-text/15" />
      <ul className="grid gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <li
            key={i}
            className="h-28 animate-pulse rounded-lg border border-gray-text/25 bg-white"
          />
        ))}
      </ul>
    </div>
  );
}

/** Placeholder between choosing a document and its template arriving. */
export function DocumentPreparingSkeleton() {
  return (
    <div className="paper">
      <p className="mb-6 text-sm text-gray-text">Preparing your document…</p>
      <div aria-hidden className="space-y-3">
        <div className="h-7 w-2/3 animate-pulse rounded bg-gray-text/20" />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="h-3 animate-pulse rounded bg-gray-text/15" />
        ))}
      </div>
    </div>
  );
}

/** Read-only gallery shown in the preview pane until a document is chosen.
 * Selection itself happens in the chat (or its quick-pick chips). */
export function DocumentGallery({
  documents,
}: {
  documents: DocumentSummary[];
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="mb-1 text-lg font-semibold text-navy">
        What would you like to draft?
      </h2>
      <p className="mb-5 text-sm text-gray-text">
        Tell the assistant on the left what you need — these are the
        agreements it can create.
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {documents.map((doc) => (
          <li
            key={doc.key}
            className="rounded-lg border border-gray-text/25 border-t-4 border-t-accent-yellow bg-white p-4 shadow-sm"
          >
            <p className="mb-1 text-sm font-semibold text-navy">{doc.name}</p>
            <p className="text-xs leading-relaxed text-gray-text">
              {doc.description}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
