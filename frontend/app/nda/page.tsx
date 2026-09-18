"use client";

import { useState, useSyncExternalStore } from "react";
import { ChatPanel } from "@/components/chat-panel";
import { NdaDocument } from "@/components/nda-document";
import { NdaForm } from "@/components/nda-form";
import { NdaTabs, type NdaTab } from "@/components/nda-tabs";
import { generateMarkdown, markdownFilename } from "@/lib/markdown";
import { defaultNdaData, mergeNdaData, todayIso } from "@/lib/nda";
import { useNdaChat } from "@/lib/use-nda-chat";

const subscribeNever = () => () => {};

// Today's date in the viewer's timezone; empty during prerender so the
// server and client hydrate identical HTML.
function useToday(): string {
  return useSyncExternalStore(subscribeNever, todayIso, () => "");
}

export default function Home() {
  const [edited, setEdited] = useState(defaultNdaData);
  const [tab, setTab] = useState<NdaTab>("chat");
  // The chat sends the raw edited state (not `data`), preserving the
  // "" effective date so the document keeps floating to today until a
  // date is actually chosen.
  const chat = useNdaChat(edited, (patch) =>
    setEdited((prev) => mergeNdaData(prev, patch)),
  );
  const today = useToday();
  const data = edited.effectiveDate
    ? edited
    : { ...edited, effectiveDate: today };

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
      <header className="app-header flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-rule bg-paper px-5 py-3 sm:px-8">
        <p className="font-serif text-xl font-semibold text-pine">prelegal</p>
        <p className="text-sm text-ink/70">Mutual NDA creator</p>
        <div className="ms-auto flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-md border border-rule px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:border-pine hover:text-pine focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine"
          >
            Print or save as PDF
          </button>
          <button
            type="button"
            onClick={downloadMarkdown}
            className="rounded-md bg-pine px-3.5 py-2 text-sm font-medium text-paper transition-colors hover:bg-pine-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine"
          >
            Download Markdown
          </button>
        </div>
      </header>

      <main className="flex-1 lg:grid lg:min-h-0 lg:grid-cols-[minmax(21rem,26rem)_1fr]">
        <div
          className={`form-pane flex flex-col border-b border-rule bg-paper lg:border-b-0 lg:border-e lg:[height:calc(100dvh-3.8rem)] ${
            tab === "chat" ? "max-lg:h-[70dvh]" : ""
          }`}
        >
          <h1 className="sr-only">Create a Mutual Non-Disclosure Agreement</h1>
          <div className="px-5 pt-4 sm:px-8">
            <NdaTabs active={tab} onChange={setTab} />
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
              <p className="mb-2 text-sm leading-relaxed text-ink/70">
                Fill in the details below. The agreement on the right updates as you
                type, and you can download it when you&apos;re done.
              </p>
              <NdaForm data={data} onChange={setEdited} />
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
