import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import CreatePage from "@/app/create/page";
import { GREETING } from "@/lib/doc-chat";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

// The chat backend is mocked at the lib boundary; catalog/detail fetches are
// mocked at the network boundary (their hooks call module-local fetchers).
const { postDocChatMock } = vi.hoisted(() => ({ postDocChatMock: vi.fn() }));

vi.mock("@/lib/doc-chat", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/doc-chat")>()),
  postDocChat: postDocChatMock,
}));

// Auto-save and restore are exercised in their own suites; stubbed here so
// late debounce timers never hit the network.
const { fetchSavedDocumentMock } = vi.hoisted(() => ({
  fetchSavedDocumentMock: vi.fn(),
}));

vi.mock("@/lib/saved-documents", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/saved-documents")>()),
  fetchSavedDocument: fetchSavedDocumentMock,
  createSavedDocument: vi.fn().mockResolvedValue({ id: 1 }),
  updateSavedDocument: vi.fn().mockResolvedValue({ id: 1 }),
}));

const CSA_SUMMARY = {
  key: "csa",
  name: "Cloud Service Agreement",
  description: "Cloud subscriptions.",
  about: "about",
  fields: [
    { name: "Provider", label: "Provider", hint: "Vendor.", group: "Parties" },
    { name: "Customer", label: "Customer", hint: "Client.", group: "Parties" },
    {
      name: "Governing Law",
      label: "Governing Law",
      hint: "State or country.",
      group: "Governing Law",
    },
  ],
};

const CSA_DETAIL = {
  ...CSA_SUMMARY,
  templateMarkdown:
    "# Cloud Service Agreement\n\n" +
    '1. <span class="header_2" id="1">Service</span>\n' +
    '    1. <span class="coverpage_link">Customer</span> may use the product ' +
    'from <span class="coverpage_link">Provider</span> under ' +
    '<span class="keyterms_link">Governing Law</span>.\n',
};

const fetchMock = vi.fn((url: string) => {
  if (url === "/api/documents") {
    return Promise.resolve(
      new Response(JSON.stringify({ documents: [CSA_SUMMARY] }), {
        status: 200,
      }),
    );
  }
  if (url === "/api/documents/csa") {
    return Promise.resolve(
      new Response(JSON.stringify(CSA_DETAIL), { status: 200 }),
    );
  }
  return Promise.resolve(new Response("not found", { status: 404 }));
});
vi.stubGlobal("fetch", fetchMock);

afterEach(() => {
  postDocChatMock.mockReset();
  fetchSavedDocumentMock.mockReset();
  push.mockReset();
  fetchMock.mockClear();
  window.sessionStorage.clear();
});

const KICKOFF_REPLY =
  "A CSA covers subscription access. First — who is the provider?";

/** Selection now triggers an automatic kick-off turn, so two responses are
 * queued: the selection reply, then the assistant's form opener. */
async function selectCsaViaChat(user: ReturnType<typeof userEvent.setup>) {
  postDocChatMock.mockResolvedValueOnce({
    reply: "A CSA fits your needs.",
    selectedDocument: "csa",
    updates: {},
  });
  postDocChatMock.mockResolvedValueOnce({
    reply: KICKOFF_REPLY,
    updates: {},
  });
  await user.type(
    screen.getByLabelText("Message the drafting assistant"),
    "We sell SaaS subscriptions",
  );
  await user.click(screen.getByRole("button", { name: "Send" }));
  await screen.findByText(KICKOFF_REPLY);
}

