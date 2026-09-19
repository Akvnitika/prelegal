"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { ChatPanel } from "@/components/chat-panel";
import {
  DocumentGallery,
  DocumentPreparingSkeleton,
  GallerySkeleton,
} from "@/components/document-picker";
import { ErrorNotice } from "@/components/error-notice";
import { GenericForm } from "@/components/generic-form";
import { CreatorTabs, type CreatorTab } from "@/components/creator-tabs";
import { type ChatMessage } from "@/lib/chat";
import {
  MUTUAL_NDA_KEY,
  MUTUAL_NDA_SUMMARY,
  useDocumentCatalog,
  useDocumentDetail,
} from "@/lib/documents";
import {
  generateGenericMarkdown,
  genericMarkdownFilename,
} from "@/lib/generic-markdown";
import {
  deriveGenericTitle,
  type SavedDocumentOut,
} from "@/lib/saved-documents";
import { parseTemplate } from "@/lib/template-parse";
import { TemplateDocument } from "@/lib/template-render";
import { useAutoSave } from "@/lib/use-auto-save";
import { useDocChat } from "@/lib/use-doc-chat";
import { useDocumentRestore } from "@/lib/use-document-restore";

interface RestoredGeneric {
  documentKey: string;
  fields: Record<string, string>;
  transcript: ChatMessage[];
}

function narrowGeneric(doc: SavedDocumentOut): RestoredGeneric | null {
  if (doc.documentKey === MUTUAL_NDA_KEY || !("fields" in doc.data)) return null;
  return {
    documentKey: doc.documentKey,
    fields: doc.data.fields,
    transcript: doc.data.transcript,
  };
}

export default function CreatePage() {
  const restore = useDocumentRestore(narrowGeneric);
  if (restore.status === "checking") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-desk">
        <p className="text-sm text-gray-text">Loading…</p>
      </div>
    );
  }
  return (
    <CreatorScreen
      restoredId={restore.status === "restored" ? restore.id : null}
      initial={restore.status === "restored" ? restore.data : null}
      restoreError={restore.status === "error" ? restore.message : null}
    />
  );
}

