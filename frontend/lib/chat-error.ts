import { ApiError } from "@/lib/api";

/** User-facing copy for a failed chat turn, shared by both chat hooks. */
export function describeChatError(err: unknown): string {
  if (err instanceof ApiError && err.status === 503) {
    return (
      "AI chat isn't available right now — you can still fill everything " +
      "in from the Edit manually tab."
    );
  }
  return "The assistant couldn't respond. Please try again.";
}
