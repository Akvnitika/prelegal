import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChatPanel } from "@/components/chat-panel";
import { type ChatMessage } from "@/lib/chat";

const MESSAGES: ChatMessage[] = [
  { role: "assistant", content: "Who are the parties?" },
  { role: "user", content: "Acme and Globex" },
];

function renderPanel(overrides: Partial<Parameters<typeof ChatPanel>[0]> = {}) {
  const props = {
    messages: MESSAGES,
    sending: false,
    error: null,
    onSend: vi.fn(),
    onRetry: vi.fn(),
    ...overrides,
  };
  render(<ChatPanel {...props} />);
  return props;
}

describe("ChatPanel", () => {
  it("renders the transcript in an accessible live log", () => {
    renderPanel();
    const log = screen.getByRole("log", {
      name: "Conversation with the drafting assistant",
    });
    expect(log).toHaveTextContent("Who are the parties?");
    expect(log).toHaveTextContent("Acme and Globex");
  });

  it("sends the typed message and clears the input", async () => {
    const user = userEvent.setup();
    const props = renderPanel();

    const input = screen.getByLabelText("Message the drafting assistant");
    await user.type(input, "Delaware law");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(props.onSend).toHaveBeenCalledWith("Delaware law");
    expect(input).toHaveValue("");
  });

  it("sends on Enter and inserts a newline on Shift+Enter", async () => {
    const user = userEvent.setup();
    const props = renderPanel();

    const input = screen.getByLabelText("Message the drafting assistant");
    await user.type(input, "line one{Shift>}{Enter}{/Shift}line two");
    expect(props.onSend).not.toHaveBeenCalled();
    expect(input).toHaveValue("line one\nline two");

    await user.type(input, "{Enter}");
    expect(props.onSend).toHaveBeenCalledWith("line one\nline two");
  });

  it("disables the send button while the input is empty", () => {
    renderPanel();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });

  it("shows the typing indicator and disables input while sending", () => {
    renderPanel({ sending: true });
    expect(screen.getByText("Thinking…")).toBeInTheDocument();
    expect(screen.getByLabelText("Message the drafting assistant")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });

  it("shows the error with a retry button", async () => {
    const user = userEvent.setup();
    const props = renderPanel({ error: "The assistant couldn't respond." });

    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't respond/i);
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(props.onRetry).toHaveBeenCalledTimes(1);
  });
});
