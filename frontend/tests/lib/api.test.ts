import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiPost } from "@/lib/api";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

afterEach(() => {
  fetchMock.mockReset();
});

describe("apiPost", () => {
  it("posts JSON to the given path and returns the parsed body", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    const result = await apiPost<{ ok: boolean }>("/api/thing", { a: 1 });

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/thing",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ a: 1 }),
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
      }),
    );
  });

  it("throws ApiError with the status on a non-2xx response", async () => {
    fetchMock.mockResolvedValue(new Response("nope", { status: 422 }));

    const error = await apiPost("/api/thing", {}).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(422);
    expect((error as ApiError).message).toBe("nope");
  });
});
