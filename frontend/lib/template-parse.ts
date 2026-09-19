/**
 * Parser for the Common Paper standard-terms templates (templates/*.md as
 * served by GET /api/documents/{key}).
 *
 * The dialect is narrow: a "# Title" line, then nested ordered-list items
 * (4-space indent per level, "1."/"a."/"i." markers), with inline
 * `<span class="header_2|header_3">`, variable spans
 * (`coverpage_link`/`orderform_link`/`keyterms_link`/`sow_link`/
 * `businessterms_link`, possibly possessive like "Customer's"), `**bold**`
 * (which may wrap spans), `[text](url)` links, and `<https://...>`
 * autolinks. Everything unknown degrades to plain text — never throw.
 */

export type InlineNode =
  | { t: "text"; v: string }
  | { t: "bold"; children: InlineNode[] }
  | { t: "link"; href: string; children: InlineNode[] }
  | { t: "heading"; level: 2 | 3; children: InlineNode[] }
  | { t: "variable"; name: string; suffix: string };

export interface ClauseNode {
  inline: InlineNode[];
  children: ClauseNode[];
}

export interface ParsedTemplate {
  title: string;
  clauses: ClauseNode[];
}

const VARIABLE_CLASSES = new Set([
  "coverpage_link",
  "orderform_link",
  "keyterms_link",
  "sow_link",
  "businessterms_link",
]);

const SPAN_OPEN_RE = /^<span\b([^>]*)>/;
const AUTOLINK_RE = /^<(https?:\/\/[^>\s]+)>/;

function attr(attrs: string, name: string): string | null {
  const match = new RegExp(`${name}="([^"]*)"`).exec(attrs);
  return match ? match[1] : null;
}

export function plainText(nodes: InlineNode[]): string {
  return nodes
    .map((n) => {
      if (n.t === "text") return n.v;
      if (n.t === "variable") return n.name + n.suffix;
      return plainText(n.children);
    })
    .join("");
}

/** Finds the matching </span> for an open tag ending at `from`, honouring
 * nested spans. Returns the index of the closing tag, or -1. */
function findSpanClose(src: string, from: number): number {
  let depth = 1;
  let pos = from;
  while (pos < src.length) {
    const open = src.indexOf("<span", pos);
    const close = src.indexOf("</span>", pos);
    if (close === -1) return -1;
    if (open !== -1 && open < close) {
      depth += 1;
      pos = open + 5;
    } else {
      depth -= 1;
      if (depth === 0) return close;
      pos = close + 7;
    }
  }
  return -1;
}

export function parseInline(src: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let pos = 0;
  let textStart = 0;

  const flushText = (end: number) => {
    if (end > textStart) nodes.push({ t: "text", v: src.slice(textStart, end) });
  };

  while (pos < src.length) {
    const ch = src[pos];

    if (ch === "*" && src.startsWith("**", pos)) {
      const close = src.indexOf("**", pos + 2);
      if (close === -1) {
        pos += 2; // no closing marker: leave the ** as literal text
        continue;
      }
      flushText(pos);
      nodes.push({
        t: "bold",
        children: parseInline(src.slice(pos + 2, close)),
      });
      pos = close + 2;
      textStart = pos;
      continue;
    }

    if (ch === "<") {
      const autolink = AUTOLINK_RE.exec(src.slice(pos));
      if (autolink) {
        flushText(pos);
        nodes.push({
          t: "link",
          href: autolink[1],
          children: [{ t: "text", v: autolink[1] }],
        });
        pos += autolink[0].length;
        textStart = pos;
        continue;
      }
      if (src.startsWith("</span>", pos)) {
        // Stray closer with no matching open (occurs once in CSA.md):
        // consume and drop it silently.
        flushText(pos);
        pos += 7;
        textStart = pos;
        continue;
      }
      const open = SPAN_OPEN_RE.exec(src.slice(pos));
      if (open) {
        const innerStart = pos + open[0].length;
        const closeAt = findSpanClose(src, innerStart);
        if (closeAt === -1) {
          pos += open[0].length; // unclosed: render the rest as text
          continue;
        }
        flushText(pos);
        const inner = parseInline(src.slice(innerStart, closeAt));
        const cls = attr(open[1], "class");
        if (cls && VARIABLE_CLASSES.has(cls)) {
          const raw = plainText(inner).trim();
          const possessive = /^(.*?)(['’]s)$/.exec(raw);
          nodes.push({
            t: "variable",
            name: possessive ? possessive[1] : raw,
            suffix: possessive ? possessive[2] : "",
          });
        } else if (cls === "header_2" || cls === "header_3") {
          nodes.push({
            t: "heading",
            level: cls === "header_2" ? 2 : 3,
            children: inner,
          });
        } else {
          // id-only anchors and unknown classes are transparent.
          nodes.push(...inner);
        }
        pos = closeAt + 7;
        textStart = pos;
        continue;
      }
    }

    if (ch === "[") {
      const closeBracket = src.indexOf("](", pos);
      const closeParen = closeBracket === -1 ? -1 : src.indexOf(")", closeBracket + 2);
      if (closeBracket !== -1 && closeParen !== -1) {
        flushText(pos);
        let href = src.slice(closeBracket + 2, closeParen).trim();
        if (!/^([a-z][a-z0-9+.-]*:|#|\/)/i.test(href)) href = `https://${href}`;
        nodes.push({
          t: "link",
          href,
          children: parseInline(src.slice(pos + 1, closeBracket)),
        });
        pos = closeParen + 1;
        textStart = pos;
        continue;
      }
    }

    pos += 1;
  }
  flushText(pos);
  return nodes;
}

const ITEM_RE = /^( *)((?:\d{1,3}|[A-Za-z]{1,4})[.)])\s+(\S.*)$/;

export function parseTemplate(markdown: string): ParsedTemplate {
  const clauses: ClauseNode[] = [];
  const stack: { depth: number; items: ClauseNode[] }[] = [
    { depth: -1, items: clauses },
  ];
  let title = "";

  for (const line of markdown.split(/\r?\n/)) {
    if (!line.trim()) continue;
    if (!title && line.startsWith("# ")) {
      title = line.slice(2).trim();
      continue;
    }

    const item = ITEM_RE.exec(line);
    if (item) {
      const depth = Math.min(Math.round(item[1].length / 4), 8);
      while (stack.length > 1 && depth < stack[stack.length - 1].depth) {
        stack.pop();
      }
      let frame = stack[stack.length - 1];
      if (depth > frame.depth) {
        const parent = frame.items[frame.items.length - 1];
        const items = parent ? parent.children : frame.items;
        frame = { depth, items };
        stack.push(frame);
      }
      frame.items.push({ inline: parseInline(item[3]), children: [] });
      continue;
    }

    // Continuation or free text: append to the most recent clause, or start
    // a top-level one if the document opens with prose (none do today).
    const frame = stack[stack.length - 1];
    const lastItem = frame.items[frame.items.length - 1];
    if (lastItem) {
      lastItem.inline.push(...parseInline(` ${line.trim()}`));
    } else {
      clauses.push({ inline: parseInline(line.trim()), children: [] });
    }
  }

  return { title, clauses };
}
