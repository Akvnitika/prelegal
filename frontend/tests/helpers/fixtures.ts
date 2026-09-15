import type { NdaData } from "@/lib/nda";

/** A fully filled agreement, shared across test files. */
export function filledData(): NdaData {
  return {
    purpose: "Evaluating a joint go-to-market partnership.",
    effectiveDate: "2026-09-10",
    mndaTermKind: "expires",
    mndaTermYears: 2,
    confidentialityKind: "years",
    confidentialityYears: 3,
    governingLaw: "Delaware",
    jurisdiction: "New Castle County, Delaware",
    modifications: "Section 5 is amended to require 30 days' notice.",
    party1: {
      company: "Acme, Inc.",
      name: "Jordan Lee",
      title: "Chief Executive Officer",
      address: "legal@acme.com",
    },
    party2: {
      company: "Globex Corp",
      name: "Pat Kim",
      title: "General Counsel",
      address: "1 Globex Way, Springfield",
    },
  };
}
