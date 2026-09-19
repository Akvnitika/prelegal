import {
  effectiveDateDisplay,
  pluralYears,
  SIGNATURE_ROWS,
  type NdaData,
} from "./nda";
import {
  STANDARD_TERMS,
  STANDARD_TERMS_URL,
  STANDARD_TERMS_VERSION,
} from "./standard-terms";
import { DRAFT_NOTICE } from "./draft-notice";
import { toPlainTerms } from "./rich-text";

function filled(value: string, placeholder: string): string {
  return value.trim() || `[${placeholder}]`;
}

function check(selected: boolean): string {
  return selected ? "- [x]" : "- [ ]";
}

/** Generates the complete MNDA (Cover Page + Standard Terms) as Markdown. */
export function generateMarkdown(data: NdaData): string {
  const effectiveDate = effectiveDateDisplay(data.effectiveDate, "[Effective date]");

  const lines: string[] = [
    "# Mutual Non-Disclosure Agreement",
    "",
    `> ${DRAFT_NOTICE}`,
    "",
    `This Mutual Non-Disclosure Agreement (the “MNDA”) consists of: (1) this Cover Page (“Cover Page”) and (2) the Common Paper Mutual NDA Standard Terms Version ${STANDARD_TERMS_VERSION} (“Standard Terms”) identical to those posted at ${STANDARD_TERMS_URL} and reproduced in full below. Any modifications of the Standard Terms should be made on the Cover Page, which will control over conflicts with the Standard Terms.`,
    "",
    "## Cover Page",
    "",
    "### Purpose",
    "",
    filled(data.purpose, "Purpose"),
    "",
    "### Effective Date",
    "",
    effectiveDate,
    "",
    "### MNDA Term",
    "",
    `${check(data.mndaTermKind === "expires")} Expires ${pluralYears(data.mndaTermYears)} from Effective Date.`,
    `${check(data.mndaTermKind === "untilTerminated")} Continues until terminated in accordance with the terms of the MNDA.`,
    "",
    "### Term of Confidentiality",
    "",
    `${check(data.confidentialityKind === "years")} ${pluralYears(data.confidentialityYears)} from Effective Date, but in the case of trade secrets until Confidential Information is no longer considered a trade secret under applicable laws.`,
    `${check(data.confidentialityKind === "perpetuity")} In perpetuity.`,
    "",
    "### Governing Law & Jurisdiction",
    "",
    `Governing Law: ${filled(data.governingLaw, "Governing law")}`,
    "",
    `Jurisdiction: ${filled(data.jurisdiction, "Jurisdiction")}`,
    "",
    "### MNDA Modifications",
    "",
    data.modifications.trim() || "None.",
    "",
    "By signing this Cover Page, each party agrees to enter into this MNDA as of the Effective Date.",
    "",
    "|  | Party 1 | Party 2 |",
    "| :--- | :---: | :---: |",
    "| Signature |  |  |",
    ...SIGNATURE_ROWS.map(
      (row) =>
        `| ${row.label} | ${row.pick(data.party1).trim()} | ${row.pick(data.party2).trim()} |`,
    ),
    "| Date |  |  |",
    "",
    "## Standard Terms",
    "",
  ];

  STANDARD_TERMS.forEach((section, i) => {
    lines.push(`${i + 1}. **${section.title}**. ${toPlainTerms(section.body)}`, "");
  });

  lines.push(
    `Common Paper Mutual Non-Disclosure Agreement (Version ${STANDARD_TERMS_VERSION}) free to use under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).`,
    "",
  );

  return lines.join("\n");
}

/** e.g. "Mutual-NDA-Acme-Inc-Globex-Corp.md" */
export function markdownFilename(data: NdaData): string {
  const slug = (value: string, fallback: string) => {
    const s = value.trim().replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return s || fallback;
  };
  return `Mutual-NDA-${slug(data.party1.company, "Party-1")}-${slug(data.party2.company, "Party-2")}.md`;
}
