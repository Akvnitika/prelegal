import { describe, expect, it } from "vitest";
import {
  generateGenericMarkdown,
  genericMarkdownFilename,
} from "@/lib/generic-markdown";
import { parseTemplate } from "@/lib/template-parse";
import {
  FIXTURE_FIELDS,
  FIXTURE_TEMPLATE,
} from "../helpers/template-fixtures";

const parsed = parseTemplate(FIXTURE_TEMPLATE);

describe("generateGenericMarkdown", () => {
  const markdown = generateGenericMarkdown(parsed, FIXTURE_FIELDS, {
    Customer: "Globex Corporation",
    Provider: "Acme Ltd",
  });

  it("leads with a Key Terms block listing every field", () => {
    expect(markdown).toContain("# Test Agreement");
    expect(markdown).toContain("## Key Terms");
    expect(markdown).toContain("- **Customer**: Globex Corporation");
    expect(markdown).toContain("- **Liability Cap**: [Liability Cap]");
    expect(markdown.indexOf("## Key Terms")).toBeLessThan(
      markdown.indexOf("## Standard Terms"),
    );
  });

  it("substitutes variables in the standard terms with possessives intact", () => {
    expect(markdown).toContain("Acme Ltd's product");
    expect(markdown).toContain("[Subscription Period]");
  });

  it("emits correctly nested literal markers", () => {
    expect(markdown).toContain("\n1. **Service**");
    expect(markdown).toContain("\n    1.1. **Access.**");
    expect(markdown).toContain("\n        a. nested alpha item");
    expect(markdown).toContain("\n            i. deep roman item");
  });

  it("leaves no span markup behind", () => {
    expect(markdown).not.toMatch(/<\/?span/);
  });
});

describe("genericMarkdownFilename", () => {
  it("slugs the document name plus up to two party fields", () => {
    expect(
      genericMarkdownFilename("Cloud Service Agreement", {
        Provider: "Acme Ltd",
        Customer: "Globex Corp.",
      }),
    ).toBe("Cloud-Service-Agreement-Acme-Ltd-Globex-Corp.md");
  });

  it("falls back to the document name alone", () => {
    expect(genericMarkdownFilename("Pilot Agreement", {})).toBe(
      "Pilot-Agreement.md",
    );
  });
});
