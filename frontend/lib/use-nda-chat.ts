"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api";
import { initialMessages, postChat, type ChatMessage } from "@/lib/chat";
import { type NdaData, type NdaDataPatch } from "@/lib/nda";

export interface NdaChat {
  messages: ChatMessage[];
  sending: boolean;
  error: string | null;
  sendMessage: (text: string) => void;
  retry: () => void;
}

function errorMessage(err: unknown): string {
  if (err instanceof ApiError && err.status === 503) {
    return (
      "AI chat isn't available right now — you can still fill everything " +
      "in from the Edit manually tab."
    );
  }
  return "The assistant couldn't respond. Please try again.";
}

/**
 * Chat state for the NDA creator. `data` is read at send time, so edits made
 * on the manual tab are always included in the next turn. On failure the
 * user's message stays in the transcript; retry() re-sends it unchanged.
 */
export function useNdaChat(
  data: NdaData,
  onPatch: (patch: NdaDataPatch) => void,
): NdaChat {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (transcript: ChatMessage[]) => {
    setMessages(transcript);
    setSending(true);
    setError(null);
    try {
      const response = await postChat(transcript, data);
      setMessages([
        ...transcript,
        { role: "assistant", content: response.reply },
      ]);
      onPatch(response.updates);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const sendMessage = (text: string) => {
    const content = text.trim();
    if (!content || sending) return;
    void send([...messages, { role: "user", content }]);
  };

  const retry = () => {
    if (sending || !error) return;
    if (messages[messages.length - 1]?.role !== "user") return;
    void send(messages);
  };

  return { messages, sending, error, sendMessage, retry };
}
