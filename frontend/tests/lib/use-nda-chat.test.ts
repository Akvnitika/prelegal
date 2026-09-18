import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { GREETING } from "@/lib/chat";
import { defaultNdaData } from "@/lib/nda";
import { useNdaChat } from "@/lib/use-nda-chat";

const { postChatMock } = vi.hoisted(() => ({ postChatMock: vi.fn() }));

vi.mock("@/lib/chat", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/chat")>()),
  postChat: postChatMock,
}));

afterEach(() => {
  postChatMock.mockReset();
});

function setup() {
  const onPatch = vi.fn();
  const data = defaultNdaData();
  const hook = renderHook(() => useNdaChat(data, onPatch));
  return { hook, onPatch, data };
}

describe("useNdaChat", () => {
  it("seeds the transcript with the greeting and no network call", () => {
    const { hook } = setup();
    expect(hook.result.current.messages).toEqual([
      { role: "assistant", content: GREETING },
    ]);
    expect(postChatMock).not.toHaveBeenCalled();
  });

  it("appends the user message, posts the transcript, then appends the reply and patches", async () => {
    postChatMock.mockResolvedValue({
      reply: "Noted!",
      updates: { governingLaw: "Delaware" },
    });
    const { hook, onPatch, data } = setup();

    act(() => hook.result.current.sendMessage("  Delaware law please  "));

    expect(hook.result.current.sending).toBe(true);
    expect(hook.result.current.messages).toEqual([
      { role: "assistant", content: GREETING },
      { role: "user", content: "Delaware law please" },
    ]);
    expect(postChatMock).toHaveBeenCalledWith(
      [
        { role: "assistant", content: GREETING },
        { role: "user", content: "Delaware law please" },
      ],
      data,
    );

    await waitFor(() => expect(hook.result.current.sending).toBe(false));
    expect(hook.result.current.messages[2]).toEqual({
      role: "assistant",
      content: "Noted!",
    });
    expect(onPatch).toHaveBeenCalledWith({ governingLaw: "Delaware" });
    expect(hook.result.current.error).toBeNull();
  });

  it("ignores empty input", () => {
    const { hook } = setup();
    act(() => hook.result.current.sendMessage("   "));
    expect(postChatMock).not.toHaveBeenCalled();
    expect(hook.result.current.messages).toHaveLength(1);
  });

  it("keeps the user's message and sets an error when the request fails", async () => {
    postChatMock.mockRejectedValue(new ApiError(502, "bad gateway"));
    const { hook, onPatch } = setup();

    act(() => hook.result.current.sendMessage("Hello"));
    await waitFor(() => expect(hook.result.current.sending).toBe(false));

    expect(hook.result.current.error).toMatch(/couldn't respond/i);
    expect(hook.result.current.messages[1]).toEqual({
      role: "user",
      content: "Hello",
    });
    expect(onPatch).not.toHaveBeenCalled();
  });

  it("shows the not-configured message for a 503", async () => {
    postChatMock.mockRejectedValue(new ApiError(503, "not configured"));
    const { hook } = setup();

    act(() => hook.result.current.sendMessage("Hello"));
    await waitFor(() => expect(hook.result.current.sending).toBe(false));

    expect(hook.result.current.error).toMatch(/edit manually tab/i);
  });

  it("retry re-sends the same transcript and recovers", async () => {
    postChatMock.mockRejectedValueOnce(new ApiError(502, "boom"));
    postChatMock.mockResolvedValueOnce({ reply: "Recovered", updates: {} });
    const { hook, onPatch } = setup();

    act(() => hook.result.current.sendMessage("Hello"));
    await waitFor(() => expect(hook.result.current.error).not.toBeNull());

    act(() => hook.result.current.retry());
    await waitFor(() => expect(hook.result.current.sending).toBe(false));

    expect(postChatMock).toHaveBeenCalledTimes(2);
    expect(postChatMock.mock.calls[1][0]).toEqual(postChatMock.mock.calls[0][0]);
    expect(hook.result.current.error).toBeNull();
    expect(hook.result.current.messages[2]).toEqual({
      role: "assistant",
      content: "Recovered",
    });
    expect(onPatch).toHaveBeenCalledWith({});
  });

  it("retry does nothing without a prior error", () => {
    const { hook } = setup();
    act(() => hook.result.current.retry());
    expect(postChatMock).not.toHaveBeenCalled();
  });
});
