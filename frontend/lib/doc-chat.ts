import { authorizedPost } from "@/lib/api";
import { type ChatMessage } from "@/lib/chat";
import { todayIso } from "@/lib/nda";

export interface DocChatResponseBody {
  reply: string;
  selectedDocument?: string;
  updates: Record<string, string>;
}

export const GREETING =
  "Hi! I can help you draft a legal agreement. What kind of document do you " +
  "need — or tell me about your situation and I'll suggest one.";

/** Fixed opener (no LLM call on page load); still sent as the first
 * transcript message so the model has full context. */
export const initialMessages = (): ChatMessage[] => [
  { role: "assistant", content: GREETING },
];

/** One stateless turn of the generic document chat. `documentKey` null means
 * the conversation is still choosing a document. */
export const postDocChat = (
  transcript: ChatMessage[],
  documentKey: string | null,
  fields: Record<string, string>,
) =>
  authorizedPost<DocChatResponseBody>("/api/doc-chat", {
    transcript,
    documentKey,
    fields,
    today: todayIso(),
  });
