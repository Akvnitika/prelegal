import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_PURPOSE,
  defaultNdaData,
  effectiveDateDisplay,
  emptyParty,
  formatEffectiveDate,
  pluralYears,
  SIGNATURE_ROWS,
  todayIso,
  type PartyInfo,
} from "@/lib/nda";

describe("emptyParty", () => {
  it("returns a party with every field blank", () => {
    expect(emptyParty()).toEqual({ company: "", name: "", title: "", address: "" });
  });

  it("returns a fresh object on every call", () => {
    const a = emptyParty();
    const b = emptyParty();
    expect(a).not.toBe(b);
  });
});

describe("defaultNdaData", () => {
  it("matches the documented defaults", () => {
    expect(defaultNdaData()).toEqual({
      purpose: DEFAULT_PURPOSE,
      effectiveDate: "",
      mndaTermKind: "expires",
      mndaTermYears: 1,
      confidentialityKind: "years",
      confidentialityYears: 1,
      governingLaw: "",
      jurisdiction: "",
      modifications: "",
      party1: { company: "", name: "", title: "", address: "" },
      party2: { company: "", name: "", title: "", address: "" },
    });
  });

  it("does not share party objects between the two parties or across calls", () => {
    const data = defaultNdaData();
    expect(data.party1).not.toBe(data.party2);
    expect(defaultNdaData().party1).not.toBe(data.party1);
  });
});

describe("formatEffectiveDate", () => {
  it("formats a full ISO date as a long-form date", () => {
    expect(formatEffectiveDate("2026-09-10")).toBe("September 10, 2026");
  });

  it("drops leading zeros from the day", () => {
    expect(formatEffectiveDate("2026-01-01")).toBe("January 1, 2026");
    expect(formatEffectiveDate("2026-01-09")).toBe("January 9, 2026");
  });

  it("maps every month number to its name", () => {
    const months = [
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
    months.forEach((name, i) => {
      const mm = String(i + 1).padStart(2, "0");
      expect(formatEffectiveDate(`2026-${mm}-15`)).toBe(`${name} 15, 2026`);
    });
  });

  it("never shifts the date by timezone (first and last day of year)", () => {
    // A Date-based parse of "2026-01-01" can render as Dec 31 in negative-UTC
    // offsets; the string parse must not.
    expect(formatEffectiveDate("2026-01-01")).toBe("January 1, 2026");
    expect(formatEffectiveDate("2026-12-31")).toBe("December 31, 2026");
  });

  it.each([
    "",
    "2026-9-1",
    "09-10-2026",
    "2026/09/10",
    "2026-09-10T00:00",
    "not a date",
  ])("returns null for malformed input %j", (input) => {
    expect(formatEffectiveDate(input)).toBeNull();
  });

  it("returns null for out-of-range months", () => {
    expect(formatEffectiveDate("2026-00-10")).toBeNull();
    expect(formatEffectiveDate("2026-13-10")).toBeNull();
  });

  it("does not range-check the day — the native date input never produces one", () => {
    expect(formatEffectiveDate("2026-09-00")).toBe("September 0, 2026");
  });
});

describe("effectiveDateDisplay", () => {
  it("formats a valid ISO date", () => {
    expect(effectiveDateDisplay("2026-09-10", "[fallback]")).toBe("September 10, 2026");
  });

  it("uses the fallback when the date is unset", () => {
    expect(effectiveDateDisplay("", "[fallback]")).toBe("[fallback]");
  });

  it("shows the raw value when set but unparseable", () => {
    expect(effectiveDateDisplay("tomorrow", "[fallback]")).toBe("tomorrow");
  });
});

describe("pluralYears", () => {
  it("uses the singular for exactly one year", () => {
    expect(pluralYears(1)).toBe("1 year");
  });

  it("uses the plural otherwise", () => {
    expect(pluralYears(2)).toBe("2 years");
    expect(pluralYears(99)).toBe("99 years");
  });
});

describe("SIGNATURE_ROWS", () => {
  const party: PartyInfo = {
    company: "Acme, Inc.",
    name: "Jordan Lee",
    title: "CEO",
    address: "legal@acme.com",
  };

  it("lists the signature-table rows in document order", () => {
    expect(SIGNATURE_ROWS.map((r) => r.label)).toEqual([
      "Print name",
      "Title",
      "Company",
      "Notice address (email or postal)",
    ]);
  });

  it("picks the matching field from a party", () => {
    expect(SIGNATURE_ROWS.map((r) => r.pick(party))).toEqual([
      "Jordan Lee",
      "CEO",
      "Acme, Inc.",
      "legal@acme.com",
    ]);
  });
});

describe("todayIso", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the local date as yyyy-mm-dd", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 25, 12, 0, 0));
    expect(todayIso()).toBe("2026-11-25");
  });

  it("zero-pads single-digit months and days", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 5, 12, 0, 0));
    expect(todayIso()).toBe("2026-03-05");
  });
});
