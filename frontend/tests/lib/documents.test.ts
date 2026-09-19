import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchDocument,
  fetchDocuments,
  useDocumentCatalog,
  useDocumentDetail,
} from "@/lib/documents";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

afterEach(() => {
  fetchMock.mockReset();
});

const SUMMARY = {
  key: "csa",
  name: "Cloud Service Agreement",
  description: "desc",
  about: "about",
  fields: [
    { name: "Provider", label: "Provider", hint: "h", group: "Parties" },
  ],
};

describe("fetchers", () => {
  it("hit the documents endpoints", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ documents: [SUMMARY] }), { status: 200 }),
    );
    await fetchDocuments();
    expect(fetchMock).toHaveBeenCalledWith("/api/documents", expect.anything());

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(SUMMARY), { status: 200 }),
    );
    await fetchDocument("csa");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/documents/csa",
      expect.anything(),
    );
  });
});

describe("useDocumentCatalog", () => {
  it("loads the catalog", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ documents: [SUMMARY] }), { status: 200 }),
    );
    const hook = renderHook(() => useDocumentCatalog());
    await waitFor(() =>
      expect(hook.result.current.documents).toHaveLength(1),
    );
    expect(hook.result.current.error).toBeNull();
  });

  it("reports failures and retries", async () => {
    fetchMock.mockResolvedValueOnce(new Response("boom", { status: 500 }));
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ documents: [SUMMARY] }), { status: 200 }),
    );
    const hook = renderHook(() => useDocumentCatalog());
    await waitFor(() => expect(hook.result.current.error).not.toBeNull());

    hook.result.current.retry();
    await waitFor(() =>
      expect(hook.result.current.documents).toHaveLength(1),
    );
    expect(hook.result.current.error).toBeNull();
  });
});

describe("useDocumentDetail", () => {
  it("stays idle with a null key and fetches when set", async () => {
    const detail = { ...SUMMARY, templateMarkdown: "# Cloud Service Agreement" };
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(detail), { status: 200 }),
    );
    const hook = renderHook(({ key }) => useDocumentDetail(key), {
      initialProps: { key: null as string | null },
    });
    expect(hook.result.current.detail).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();

    hook.rerender({ key: "csa" });
    await waitFor(() =>
      expect(hook.result.current.detail?.templateMarkdown).toContain("Cloud"),
    );
  });
});
