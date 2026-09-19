import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  parseTemplate,
  plainText,
  type ClauseNode,
  type InlineNode,
} from "@/lib/template-parse";
import { FIXTURE_TEMPLATE } from "../helpers/template-fixtures";

// Vitest runs with cwd = frontend/; the template dataset lives at the repo
// root. (Runtime code never reads these files — they arrive over HTTP.)
function readTemplate(name: string): string {
  return readFileSync(resolve(process.cwd(), "..", "templates", name), "utf-8");
}

function collectInline(clauses: ClauseNode[]): InlineNode[] {
  const out: InlineNode[] = [];
  const walkInline = (nodes: InlineNode[]) => {
    for (const node of nodes) {
      out.push(node);
      if ("children" in node) walkInline(node.children);
    }
  };
  const walkClauses = (items: ClauseNode[]) => {
    for (const clause of items) {
      walkInline(clause.inline);
      walkClauses(clause.children);
    }
  };
  walkClauses(clauses);
  return out;
}

function maxDepth(clauses: ClauseNode[]): number {
  let depth = 0;
  for (const clause of clauses) {
    if (clause.children.length > 0) {
      depth = Math.max(depth, 1 + maxDepth(clause.children));
    }
  }
  return depth;
}

describe("parseTemplate on the construct fixture", () => {
  const parsed = parseTemplate(FIXTURE_TEMPLATE);
  const inline = collectInline(parsed.clauses);

  it("extracts the title and top-level clauses", () => {
    expect(parsed.title).toBe("Test Agreement");
    expect(parsed.clauses).toHaveLength(2);
  });

  it("classifies variable spans and strips possessives (both apostrophes)", () => {
    const variables = inline.filter((n) => n.t === "variable");
    expect(variables).toEqual(
      expect.arrayContaining([
        { t: "variable", name: "Subscription Period", suffix: "" },
        { t: "variable", name: "Customer", suffix: "" },
        { t: "variable", name: "Provider", suffix: "'s" },
        { t: "variable", name: "Customer", suffix: "’s" },
        { t: "variable", name: "Use Limits", suffix: "" },
        { t: "variable", name: "General Cap Amount", suffix: "" },
      ]),
    );
  });

  it("keeps a variable inside bold and headings as inline spans", () => {
    const bold = inline.find(
      (n) => n.t === "bold" && plainText(n.children).includes("General Cap"),
    );
    expect(bold).toBeDefined();
    const headings = inline.filter((n) => n.t === "heading");
    expect(headings.some((h) => h.level === 2)).toBe(true);
    expect(headings.some((h) => h.level === 3)).toBe(true);
  });

  it("nests to depth 3 (decimal > decimal > alpha > roman)", () => {
    expect(maxDepth(parsed.clauses)).toBe(3);
    const deep = parsed.clauses[0].children[1].children[0].children[0];
    expect(plainText(deep.inline)).toContain("deep roman item");
  });

  it("repairs schemeless links and parses autolinks", () => {
    const links = inline.filter((n) => n.t === "link");
    expect(links.some((l) => l.href === "https://commonpaper.com/x")).toBe(true);
    expect(links.some((l) => l.href === "https://example.com")).toBe(true);
  });

  it("never leaks span markup into text nodes", () => {
    for (const node of inline) {
      if (node.t === "text") {
        expect(node.v).not.toMatch(/<\/?span/);
      }
    }
  });
});

describe("parseTemplate on the real templates", () => {
  it("parses CSA.md fully", () => {
    const parsed = parseTemplate(readTemplate("CSA.md"));
    expect(parsed.title).toBe("Cloud Service Agreement");
    expect(parsed.clauses).toHaveLength(13);
    const inline = collectInline(parsed.clauses);
    const names = new Set(
      inline.filter((n) => n.t === "variable").map((n) => n.name),
    );
    expect(names.has("Customer")).toBe(true);
    expect(names.has("General Cap Amount")).toBe(true);
    // The stray </span> on the "Variable" definition must not leak.
    for (const node of inline) {
      if (node.t === "text") expect(node.v).not.toMatch(/<\/?span/);
    }
  });

  it("parses DPA.md incl. its depth-3 nesting", () => {
    const parsed = parseTemplate(readTemplate("DPA.md"));
    expect(parsed.title).toBe("Data Processing Agreement");
    expect(maxDepth(parsed.clauses)).toBeGreaterThanOrEqual(3);
  });

  it("repairs Partnership-Agreement.md's schemeless link", () => {
    const parsed = parseTemplate(readTemplate("Partnership-Agreement.md"));
    const links = collectInline(parsed.clauses).filter((n) => n.t === "link");
    for (const link of links) {
      expect(link.href).toMatch(/^(https?:|#|\/)/);
    }
  });

  it("parses every generic template without leaking markup", () => {
    const files = [
      "CSA.md",
      "design-partner-agreement.md",
      "sla.md",
      "psa.md",
      "DPA.md",
      "Software-License-Agreement.md",
      "Partnership-Agreement.md",
      "BAA.md",
      "Pilot-Agreement.md",
      "AI-Addendum.md",
    ];
    for (const file of files) {
      const parsed = parseTemplate(readTemplate(file));
      expect(parsed.title).not.toBe("");
      expect(parsed.clauses.length).toBeGreaterThan(0);
      for (const node of collectInline(parsed.clauses)) {
        if (node.t === "text") expect(node.v).not.toMatch(/<\/?span/);
      }
    }
  });
});
