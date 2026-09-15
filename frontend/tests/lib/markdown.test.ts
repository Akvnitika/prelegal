import { describe, expect, it } from "vitest";
import { generateMarkdown, markdownFilename } from "@/lib/markdown";
import { DEFAULT_PURPOSE, defaultNdaData } from "@/lib/nda";
import { STANDARD_TERMS, STANDARD_TERMS_URL } from "@/lib/standard-terms";
import { filledData } from "../helpers/fixtures";

describe("generateMarkdown", () => {
  describe("cover page", () => {
    it("starts with the document title and intro", () => {
      const md = generateMarkdown(filledData());
      expect(md.startsWith("# Mutual Non-Disclosure Agreement\n")).toBe(true);
      expect(md).toContain(STANDARD_TERMS_URL);
    });

    it("includes the purpose, or a placeholder when blank", () => {
      expect(generateMarkdown(filledData())).toContain(
        "Evaluating a joint go-to-market partnership.",
      );
      const blank = { ...filledData(), purpose: "   " };
      expect(generateMarkdown(blank)).toContain("[Purpose]");
    });

    it("keeps the default purpose from defaultNdaData", () => {
      expect(generateMarkdown(defaultNdaData())).toContain(DEFAULT_PURPOSE);
    });

    it("formats the effective date and falls back when unset", () => {
      expect(generateMarkdown(filledData())).toContain("September 10, 2026");
      expect(generateMarkdown({ ...filledData(), effectiveDate: "" })).toContain(
        "[Effective date]",
      );
    });

    it("checks the selected MNDA term option only", () => {
      const md = generateMarkdown(filledData());
      expect(md).toContain("- [x] Expires 2 years from Effective Date.");
      expect(md).toContain(
        "- [ ] Continues until terminated in accordance with the terms of the MNDA.",
      );

      const flipped = generateMarkdown({
        ...filledData(),
        mndaTermKind: "untilTerminated",
      });
      expect(flipped).toContain("- [ ] Expires 2 years from Effective Date.");
      expect(flipped).toContain(
        "- [x] Continues until terminated in accordance with the terms of the MNDA.",
      );
    });

    it("checks the selected confidentiality option only", () => {
      const md = generateMarkdown(filledData());
      expect(md).toContain("- [x] 3 years from Effective Date");
      expect(md).toContain("- [ ] In perpetuity.");

      const flipped = generateMarkdown({
        ...filledData(),
        confidentialityKind: "perpetuity",
      });
      expect(flipped).toContain("- [ ] 3 years from Effective Date");
      expect(flipped).toContain("- [x] In perpetuity.");
    });

    it("uses singular year phrasing when the term is one year", () => {
      const md = generateMarkdown({
        ...filledData(),
        mndaTermYears: 1,
        confidentialityYears: 1,
      });
      expect(md).toContain("- [x] Expires 1 year from Effective Date.");
      expect(md).toContain("- [x] 1 year from Effective Date");
    });

    it("includes governing law and jurisdiction, with placeholders when blank", () => {
      const md = generateMarkdown(filledData());
      expect(md).toContain("Governing Law: Delaware");
      expect(md).toContain("Jurisdiction: New Castle County, Delaware");

      const blank = generateMarkdown({
        ...filledData(),
        governingLaw: "",
        jurisdiction: "  ",
      });
      expect(blank).toContain("Governing Law: [Governing law]");
      expect(blank).toContain("Jurisdiction: [Jurisdiction]");
    });

    it("renders modifications, defaulting to None.", () => {
      expect(generateMarkdown(filledData())).toContain(
        "Section 5 is amended to require 30 days' notice.",
      );
      expect(generateMarkdown({ ...filledData(), modifications: " " })).toContain(
        "None.",
      );
    });

    it("fills the signature table from both parties", () => {
      const md = generateMarkdown(filledData());
      expect(md).toContain("| Print name | Jordan Lee | Pat Kim |");
      expect(md).toContain("| Title | Chief Executive Officer | General Counsel |");
      expect(md).toContain("| Company | Acme, Inc. | Globex Corp |");
      expect(md).toContain(
        "| Notice address (email or postal) | legal@acme.com | 1 Globex Way, Springfield |",
      );
    });

    it("leaves signature table cells empty for missing party details", () => {
      const md = generateMarkdown(defaultNdaData());
      expect(md).toContain("| Print name |  |  |");
      expect(md).toContain("| Company |  |  |");
    });
  });

  describe("standard terms", () => {
    it("includes every section, numbered and bold-titled", () => {
      const md = generateMarkdown(filledData());
      STANDARD_TERMS.forEach((section, i) => {
        expect(md).toContain(`${i + 1}. **${section.title}**.`);
      });
    });

    it("replaces {{...}} cover-page references with plain text", () => {
      const md = generateMarkdown(filledData());
      expect(md).not.toContain("{{");
      expect(md).not.toContain("}}");
      expect(md).toContain("in connection with the Purpose");
      expect(md).toContain("commences on the Effective Date");
    });

    it("ends with the CC BY 4.0 attribution", () => {
      const md = generateMarkdown(filledData());
      expect(md).toContain(
        "free to use under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)",
      );
    });
  });

  it("produces stable output for a fully filled agreement", () => {
    expect(generateMarkdown(filledData())).toMatchSnapshot();
  });

  it("produces stable output for an empty agreement", () => {
    expect(generateMarkdown({ ...defaultNdaData(), purpose: "" })).toMatchSnapshot();
  });
});

describe("markdownFilename", () => {
  it("slugifies both company names", () => {
    expect(markdownFilename(filledData())).toBe(
      "Mutual-NDA-Acme-Inc-Globex-Corp.md",
    );
  });

  it("falls back to Party-1 / Party-2 when companies are blank", () => {
    expect(markdownFilename(defaultNdaData())).toBe("Mutual-NDA-Party-1-Party-2.md");
  });

  it("collapses runs of non-alphanumeric characters into single hyphens", () => {
    const data = filledData();
    data.party1.company = "  A/B  Testing & Sons!  ";
    data.party2.company = "C--D";
    expect(markdownFilename(data)).toBe("Mutual-NDA-A-B-Testing-Sons-C-D.md");
  });

  it("strips non-ASCII characters, falling back for fully non-Latin names", () => {
    const data = filledData();
    data.party1.company = "Müller GmbH";
    data.party2.company = "株式会社";
    expect(markdownFilename(data)).toBe("Mutual-NDA-M-ller-GmbH-Party-2.md");
  });

  it("falls back when a company has no alphanumeric characters at all", () => {
    const data = filledData();
    data.party1.company = "!!!";
    expect(markdownFilename(data)).toBe("Mutual-NDA-Party-1-Globex-Corp.md");
  });
});
