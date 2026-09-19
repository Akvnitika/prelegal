import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import {
  GREETING,
  initialMessages,
  postChat,
  type ChatMessage,
} from "@/lib/chat";
import { defaultNdaData } from "@/lib/nda";
import { storeSession } from "@/lib/session";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

beforeEach(() => {
  // postChat requires a session since PL-8; the token travels in headers
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

// Cross-stack contract fixtures: backend/tests/test_chat.py asserts the same
// JSON, so a shape or casing change on either side fails that side's suite.
const GOLDEN_TRANSCRIPT: ChatMessage[] = [
  {
    role: "assistant",
    content: "Which two companies are entering into this agreement?",
  },
  { role: "user", content: "Acme, Inc. and Globex Corporation. Delaware law." },
];

const GOLDEN_REQUEST = {
  transcript: GOLDEN_TRANSCRIPT,
  ndaData: defaultNdaData(),
  today: "2026-09-18",
};

const GOLDEN_RESPONSE = {
  reply: "Great — Acme and Globex it is, governed by Delaware law. Who signs for Acme?",
  updates: {
    governingLaw: "Delaware",
    party1: { company: "Acme, Inc." },
    party2: { company: "Globex Corporation" },
  },
};

describe("initialMessages", () => {
  it("seeds the transcript with the fixed greeting", () => {
    expect(initialMessages()).toEqual([{ role: "assistant", content: GREETING }]);
  });

  it("returns a fresh array on every call", () => {
    expect(initialMessages()).not.toBe(initialMessages());
  });
});

describe("postChat", () => {
  it("posts the golden request and parses the golden response", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 18, 12, 0, 0));
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(GOLDEN_RESPONSE), { status: 200 }),
    );

    const result = await postChat(GOLDEN_TRANSCRIPT, defaultNdaData());

    expect(result).toEqual(GOLDEN_RESPONSE);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/chat",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(GOLDEN_REQUEST),
      }),
    );
  });

  it("propagates ApiError on a non-2xx response", async () => {
    fetchMock.mockResolvedValue(new Response("nope", { status: 503 }));

    const error = await postChat([], defaultNdaData()).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(503);
  });
});
