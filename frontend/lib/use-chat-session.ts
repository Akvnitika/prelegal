"use client";

import { useState } from "react";
import { type ChatMessage } from "@/lib/chat";
import { describeChatError } from "@/lib/chat-error";

export interface ChatSession {
  messages: ChatMessage[];
  sending: boolean;
  error: string | null;
  sendMessage: (text: string) => void;
  /** Runs a turn on the current transcript without a new user message —
   * used to let the assistant open the form conversation itself right
   * after a document is selected. */
  continueTurn: () => void;
  retry: () => void;
}

/**
 * The chat turn state machine shared by the NDA and generic document chats:
 * optimistic user append, one in-flight turn at a time, failed turns keep
 * the user's message so retry() re-sends the identical transcript.
 * `sendTurn`/`applyResponse` are read at send time, so props they close
 * over are always current.
 */
export function useChatSession<TResponse>(
  initial: () => ChatMessage[],
  sendTurn: (transcript: ChatMessage[]) => Promise<TResponse>,
  applyResponse: (response: TResponse) => string,
): ChatSession {
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (transcript: ChatMessage[]) => {
    setMessages(transcript);
    setSending(true);
    setError(null);
    try {
      const response = await sendTurn(transcript);
      const reply = applyResponse(response);
      setMessages([...transcript, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(describeChatError(err));
    } finally {
      setSending(false);
    }
  };

  const sendMessage = (text: string) => {
    const content = text.trim();
    if (!content || sending) return;
    void send([...messages, { role: "user", content }]);
  };

  const continueTurn = () => {
    if (sending || messages.length === 0) return;
    void send(messages);
  };

  // Re-sends the current transcript verbatim; works for failed user turns
  // and failed continuation turns alike.
  const retry = () => {
    if (sending || !error || messages.length === 0) return;
    void send(messages);
  };

  return { messages, sending, error, sendMessage, continueTurn, retry };
}
