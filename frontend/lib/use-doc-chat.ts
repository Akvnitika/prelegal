"use client";

import { type ChatMessage } from "@/lib/chat";
import { initialMessages, postDocChat } from "@/lib/doc-chat";
import { useChatSession, type ChatSession } from "@/lib/use-chat-session";

export type DocChat = ChatSession;

/**
 * Chat state for the generic document creator. `documentKey`/`fields` are
 * read at send time, so manual-tab edits are always included in the next
 * turn. `onSelectDocument` runs before `onFieldUpdates`, so a selection
 * turn's eager field updates land on the newly selected document.
 */
export function useDocChat(
  documentKey: string | null,
  fields: Record<string, string>,
  onSelectDocument: (key: string) => void,
  onFieldUpdates: (patch: Record<string, string>) => void,
  restoredMessages?: ChatMessage[],
): DocChat {
  return useChatSession(
    () => restoredMessages ?? initialMessages(),
    (transcript) => postDocChat(transcript, documentKey, fields),
    (response) => {
      if (response.selectedDocument) onSelectDocument(response.selectedDocument);
      onFieldUpdates(response.updates ?? {});
      return response.reply;
    },
  );
}
