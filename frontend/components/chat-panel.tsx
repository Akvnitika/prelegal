"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { type ChatMessage } from "@/lib/chat";

export interface QuickPick {
  label: string;
  prompt: string;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  sending: boolean;
  error: string | null;
  onSend: (text: string) => void;
  onRetry: () => void;
  /** Optional one-tap suggestions rendered above the input; clicking one
   * sends its prompt as a normal chat message. */
  quickPicks?: QuickPick[];
}

const BUBBLE_USER =
  "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-blue-primary " +
  "px-3.5 py-2 text-sm leading-relaxed text-white";
const BUBBLE_ASSISTANT =
  "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm border " +
  "border-gray-text/25 bg-white px-3.5 py-2 text-sm leading-relaxed text-navy";

/**
 * Presentational chat pane: transcript, typing indicator, error + retry, and
 * the input row. All state except the draft input lives in useNdaChat.
 */
export function ChatPanel({
  messages,
  sending,
  error,
  onSend,
  onRetry,
  quickPicks,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const wasSending = useRef(sending);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages.length, sending, error]);

  // After a turn completes the textarea was disabled and lost focus;
  // give it back so the user can keep typing.
  useEffect(() => {
    if (wasSending.current && !sending) inputRef.current?.focus();
    wasSending.current = sending;
  }, [sending]);

  const submit = () => {
    if (!input.trim() || sending) return;
    onSend(input);
    setInput("");
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={listRef}
        role="log"
        aria-live="polite"
        aria-label="Conversation with the drafting assistant"
        className="flex-1 space-y-3 overflow-y-auto px-5 py-4 sm:px-8"
      >
        {messages.map((message, index) => (
          <div
            key={index}
            className={message.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <p className={message.role === "user" ? BUBBLE_USER : BUBBLE_ASSISTANT}>
              {message.content}
            </p>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <p className={`${BUBBLE_ASSISTANT} text-gray-text`}>
              <span className="animate-pulse">Thinking…</span>
            </p>
          </div>
        )}
        {error && (
          <div role="alert" className="space-y-1.5">
            <p className="text-sm text-red-600">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="text-sm font-medium text-blue-primary hover:underline"
            >
              Try again
            </button>
          </div>
        )}
      </div>

      {quickPicks && quickPicks.length > 0 && (
        <div
          role="group"
          aria-label="Suggested documents"
          className="flex flex-wrap gap-1.5 border-t border-gray-text/25 px-5 py-2.5 sm:px-8"
        >
          {quickPicks.map((pick) => (
            <button
              key={pick.label}
              type="button"
              disabled={sending}
              onClick={() => onSend(pick.prompt)}
              className="rounded-full border border-blue-primary/40 px-3 py-1 text-xs font-medium text-blue-primary transition-colors hover:bg-blue-primary hover:text-white disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-primary"
            >
              {pick.label}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="border-t border-gray-text/25 px-5 py-3 sm:px-8"
      >
        <div className="flex items-end gap-2">
          <label htmlFor="chat-input" className="sr-only">
            Message the drafting assistant
          </label>
          <textarea
            id="chat-input"
            ref={inputRef}
            rows={2}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            placeholder="Type your reply…"
            className="flex-1 resize-none rounded-md border border-gray-text/40 px-3 py-2 text-sm text-navy placeholder:text-gray-text focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-primary disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="rounded-md bg-purple-secondary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-secondary disabled:opacity-60"
          >
            Send
          </button>
        </div>
        <p className="mt-1.5 text-xs text-gray-text">
          Enter to send · Shift+Enter for a new line
        </p>
        <p className="mt-1 text-xs text-gray-text">
          AI-generated drafts aren&apos;t legal advice — have a lawyer review
          before signing.
        </p>
      </form>
    </div>
  );
}
