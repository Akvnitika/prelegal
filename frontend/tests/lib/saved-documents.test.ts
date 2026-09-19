import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultNdaData } from "@/lib/nda";
import {
  clearOpenHandoff,
  createSavedDocument,
  deriveGenericTitle,
  deriveNdaTitle,
  fetchSavedDocuments,
  formatUpdatedAt,
  peekOpenHandoff,
  setOpenHandoff,
} from "@/lib/saved-documents";
import { storeSession } from "@/lib/session";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

beforeEach(() => {
  storeSession({
    token: "tok-123",
    user: { id: 1, email: "t@example.com", name: null },
  });
});

afterEach(() => {
  fetchMock.mockReset();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe("CRUD wiring", () => {
  it("lists and creates with the bearer token", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ documents: [] }), { status: 200 }),
    );
    await fetchSavedDocuments();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/saved-documents",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer tok-123" }),
      }),
    );

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: 7 }), { status: 201 }),
    );
    await createSavedDocument({
      documentKey: "csa",
      title: "CSA",
      data: { fields: {}, transcript: [] },
    });
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/saved-documents",
      expect.objectContaining({ method: "POST" }),
    );
  });
});

describe("open handoff", () => {
  it("peek is repeatable (StrictMode-safe) until explicitly cleared", () => {
    setOpenHandoff(42);
    expect(peekOpenHandoff()).toBe(42);
    expect(peekOpenHandoff()).toBe(42);
    clearOpenHandoff();
    expect(peekOpenHandoff()).toBeNull();
  });

  it("rejects garbage values", () => {
    window.sessionStorage.setItem("prelegal.openSavedDocument", "nope");
    expect(peekOpenHandoff()).toBeNull();
  });
});

describe("titles", () => {
  it("derives generic titles from party-like fields", () => {
    expect(
      deriveGenericTitle("Cloud Service Agreement", {
        Provider: "Acme",
        Customer: "Globex",
      }),
    ).toBe("Cloud Service Agreement — Acme & Globex");
    expect(deriveGenericTitle("Pilot Agreement", {})).toBe("Pilot Agreement");
  });

  it("derives NDA titles from party companies", () => {
    const nda = defaultNdaData();
    nda.party1.company = "Acme";
    expect(deriveNdaTitle(nda)).toBe("Mutual NDA — Acme");
    expect(deriveNdaTitle(defaultNdaData())).toBe("Mutual NDA");
  });
});

describe("formatUpdatedAt", () => {
  const now = new Date("2026-09-19T12:00:00Z");

  it("scales from minutes to dates", () => {
    expect(formatUpdatedAt("2026-09-19T11:59:40Z", now)).toBe("just now");
    expect(formatUpdatedAt("2026-09-19T11:55:00Z", now)).toBe("5 minutes ago");
    expect(formatUpdatedAt("2026-09-19T09:00:00Z", now)).toBe("3 hours ago");
    expect(formatUpdatedAt("2026-09-01T09:00:00Z", now)).toBe("Sep 1, 2026");
  });
});
