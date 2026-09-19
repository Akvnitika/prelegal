import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api";
import { describeChatError } from "@/lib/chat-error";

describe("describeChatError", () => {
  it("points 503s at the manual tab", () => {
    expect(describeChatError(new ApiError(503, "not configured"))).toMatch(
      /edit manually tab/i,
    );
  });

  it("uses generic retry copy otherwise", () => {
    expect(describeChatError(new ApiError(502, "boom"))).toMatch(
      /couldn't respond/i,
    );
    expect(describeChatError(new Error("network"))).toMatch(/couldn't respond/i);
  });
});
