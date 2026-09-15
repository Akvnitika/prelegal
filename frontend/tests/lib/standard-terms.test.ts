import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  STANDARD_TERMS,
  STANDARD_TERMS_URL,
  STANDARD_TERMS_VERSION,
  coverAnchor,
} from "@/lib/standard-terms";

/** Cover Page sections the document renders anchors for. */
const COVER_SECTIONS = [
  "Purpose",
  "Effective Date",
  "MNDA Term",
  "Term of Confidentiality",
  "Governing Law",
  "Jurisdiction",
];

describe("STANDARD_TERMS", () => {
  it("has eleven sections with unique, non-empty titles", () => {
    expect(STANDARD_TERMS).toHaveLength(11);
    const titles = STANDARD_TERMS.map((s) => s.title);
    expect(new Set(titles).size).toBe(titles.length);
    titles.forEach((t) => expect(t).not.toBe(""));
  });

  it("has a non-empty body for every section", () => {
    STANDARD_TERMS.forEach((s) => expect(s.body.trim().length).toBeGreaterThan(0));
  });

  it("only references Cover Page sections that exist", () => {
    for (const section of STANDARD_TERMS) {
      const refs = [...section.body.matchAll(/\{\{([^}]+)\}\}/g)].map((m) => m[1]);
      for (const ref of refs) {
        expect(COVER_SECTIONS).toContain(ref);
      }
    }
  });

  it("has balanced bold markers in every body", () => {
    for (const section of STANDARD_TERMS) {
      const markerCount = section.body.split("**").length - 1;
      expect(markerCount % 2).toBe(0);
    }
  });

  it("pins version 1.0 and its canonical URL", () => {
    expect(STANDARD_TERMS_VERSION).toBe("1.0");
    expect(STANDARD_TERMS_URL).toBe("https://commonpaper.com/standards/mutual-nda/1.0/");
  });
});

describe("transcription faithfulness", () => {
  // The app embeds the Common Paper terms transcribed from the repository's
  // template dataset. This diff guards against silent drift in either file:
  // the legal text shown to users must match the source template exactly.
  // The template dataset lives at the repository root. Search upward from
  // the cwd so the test works however vitest is launched (npm test runs it
  // from frontend/, IDE runners may use the repo root). import.meta.url is
  // no alternative: under the jsdom environment it is not a file: URL.
  function templatePath(): string {
    let dir = process.cwd();
    for (let i = 0; i < 5; i++) {
      const candidate = path.join(dir, "templates", "Mutual-NDA.md");
      if (existsSync(candidate)) return candidate;
      dir = path.dirname(dir);
    }
    throw new Error(`templates/Mutual-NDA.md not found above ${process.cwd()}`);
  }
  const template = readFileSync(templatePath(), "utf8");

  const templateSections = [...template.matchAll(/^(\d+)\. \*\*(.+?)\*\*\. (.+)$/gm)].map(
    (m) => ({
      number: Number(m[1]),
      title: m[2],
      body: m[3].replace(/<span class="coverpage_link">([^<]+)<\/span>/g, "{{$1}}"),
    }),
  );

  it("finds the same number of sections in the template", () => {
    expect(templateSections).toHaveLength(STANDARD_TERMS.length);
  });

  it("keeps the template's section order", () => {
    expect(templateSections.map((s) => s.number)).toEqual(
      STANDARD_TERMS.map((_, i) => i + 1),
    );
  });

  it.each(STANDARD_TERMS.map((section, i) => [section.title, i] as const))(
    "transcribes %j verbatim",
    (_title, i) => {
      expect(STANDARD_TERMS[i].title).toBe(templateSections[i].title);
      expect(STANDARD_TERMS[i].body).toBe(templateSections[i].body);
    },
  );

  it("matches the template's version and license footer", () => {
    expect(template).toContain(STANDARD_TERMS_URL);
    expect(template).toContain("CC BY 4.0");
  });
});

describe("coverAnchor", () => {
  it("lowercases and hyphenates section names", () => {
    expect(coverAnchor("Purpose")).toBe("cover-purpose");
    expect(coverAnchor("Effective Date")).toBe("cover-effective-date");
    expect(coverAnchor("MNDA Term")).toBe("cover-mnda-term");
    expect(coverAnchor("Term of Confidentiality")).toBe(
      "cover-term-of-confidentiality",
    );
  });

  it("collapses punctuation runs into single hyphens", () => {
    expect(coverAnchor("Governing Law & Jurisdiction")).toBe(
      "cover-governing-law-jurisdiction",
    );
  });

  it("produces a distinct anchor for every Cover Page section", () => {
    const anchors = COVER_SECTIONS.map(coverAnchor);
    expect(new Set(anchors).size).toBe(anchors.length);
  });
});
