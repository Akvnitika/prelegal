import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type ChatMessage } from "@/lib/chat";
import { GREETING, initialMessages, postDocChat } from "@/lib/doc-chat";
import { storeSession } from "@/lib/session";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

beforeEach(() => {
  // postDocChat requires a session since PL-8; the token travels in headers
  // only, so the golden body fixtures are unaffected.
  storeSession({
    token: "tok-123",
    user: { id: 1, email: "tester@example.com", name: null },
  });
});

afterEach(() => {
  fetchMock.mockReset();
  vi.useRealTimers();
  window.localStorage.clear();
});

// Cross-stack contract fixtures: backend/tests/test_doc_chat_router.py
// asserts the same JSON, so drift on either side fails that side's suite.
const GOLDEN_TRANSCRIPT: ChatMessage[] = [
  { role: "assistant", content: "What document do you need?" },
  { role: "user", content: "A cloud subscription contract for our SaaS." },
];

const GOLDEN_REQUEST = {
  transcript: GOLDEN_TRANSCRIPT,
  documentKey: null,
  fields: {},
  today: "2026-09-19",
};

const GOLDEN_RESPONSE = {
  reply:
    "A Cloud Service Agreement fits — shall we start with your company's legal name?",
  selectedDocument: "csa",
  updates: {},
};

describe("initialMessages", () => {
  it("seeds the transcript with the fixed greeting", () => {
    expect(initialMessages()).toEqual([{ role: "assistant", content: GREETING }]);
    expect(initialMessages()).not.toBe(initialMessages());
  });
});

describe("postDocChat", () => {
  it("posts the golden request and parses the golden response", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 19, 12, 0, 0));
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(GOLDEN_RESPONSE), { status: 200 }),
    );

    const result = await postDocChat(GOLDEN_TRANSCRIPT, null, {});

    expect(result).toEqual(GOLDEN_RESPONSE);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/doc-chat",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(GOLDEN_REQUEST),
      }),
    );
  });

  it("sends the document key and current fields once filling", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 19, 12, 0, 0));
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ reply: "ok", updates: {} }), { status: 200 }),
    );

    await postDocChat([], "csa", { Provider: "Acme, Inc." });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.documentKey).toBe("csa");
    expect(body.fields).toEqual({ Provider: "Acme, Inc." });
  });
});