describe("CreatePage", () => {
  it("starts with the greeting, quick picks, gallery, and disabled exports", async () => {
    render(<CreatePage />);
    expect(screen.getByText(GREETING)).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: "Cloud Service Agreement" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Cloud subscriptions.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download Markdown" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Print or save as PDF" }),
    ).toBeDisabled();
  });

  it("selecting a document via chat loads its template into the preview", async () => {
    const user = userEvent.setup();
    render(<CreatePage />);
    await screen.findByRole("button", { name: "Cloud Service Agreement" });

    await selectCsaViaChat(user);

    const preview = within(
      await screen.findByRole("article", {
        name: "Cloud Service Agreement preview",
      }),
    );
    expect(preview.getByText("[Provider]")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Download Markdown" }),
    ).toBeEnabled();
    // Quick picks disappear once a document is active.
    expect(
      screen.queryByRole("group", { name: "Suggested documents" }),
    ).not.toBeInTheDocument();
  });

  it("automatically opens the form conversation after selection", async () => {
    const user = userEvent.setup();
    render(<CreatePage />);
    await screen.findByRole("button", { name: "Cloud Service Agreement" });

    await selectCsaViaChat(user);

    expect(postDocChatMock).toHaveBeenCalledTimes(2);
    const [transcript, key] = postDocChatMock.mock.calls[1];
    expect(key).toBe("csa");
    // The kick-off turn re-sends the transcript as-is — the assistant's
    // selection reply is the last message, with no new user message.
    expect(transcript[transcript.length - 1]).toEqual({
      role: "assistant",
      content: "A CSA fits your needs.",
    });
  });

  it("restores a saved document without re-running the kickoff", async () => {
    window.sessionStorage.setItem("prelegal.openSavedDocument", "9");
    fetchSavedDocumentMock.mockResolvedValue({
      id: 9,
      documentKey: "csa",
      title: "Cloud Service Agreement — Acme, Inc.",
      updatedAt: new Date().toISOString(),
      data: {
        fields: { Provider: "Acme, Inc." },
        transcript: [
          { role: "assistant", content: "Hi" },
          { role: "user", content: "a CSA please" },
          { role: "assistant", content: "Who is the provider?" },
        ],
      },
    });
    render(<CreatePage />);

    expect(await screen.findByText("Who is the provider?")).toBeInTheDocument();
    const preview = within(
      await screen.findByRole("article", {
        name: "Cloud Service Agreement preview",
      }),
    );
    expect(preview.getByText("Acme, Inc.")).toBeInTheDocument();
    // The restored transcript replaces the greeting, and the kickoff turn
    // must not re-fire for an already-selected document.
    expect(postDocChatMock).not.toHaveBeenCalled();
  });

  it("routes to /nda/ when the chat selects the Mutual NDA", async () => {
    const user = userEvent.setup();
    render(<CreatePage />);
    await screen.findByRole("button", { name: "Cloud Service Agreement" });

    postDocChatMock.mockResolvedValue({
      reply: "Taking you to the NDA creator.",
      selectedDocument: "mutual-nda",
      updates: {},
    });
    await user.type(
      screen.getByLabelText("Message the drafting assistant"),
      "just a mutual NDA",
    );
    await user.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/nda/"));
  });

  it("chat field updates reach the preview and the manual form, and manual edits reach the preview", async () => {
    const user = userEvent.setup();
    render(<CreatePage />);
    await screen.findByRole("button", { name: "Cloud Service Agreement" });
    await selectCsaViaChat(user);
    await screen.findByRole("article", {
      name: "Cloud Service Agreement preview",
    });

    postDocChatMock.mockResolvedValue({
      reply: "Noted — and the customer?",
      updates: { Provider: "Acme, Inc." },
    });
    await user.type(
      screen.getByLabelText("Message the drafting assistant"),
      "Acme Inc is the provider",
    );
    await user.click(screen.getByRole("button", { name: "Send" }));
    await screen.findByText("Noted — and the customer?");

    const preview = within(
      screen.getByRole("article", { name: "Cloud Service Agreement preview" }),
    );
    expect(preview.getByText("Acme, Inc.")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Edit manually" }));
    expect(screen.getByLabelText("Provider")).toHaveValue("Acme, Inc.");

    await user.type(screen.getByLabelText("Governing Law"), "England and Wales");
    expect(preview.getByText("England and Wales")).toBeInTheDocument();
  });
});
