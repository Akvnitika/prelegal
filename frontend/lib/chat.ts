import { apiPost } from "@/lib/api";
import { todayIso, type NdaData, type NdaDataPatch } from "@/lib/nda";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponseBody {
  reply: string;
  updates: NdaDataPatch;
}

export const GREETING =
  "Hi! I'm here to help you put together a Mutual NDA. Tell me a bit about " +
  "the agreement — which two companies are involved, and what's the occasion?";

/**
 * The assistant's opener is a fixed string (no LLM call on page load). It is
 * still sent as the first transcript message so the model has full context.
 */
export const initialMessages = (): ChatMessage[] => [
  { role: "assistant", content: GREETING },
];

/**
 * One stateless chat turn: the full transcript and current field values go
 * up, a reply plus a sparse field patch comes back. `today` is stamped here
 * so "today" means the viewer's timezone, mirroring todayIso() elsewhere.
 */
export const postChat = (transcript: ChatMessage[], ndaData: NdaData) =>
  apiPost<ChatResponseBody>("/api/chat", {
    transcript,
    ndaData,
    today: todayIso(),
  });
