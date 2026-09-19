"use client";

import { useState } from "react";
import { type ChatMessage } from "@/lib/chat";
import { describeChatError } from "@/lib/chat-error";
import { initialMessages, postDocChat } from "@/lib/doc-chat";

export interface DocChat {
  messages: ChatMessage[];
  sending: boolean;
  error: string | null;
  sendMessage: (text: string) => void;
  retry: () => void;
}

/**
 * Chat state for the generic document creator. `documentKey`/`fields` are
 * read at send time, so manual-tab edits are always included in the next
 * turn. On a response, `onSelectDocument` runs before `onFieldUpdates` so a
 * selection turn's eager field updates land on the newly selected document.
 */
export function useDocChat(
  documentKey: string | null,
  fields: Record<string, string>,
  onSelectDocument: (key: string) => void,
  onFieldUpdates: (patch: Record<string, string>) => void,
): DocChat {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (transcript: ChatMessage[]) => {
    setMessages(transcript);
    setSending(true);
    setError(null);
    try {
      const response = await postDocChat(transcript, documentKey, fields);
      setMessages([
        ...transcript,
        { role: "assistant", content: response.reply },
      ]);
      if (response.selectedDocument) onSelectDocument(response.selectedDocument);
      onFieldUpdates(response.updates ?? {});
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

  const retry = () => {
    if (sending || !error) return;
    if (messages[messages.length - 1]?.role !== "user") return;
    void send(messages);
  };

  return { messages, sending, error, sendMessage, retry };
}
