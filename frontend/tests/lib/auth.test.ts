import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearSession,
  readSession,
  signIn,
  signOut,
  signUp,
  storeSession,
} from "@/lib/auth";

const user = { id: 1, email: "jane@example.com", name: "Jane" };
const session = { token: "tok-123", user };
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
      new Response(JSON.stringify(session), { status: 200 }),
    );

    const response = await request({ email: user.email, password: "password123" });

    expect(response).toEqual(session);
    expect(fetchMock).toHaveBeenCalledWith(path, expect.anything());
  });
});

describe("session storage", () => {
  it("round-trips the token and user through localStorage", () => {
    storeSession(session);
    expect(readSession()).toEqual(session);
    clearSession();
    expect(readSession()).toBeNull();
  });

  it("returns null for corrupt stored data", () => {
    window.localStorage.setItem("prelegal.session", "{not json");
    expect(readSession()).toBeNull();
  });

  it("returns null for a stored value without a token", () => {
    window.localStorage.setItem("prelegal.session", JSON.stringify({ user }));
    expect(readSession()).toBeNull();
  });
});

describe("signOut", () => {
  it("posts to signout with the bearer token and clears the session", async () => {
    storeSession(session);
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await signOut();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/signout",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer tok-123" }),
      }),
    );
    expect(readSession()).toBeNull();
  });

  it("clears the session even when the server call fails", async () => {
    storeSession(session);
    fetchMock.mockRejectedValue(new Error("network down"));

    await signOut();

    expect(readSession()).toBeNull();
  });
});
