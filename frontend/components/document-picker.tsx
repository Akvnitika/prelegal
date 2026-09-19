"use client";

import { type DocumentSummary } from "@/lib/documents";

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
