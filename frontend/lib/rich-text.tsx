import type { ReactNode } from "react";
import { coverAnchor } from "./standard-terms";

const MARKER = /(\*\*[^*]+\*\*|\{\{[^}]+\}\})/g;

/**
 * Renders a Standard Terms body string to React nodes. `**text**` becomes
 * bold; `{{Name}}` becomes a link to the matching Cover Page section.
 */
export function renderRichText(text: string): ReactNode[] {
  return text.split(MARKER).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("{{") && part.endsWith("}}")) {
      const name = part.slice(2, -2);
      return (
        <a key={i} className="term-ref" href={`#${coverAnchor(name)}`}>
          {name}
        </a>
      );
    }
    return part;
  });
}

/** Strips `{{Name}}` markers, leaving the plain defined-term name. */
export function toPlainTerms(text: string): string {
  return text.replace(/\{\{([^}]+)\}\}/g, "$1");
}
