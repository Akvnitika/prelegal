"use client";

import { useState, useSyncExternalStore } from "react";
import { AppHeader } from "@/components/app-header";
import { ChatPanel } from "@/components/chat-panel";
import { ErrorNotice } from "@/components/error-notice";
import { NdaDocument } from "@/components/nda-document";
import { NdaForm } from "@/components/nda-form";
import { CreatorTabs, type CreatorTab } from "@/components/creator-tabs";
import { type ChatMessage } from "@/lib/chat";
import { MUTUAL_NDA_KEY } from "@/lib/documents";
import { generateMarkdown, markdownFilename } from "@/lib/markdown";
import { defaultNdaData, mergeNdaData, todayIso, type NdaData } from "@/lib/nda";
import {
  deriveNdaTitle,
  type SavedDocumentOut,
} from "@/lib/saved-documents";
import { LoadingScreen } from "@/components/loading-screen";
import { useAutoSave } from "@/lib/use-auto-save";
import { restoreProps, useDocumentRestore } from "@/lib/use-document-restore";
import { useNdaChat } from "@/lib/use-nda-chat";

const subscribeNever = () => () => {};

// Today's date in the viewer's timezone; empty during prerender so the
// server and client hydrate identical HTML.
function useToday(): string {
  return useSyncExternalStore(subscribeNever, todayIso, () => "");
}

const DEFAULT_NDA_SNAPSHOT = JSON.stringify(defaultNdaData());

interface RestoredNda {
  nda: NdaData;
  transcript: ChatMessage[];
}

function narrowNda(doc: SavedDocumentOut): RestoredNda | null {
  if (doc.documentKey !== MUTUAL_NDA_KEY || !("nda" in doc.data)) return null;
  return { nda: doc.data.nda, transcript: doc.data.transcript };
}

export default function NdaPage() {
  const restore = useDocumentRestore(narrowNda);
  if (restore.status === "checking") return <LoadingScreen />;
  return <NdaCreatorScreen {...restoreProps(restore)} />;
}

function NdaCreatorScreen({
  restoredId,
  initial,
  restoreError,
}: {
  restoredId: number | null;
  initial: RestoredNda | null;
  restoreError: string | null;
}) {
  const [edited, setEdited] = useState<NdaData>(
    () => initial?.nda ?? defaultNdaData(),
  );
  const [tab, setTab] = useState<CreatorTab>("chat");
  // Both editors work on the raw edited state (not `data`), preserving the
  // "" effective date so the document keeps floating to today until a
  // date is actually chosen; `data` resolves it for display only.
  const chat = useNdaChat(
    edited,
    (patch) => setEdited((prev) => mergeNdaData(prev, patch)),
    initial?.transcript,
  );
  const today = useToday();
  const data = edited.effectiveDate
    ? edited
    : { ...edited, effectiveDate: today };

  // Auto-save snapshots the raw `edited` (not the display-resolved `data`),
  // so an untouched document doesn't look "changed" every new day.
  const { status: saveStatus } = useAutoSave({
    initialId: restoredId,
    documentKey: MUTUAL_NDA_KEY,
    title: deriveNdaTitle(edited),
    data: { nda: edited, transcript: chat.messages },
    enabled:
      JSON.stringify(edited) !== DEFAULT_NDA_SNAPSHOT ||
      chat.messages.length > 1,
  });

  const downloadMarkdown = () => {
    const blob = new Blob([generateMarkdown(data)], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = markdownFilename(data);
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader
        title="Mutual NDA creator"
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
              onClick={() => window.print()}
              className="rounded-md border border-gray-text/40 px-3.5 py-2 text-sm font-medium text-navy transition-colors hover:border-blue-primary hover:text-blue-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-primary"
            >
              Print or save as PDF
            </button>
            <button
              type="button"
              onClick={downloadMarkdown}
              className="rounded-md bg-purple-secondary px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-secondary"
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
          <h1 className="sr-only">Create a Mutual Non-Disclosure Agreement</h1>
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
              />
            </div>
          ) : (
            <div
              id="panel-manual"
              role="tabpanel"
              aria-labelledby="tab-manual"
              className="min-h-0 flex-1 px-5 py-6 sm:px-8 lg:overflow-y-auto"
            >
              <p className="mb-2 text-sm leading-relaxed text-gray-text">
                Fill in the details below. The agreement on the right updates as you
                type, and you can download it when you&apos;re done.
              </p>
              <NdaForm data={edited} today={today} onChange={setEdited} />
            </div>
          )}
        </div>

        <div className="doc-pane bg-desk px-4 py-8 sm:px-8 lg:overflow-y-auto lg:[height:calc(100dvh-3.8rem)]">
          <div className="paper">
            <NdaDocument data={data} />
          </div>
        </div>
      </main>
    </div>
  );
}
