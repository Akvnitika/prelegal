"use client";

import { useState, useSyncExternalStore } from "react";
import { NdaDocument } from "@/components/nda-document";
import { NdaForm } from "@/components/nda-form";
import { generateMarkdown, markdownFilename } from "@/lib/markdown";
import { defaultNdaData, todayIso } from "@/lib/nda";

const subscribeNever = () => () => {};

// Today's date in the viewer's timezone; empty during prerender so the
// server and client hydrate identical HTML.
function useToday(): string {
  return useSyncExternalStore(subscribeNever, todayIso, () => "");
}

export default function Home() {
  const [edited, setEdited] = useState(defaultNdaData);
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
        <div className="form-pane border-b border-rule bg-paper px-5 py-6 sm:px-8 lg:overflow-y-auto lg:border-b-0 lg:border-e lg:[height:calc(100dvh-3.8rem)]">
          <h1 className="sr-only">Create a Mutual Non-Disclosure Agreement</h1>
          <p className="mb-2 text-sm leading-relaxed text-ink/70">
            Fill in the details below. The agreement on the right updates as you type, and
            you can download it when you&apos;re done.
          </p>
          <NdaForm data={data} onChange={setEdited} />
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
