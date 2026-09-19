import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { GREETING } from "@/lib/doc-chat";
import { useDocChat } from "@/lib/use-doc-chat";

const { postDocChatMock } = vi.hoisted(() => ({ postDocChatMock: vi.fn() }));

vi.mock("@/lib/doc-chat", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/doc-chat")>()),
  postDocChat: postDocChatMock,
}));

afterEach(() => {
  postDocChatMock.mockReset();
});

function setup(documentKey: string | null = null) {
  const calls: string[] = [];
  const onSelectDocument = vi.fn(() => calls.push("select"));
  const onFieldUpdates = vi.fn(() => calls.push("updates"));
  const fields = { Provider: "Acme" };
  const hook = renderHook(() =>
    useDocChat(documentKey, fields, onSelectDocument, onFieldUpdates),
  );
  return { hook, onSelectDocument, onFieldUpdates, fields, calls };
}

describe("useDocChat", () => {
  it("seeds the greeting without a network call", () => {
    const { hook } = setup();
    expect(hook.result.current.messages).toEqual([
      { role: "assistant", content: GREETING },
    ]);
    expect(postDocChatMock).not.toHaveBeenCalled();
  });

  it("posts the transcript with the current key and fields", async () => {
    postDocChatMock.mockResolvedValue({ reply: "ok", updates: {} });
    const { hook, fields } = setup("csa");

    act(() => hook.result.current.sendMessage("Globex is the customer"));
    await waitFor(() => expect(hook.result.current.sending).toBe(false));

    expect(postDocChatMock).toHaveBeenCalledWith(
      [
        { role: "assistant", content: GREETING },
        { role: "user", content: "Globex is the customer" },
      ],
      "csa",
      fields,
    );
    expect(hook.result.current.messages[2]).toEqual({
      role: "assistant",
      content: "ok",
    });
  });

  it("runs onSelectDocument before onFieldUpdates", async () => {
    postDocChatMock.mockResolvedValue({
      reply: "A pilot it is.",
      selectedDocument: "pilot-agreement",
      updates: { "Pilot Period": "60 days" },
    });
    const { hook, onSelectDocument, onFieldUpdates, calls } = setup();

    act(() => hook.result.current.sendMessage("something short-term"));
    await waitFor(() => expect(hook.result.current.sending).toBe(false));

    expect(onSelectDocument).toHaveBeenCalledWith("pilot-agreement");
    expect(onFieldUpdates).toHaveBeenCalledWith({ "Pilot Period": "60 days" });
    expect(calls).toEqual(["select", "updates"]);
  });

  it("keeps the user's message and reports the error on failure", async () => {
    postDocChatMock.mockRejectedValue(new ApiError(502, "down"));
    const { hook, onFieldUpdates } = setup();

    act(() => hook.result.current.sendMessage("Hello"));
    await waitFor(() => expect(hook.result.current.sending).toBe(false));

    expect(hook.result.current.error).toMatch(/couldn't respond/i);
    expect(hook.result.current.messages[1]).toEqual({
      role: "user",
      content: "Hello",
    });
    expect(onFieldUpdates).not.toHaveBeenCalled();
  });

  it("retry re-sends the same transcript", async () => {
    postDocChatMock.mockRejectedValueOnce(new ApiError(502, "down"));
    postDocChatMock.mockResolvedValueOnce({ reply: "Recovered", updates: {} });
    const { hook } = setup();

    act(() => hook.result.current.sendMessage("Hello"));
    await waitFor(() => expect(hook.result.current.error).not.toBeNull());
    act(() => hook.result.current.retry());
    await waitFor(() => expect(hook.result.current.sending).toBe(false));

    expect(postDocChatMock).toHaveBeenCalledTimes(2);
    expect(postDocChatMock.mock.calls[1][0]).toEqual(
      postDocChatMock.mock.calls[0][0],
    );
    expect(hook.result.current.error).toBeNull();
  });

  it("ignores empty input", () => {
    const { hook } = setup();
    act(() => hook.result.current.sendMessage("   "));
    expect(postDocChatMock).not.toHaveBeenCalled();
  });
});
