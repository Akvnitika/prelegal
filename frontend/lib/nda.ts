export interface PartyInfo {
  company: string;
  name: string;
  title: string;
  address: string;
}

export interface NdaData {
  purpose: string;
  effectiveDate: string; // yyyy-mm-dd, empty until chosen
  mndaTermKind: "expires" | "untilTerminated";
  mndaTermYears: number;
  confidentialityKind: "years" | "perpetuity";
  confidentialityYears: number;
  governingLaw: string;
  jurisdiction: string;
  modifications: string;
  party1: PartyInfo;
  party2: PartyInfo;
}

export const DEFAULT_PURPOSE =
  "Evaluating whether to enter into a business relationship with the other party.";

export function emptyParty(): PartyInfo {
  return { company: "", name: "", title: "", address: "" };
}

export function defaultNdaData(): NdaData {
  return {
    purpose: DEFAULT_PURPOSE,
    effectiveDate: "",
    mndaTermKind: "expires",
    mndaTermYears: 1,
    confidentialityKind: "years",
    confidentialityYears: 1,
    governingLaw: "",
    jurisdiction: "",
    modifications: "",
    party1: emptyParty(),
    party2: emptyParty(),
  };
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Formats a yyyy-mm-dd string as "September 9, 2026". Parses the parts
 * directly so the date is never shifted by the viewer's timezone.
 */
export function formatEffectiveDate(iso: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return null;
  return `${month} ${Number(match[3])}, ${Number(match[1])}`;
}

/** iso formatted for display, falling back when unset or unparseable. */
export function effectiveDateDisplay(iso: string, fallback: string): string {
  return iso ? (formatEffectiveDate(iso) ?? iso) : fallback;
}

/** Signature-table rows, shared by the document preview and Markdown export. */
export const SIGNATURE_ROWS: { label: string; pick: (p: PartyInfo) => string }[] = [
  { label: "Print name", pick: (p) => p.name },
  { label: "Title", pick: (p) => p.title },
  { label: "Company", pick: (p) => p.company },
  { label: "Notice address (email or postal)", pick: (p) => p.address },
];

export function pluralYears(n: number): string {
  return n === 1 ? "1 year" : `${n} years`;
}

export function todayIso(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${mm}-${dd}`;
}
