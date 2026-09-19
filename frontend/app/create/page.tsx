"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChatPanel } from "@/components/chat-panel";
import { DocumentGallery } from "@/components/document-picker";
import { GenericForm } from "@/components/generic-form";
import { CreatorTabs, type CreatorTab } from "@/components/creator-tabs";
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
import { parseTemplate } from "@/lib/template-parse";
import { TemplateDocument } from "@/lib/template-render";
import { useDocChat } from "@/lib/use-doc-chat";

export default function CreatePage() {
  const router = useRouter();
  const [documentKey, setDocumentKey] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
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

  const chat = useDocChat(documentKey, fields, selectDocument, (patch) =>
    setFields((prev) => ({ ...prev, ...patch })),
  );

  // Kick-off turn: once a document is selected, let the assistant open the
  // form conversation itself (introduce the document, ask the starting
  // question) instead of waiting for the user to speak first.
  const kickedOffFor = useRef<string | null>(null);
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
      <header className="app-header flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-gray-text/25 bg-white px-5 py-3 sm:px-8">
        <p className="font-serif text-xl font-semibold text-navy">prelegal</p>
        <p className="text-sm text-gray-text">
          {detail ? detail.name : "Document creator"}
        </p>
        <div className="ms-auto flex items-center gap-2.5">
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
        </div>
      </header>

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
            <div className="mx-auto max-w-3xl text-sm">
              <p role="alert" className="text-red-600">
                {detailError}
              </p>
              <button
                type="button"
                onClick={retryDetail}
                className="mt-1.5 font-medium text-blue-primary hover:underline"
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              {catalog.error ? (
                <div className="mx-auto max-w-3xl text-sm">
                  <p role="alert" className="text-red-600">
                    {catalog.error}
                  </p>
                  <button
                    type="button"
                    onClick={catalog.retry}
                    className="mt-1.5 font-medium text-blue-primary hover:underline"
                  >
                    Try again
                  </button>
                </div>
              ) : (
                <DocumentGallery documents={allDocuments} />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
