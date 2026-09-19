import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import DocumentsPage from "@/app/documents/page";
import { storeSession } from "@/lib/session";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const { fetchSavedDocumentsMock, deleteSavedDocumentMock } = vi.hoisted(() => ({
  fetchSavedDocumentsMock: vi.fn(),
  deleteSavedDocumentMock: vi.fn(),
}));

vi.mock("@/lib/saved-documents", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/saved-documents")>()),
  fetchSavedDocuments: fetchSavedDocumentsMock,
  deleteSavedDocument: deleteSavedDocumentMock,
}));

// The catalog fetch (open endpoint) resolves type names for rows.
const fetchMock = vi.fn(() =>
  Promise.resolve(
    new Response(
      JSON.stringify({
        documents: [
          {
            key: "csa",
            name: "Cloud Service Agreement",
            description: "",
            about: "",
            fields: [],
          },
        ],
      }),
      { status: 200 },
    ),
  ),
);
vi.stubGlobal("fetch", fetchMock);

const DOCS = [
  {
    id: 1,
    documentKey: "csa",
    title: "Cloud Service Agreement — Acme & Globex",
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    documentKey: "mutual-nda",
    title: "Mutual NDA — Acme",
    updatedAt: new Date().toISOString(),
  },
];

afterEach(() => {
  push.mockReset();
  fetchSavedDocumentsMock.mockReset();
  deleteSavedDocumentMock.mockReset();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

function signIn() {
  storeSession({
    token: "tok",
    user: { id: 1, email: "j@example.com", name: "Jane" },
  });
}

describe("DocumentsPage", () => {
  it("lists saved documents with their type and edit time", async () => {
    signIn();
    fetchSavedDocumentsMock.mockResolvedValue({ documents: DOCS });
    render(<DocumentsPage />);

    expect(
      await screen.findByText("Cloud Service Agreement — Acme & Globex"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Mutual Non-Disclosure Agreement · Edited/)).toBeInTheDocument();
    expect(
      screen
        .getByRole("link", { name: "Start a new document" })
        .getAttribute("href"),
    ).toMatch(/^\/create\/?$/);
  });

  it("shows the empty state inviting a first document", async () => {
    signIn();
    fetchSavedDocumentsMock.mockResolvedValue({ documents: [] });
    render(<DocumentsPage />);
    expect(await screen.findByText("No documents yet")).toBeInTheDocument();
  });

  it("opens a document via the handoff and routes by type", async () => {
    signIn();
    fetchSavedDocumentsMock.mockResolvedValue({ documents: DOCS });
    const user = userEvent.setup();
    render(<DocumentsPage />);
    await screen.findByText("Mutual NDA — Acme");

    const ndaRow = screen
      .getByText("Mutual NDA — Acme")
      .closest("li") as HTMLElement;
    await user.click(within(ndaRow).getByRole("button", { name: "Open" }));

    expect(window.sessionStorage.getItem("prelegal.openSavedDocument")).toBe("2");
    expect(push).toHaveBeenCalledWith("/nda/");
  });

  it("deletes only after inline confirmation", async () => {
    signIn();
    fetchSavedDocumentsMock.mockResolvedValue({ documents: [DOCS[0]] });
    deleteSavedDocumentMock.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<DocumentsPage />);
    const row = (await screen.findByText(/Acme & Globex/)).closest(
      "li",
    ) as HTMLElement;

    await user.click(within(row).getByRole("button", { name: "Delete" }));
    expect(deleteSavedDocumentMock).not.toHaveBeenCalled();
    expect(within(row).getByText("Delete this document?")).toBeInTheDocument();

    await user.click(within(row).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(deleteSavedDocumentMock).toHaveBeenCalledWith(1));
    await waitFor(() =>
      expect(screen.queryByText(/Acme & Globex/)).not.toBeInTheDocument(),
    );
  });

  it("shows a retryable error when loading fails", async () => {
    signIn();
    fetchSavedDocumentsMock.mockRejectedValueOnce(new Error("boom"));
    fetchSavedDocumentsMock.mockResolvedValueOnce({ documents: [] });
    const user = userEvent.setup();
    render(<DocumentsPage />);

    expect(
      await screen.findByText(/couldn't load your documents/i),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("No documents yet")).toBeInTheDocument();
  });
});
