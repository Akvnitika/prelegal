import { DRAFT_NOTICE } from "@/lib/draft-notice";
import { type FieldMeta } from "@/lib/documents";
import {
  type ClauseNode,
  type InlineNode,
  type ParsedTemplate,
} from "@/lib/template-parse";

function roman(n: number): string {
  const table: [number, string][] = [
    [10, "x"],
    [9, "ix"],
    [5, "v"],
    [4, "iv"],
    [1, "i"],
  ];
  let out = "";
  let rest = n;
  for (const [value, glyph] of table) {
    while (rest >= value) {
      out += glyph;
      rest -= value;
    }
  }
  return out;
}

export function renderInlineToMarkdown(
  nodes: InlineNode[],
  fields: Record<string, string>,
): string {
  return nodes
    .map((node) => {
      switch (node.t) {
        case "text":
          return node.v;
        case "bold":
        case "heading":
          return `**${renderInlineToMarkdown(node.children, fields)}**`;
        case "link":
          return `[${renderInlineToMarkdown(node.children, fields)}](${node.href})`;
        case "variable": {
          const value = fields[node.name]?.trim();
          return (value || `[${node.name}]`) + node.suffix;
        }
      }
    })
    .join("");
}

function marker(depth: number, index: number, parentNumber: string): string {
  const n = index + 1;
  if (depth === 0) return `${n}.`;
  if (depth === 1) return `${parentNumber}${n}.`;
  if (depth === 2) return `${String.fromCharCode(96 + n)}.`;
  return `${roman(n)}.`;
}

function renderClauses(
  clauses: ClauseNode[],
  fields: Record<string, string>,
  depth: number,
  parentNumber: string,
): string[] {
  const lines: string[] = [];
  clauses.forEach((clause, index) => {
    const m = marker(depth, index, parentNumber);
    const indent = "    ".repeat(depth);
    lines.push(`${indent}${m} ${renderInlineToMarkdown(clause.inline, fields)}`);
    if (clause.children.length > 0) {
      const childParent = depth === 0 ? `${index + 1}.` : parentNumber;
      lines.push(
        ...renderClauses(clause.children, fields, depth + 1, childParent),
      );
    }
  });
  return lines;
}

/** Downloadable markdown: a Key Terms block with every field (filled or
 * [bracketed]) followed by the substituted standard terms. */
export function generateGenericMarkdown(
  parsed: ParsedTemplate,
  fieldMeta: FieldMeta[],
  fields: Record<string, string>,
): string {
  const lines = [
    `# ${parsed.title}`,
    "",
    `> ${DRAFT_NOTICE}`,
    "",
    "## Key Terms",
    "",
  ];
  let group = "";
  for (const field of fieldMeta) {
    if (field.group !== group) {
      group = field.group;
      lines.push(`**${group}**`, "");
    }
    const value = fields[field.name]?.trim();
    lines.push(`- **${field.label}**: ${value || `[${field.label}]`}`);
  }
  lines.push("", "## Standard Terms", "");
  lines.push(...renderClauses(parsed.clauses, fields, 0, ""));
  lines.push(
    "",
    `Based on the Common Paper ${parsed.title} standard terms, free to use ` +
      "under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).",
    "",
  );
  return lines.join("\n");
}

const PARTY_FIELD_NAMES = ["Provider", "Company", "Customer", "Partner"];

function slugify(text: string): string {
  return text
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function genericMarkdownFilename(
  documentName: string,
  fields: Record<string, string>,
): string {
  const parties = PARTY_FIELD_NAMES.map((name) => fields[name]?.trim())
    .filter((v): v is string => Boolean(v))
    .slice(0, 2)
    .map(slugify)
    .filter(Boolean);
  return [slugify(documentName), ...parties].join("-") + ".md";
}
