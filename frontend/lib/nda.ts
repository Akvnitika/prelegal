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

/**
 * Sparse patch produced by the AI chat: only fields learned this turn are
 * set. `null` and `undefined` both mean "no change" — a patch can never
 * clear a field.
 */
export type PartyInfoPatch = { [K in keyof PartyInfo]?: PartyInfo[K] | null };

export type NdaDataPatch = {
  [K in keyof Omit<NdaData, "party1" | "party2">]?: NdaData[K] | null;
} & {
  party1?: PartyInfoPatch | null;
  party2?: PartyInfoPatch | null;
};

function mergeParty(
  base: PartyInfo,
  patch: PartyInfoPatch | null | undefined,
): PartyInfo {
  if (!patch) return base;
  const next = { ...base };
  for (const key of Object.keys(base) as (keyof PartyInfo)[]) {
    const value = patch[key];
    if (value !== null && value !== undefined) next[key] = value;
  }
  return next;
}

/** Applies a chat patch immutably; unset/null patch values keep the base. */
export function mergeNdaData(base: NdaData, patch: NdaDataPatch): NdaData {
  const next: NdaData = {
    ...base,
    party1: mergeParty(base.party1, patch.party1),
    party2: mergeParty(base.party2, patch.party2),
  };
  for (const key of Object.keys(patch) as (keyof NdaDataPatch)[]) {
    if (key === "party1" || key === "party2") continue;
    const value = patch[key];
    if (value !== null && value !== undefined) {
      (next as unknown as Record<string, unknown>)[key] = value;
    }
  }
  return next;
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
