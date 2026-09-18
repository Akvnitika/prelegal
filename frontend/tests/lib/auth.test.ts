import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearSession,
  readSession,
  signIn,
  signUp,
  storeSession,
} from "@/lib/auth";

const user = { id: 1, email: "jane@example.com", name: "Jane" };
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

afterEach(() => {
  fetchMock.mockReset();
  window.localStorage.clear();
});

describe("signIn / signUp", () => {
  it.each([
    ["signIn", signIn, "/api/auth/login"],
    ["signUp", signUp, "/api/auth/signup"],
  ] as const)("%s posts credentials to %s", async (_name, request, path) => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ user }), { status: 200 }),
    );

    const response = await request({ email: user.email, password: "pw" });

    expect(response.user).toEqual(user);
    expect(fetchMock).toHaveBeenCalledWith(path, expect.anything());
  });
});

describe("session storage", () => {
  it("round-trips the current user through localStorage", () => {
    storeSession(user);
    expect(readSession()).toEqual(user);
    clearSession();
    expect(readSession()).toBeNull();
  });

  it("returns null for corrupt stored data", () => {
    window.localStorage.setItem("prelegal.currentUser", "{not json");
    expect(readSession()).toBeNull();
  });
});