function CreatorScreen({
  restoredId,
  initial,
  restoreError,
}: {
  restoredId: number | null;
  initial: RestoredGeneric | null;
  restoreError: string | null;
}) {
  const router = useRouter();
  const [documentKey, setDocumentKey] = useState<string | null>(
    initial?.documentKey ?? null,
  );
  const [fields, setFields] = useState<Record<string, string>>(
    initial?.fields ?? {},
  );
  const [tab, setTab] = useState<CreatorTab>("chat");

  const catalog = useDocumentCatalog();
  const { detail, error: detailError, retry: retryDetail } =
    useDocumentDetail(documentKey);

  const selectDocument = (key: string) => {
    if (key === MUTUAL_NDA_KEY) {
      router.push("/nda/");
      return;
    }
    setDocumentKey(key);
  };

  const chat = useDocChat(
    documentKey,
    fields,
    selectDocument,
    (patch) => setFields((prev) => ({ ...prev, ...patch })),
    initial?.transcript,
  );

  // Kick-off turn: once a document is selected, let the assistant open the
  // form conversation itself. Seeded with any restored key so reopening a
  // saved document never re-fires the opener.
  const kickedOffFor = useRef<string | null>(initial?.documentKey ?? null);
  const { continueTurn } = chat;
  useEffect(() => {
    if (documentKey === null || kickedOffFor.current === documentKey) return;
    kickedOffFor.current = documentKey;
    continueTurn();
  }, [documentKey, continueTurn]);

  // No field seeding needed: the form and preview both treat a missing key
  // as "", so `fields` only ever holds chat patches and manual edits.
  const parsed = useMemo(
    () => (detail ? parseTemplate(detail.templateMarkdown) : null),
    [detail],
  );

  const { status: saveStatus } = useAutoSave({
    initialId: restoredId,
    documentKey,
    title: detail ? deriveGenericTitle(detail.name, fields) : "",
    data: { fields, transcript: chat.messages },
    // Choosing a document is the signal of intent; wait for its metadata so
    // the derived title is right from the first save.
    enabled: detail !== null,
  });

  const allDocuments =
    catalog.documents.length > 0
      ? [MUTUAL_NDA_SUMMARY, ...catalog.documents]
      : [];

  const quickPicks =
    documentKey === null
      ? allDocuments.map((doc) => ({
          label: doc.name,
          prompt: `I need a ${doc.name}.`,
        }))
      : undefined;

  const downloadMarkdown = () => {
    if (!parsed || !detail) return;
    const markdown = generateGenericMarkdown(parsed, detail.fields, fields);
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = genericMarkdownFilename(detail.name, fields);
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader
        title={detail ? detail.name : "Document creator"}
        saveStatus={
          saveStatus === "saving"
            ? "Saving…"
            : saveStatus === "saved"
              ? "Saved"
              : undefined
        }
        actions={
          <>
            <button
              type="button"
              disabled={!parsed}
              onClick={() => window.print()}
              className="rounded-md border border-gray-text/40 px-3.5 py-2 text-sm font-medium text-navy transition-colors hover:border-blue-primary hover:text-blue-primary disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-primary"
            >
              Print or save as PDF
            </button>
            <button
              type="button"
              disabled={!parsed}
              onClick={downloadMarkdown}
              className="rounded-md bg-purple-secondary px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-secondary"
            >
              Download Markdown
            </button>
          </>
        }
      />

      {restoreError && (
        <div className="border-b border-gray-text/25 bg-white px-5 py-2 sm:px-8">
          <ErrorNotice message={restoreError} className="flex items-center gap-3" />
        </div>
      )}

      <main className="flex-1 lg:grid lg:min-h-0 lg:grid-cols-[minmax(21rem,26rem)_1fr]">
        <div
          className={`form-pane flex flex-col border-b border-gray-text/25 bg-white lg:border-b-0 lg:border-e lg:[height:calc(100dvh-3.8rem)] ${
            tab === "chat" ? "max-lg:h-[70dvh]" : ""
          }`}
        >
          <h1 className="sr-only">Create a legal document</h1>
          <div className="px-5 pt-4 sm:px-8">
            <CreatorTabs active={tab} onChange={setTab} />
          </div>
          {tab === "chat" ? (
            <div
              id="panel-chat"
              role="tabpanel"
              aria-labelledby="tab-chat"
              className="flex min-h-0 flex-1 flex-col"
            >
              <ChatPanel
                messages={chat.messages}
                sending={chat.sending}
                error={chat.error}
                onSend={chat.sendMessage}
                onRetry={chat.retry}
                quickPicks={quickPicks}
              />
            </div>
          ) : (
            <div
              id="panel-manual"
              role="tabpanel"
              aria-labelledby="tab-manual"
              className="min-h-0 flex-1 px-5 py-6 sm:px-8 lg:overflow-y-auto"
            >
              {detail ? (
                <>
                  <p className="mb-2 text-sm leading-relaxed text-gray-text">
                    Fill in the details below. The agreement on the right
                    updates as you type.
                  </p>
                  <GenericForm
                    fields={detail.fields}
                    values={fields}
                    onChange={(name, value) =>
                      setFields((prev) => ({ ...prev, [name]: value }))
                    }
                  />
                </>
              ) : (
                <p className="text-sm leading-relaxed text-gray-text">
                  Pick a document in the chat first — then you can edit its
                  fields here.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="doc-pane bg-desk px-4 py-8 sm:px-8 lg:overflow-y-auto lg:[height:calc(100dvh-3.8rem)]">
          {parsed ? (
            <div className="paper">
              <TemplateDocument parsed={parsed} fields={fields} />
            </div>
          ) : detailError ? (
            <ErrorNotice
              className="mx-auto max-w-3xl space-y-1.5 text-sm"
              message={detailError}
              onRetry={retryDetail}
            />
          ) : documentKey !== null ? (
            <DocumentPreparingSkeleton />
          ) : catalog.error ? (
            <ErrorNotice
              className="mx-auto max-w-3xl space-y-1.5 text-sm"
              message={catalog.error}
              onRetry={catalog.retry}
            />
          ) : allDocuments.length === 0 ? (
            <GallerySkeleton />
          ) : (
            <DocumentGallery documents={allDocuments} />
          )}
        </div>
      </main>
    </div>
  );
}
