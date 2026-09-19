"use client";

import { initialMessages, postChat, type ChatMessage } from "@/lib/chat";
import { type NdaData, type NdaDataPatch } from "@/lib/nda";
import { useChatSession, type ChatSession } from "@/lib/use-chat-session";

export type NdaChat = ChatSession;

/**
 * Chat state for the NDA creator. `data` is read at send time, so edits made
 * on the manual tab are always included in the next turn.
 */
export function useNdaChat(
  data: NdaData,
  onPatch: (patch: NdaDataPatch) => void,
  restoredMessages?: ChatMessage[],
): NdaChat {
  return useChatSession(
    () => restoredMessages ?? initialMessages(),
    (transcript) => postChat(transcript, data),
    (response) => {
      onPatch(response.updates);
      return response.reply;
    },
  );
}
