import { Fragment, type ReactNode } from "react";
import {
  type ClauseNode,
  type InlineNode,
  type ParsedTemplate,
} from "@/lib/template-parse";

/** Renders parsed inline nodes, substituting filled field values. */
export function renderInline(
  nodes: InlineNode[],
  fields: Record<string, string>,
): ReactNode {
  return nodes.map((node, index) => {
    switch (node.t) {
      case "text":
        return <Fragment key={index}>{node.v}</Fragment>;
      case "bold":
        return <strong key={index}>{renderInline(node.children, fields)}</strong>;
      case "link":
        return (
          <a key={index} href={node.href} target="_blank" rel="noreferrer">
            {renderInline(node.children, fields)}
          </a>
        );
      case "heading":
        return (
          <span
            key={index}
            className={`clause-heading clause-heading-${node.level}`}
          >
            {renderInline(node.children, fields)}
          </span>
        );
      case "variable": {
        const value = fields[node.name]?.trim();
        return (
          <Fragment key={index}>
            {value ? (
              <mark className="filled">{value}</mark>
            ) : (
              <span className="unfilled">[{node.name}]</span>
            )}
            {node.suffix}
          </Fragment>
        );
      }
    }
  });
}

function ClauseList({
  clauses,
  fields,
  depth,
}: {
  clauses: ClauseNode[];
  fields: Record<string, string>;
  depth: number;
}) {
  return (
    <ol className={depth === 0 ? "clauses" : undefined}>
      {clauses.map((clause, index) => (
        <li key={index}>
          {renderInline(clause.inline, fields)}
          {clause.children.length > 0 && (
            <ClauseList
              clauses={clause.children}
              fields={fields}
              depth={depth + 1}
            />
          )}
        </li>
      ))}
    </ol>
  );
}

/** The generic live preview: the real template text with variables filled
 * in (highlighted) or shown as [bracketed placeholders]. */
export function TemplateDocument({
  parsed,
  fields,
}: {
  parsed: ParsedTemplate;
  fields: Record<string, string>;
}) {
  return (
    <article
      className="nda-doc tmpl-doc"
      aria-label={`${parsed.title} preview`}
    >
      <h1>{parsed.title}</h1>
      <ClauseList clauses={parsed.clauses} fields={fields} depth={0} />
      <p className="doc-footer">
        Based on the Common Paper {parsed.title} standard terms, free to use
        under{" "}
        <a
          href="https://creativecommons.org/licenses/by/4.0/"
          target="_blank"
          rel="noreferrer"
        >
          CC BY 4.0
        </a>
        .
      </p>
    </article>
  );
}
