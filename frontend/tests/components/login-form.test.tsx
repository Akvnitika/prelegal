import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/components/login-form";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

const user = { id: 1, email: "jane@example.com", name: null };

afterEach(() => {
  fetchMock.mockReset();
  push.mockReset();
  window.localStorage.clear();
});

describe("LoginForm", () => {
  it("defaults to sign-in mode without a name field", () => {
    render(<LoginForm />);
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
  });

  it("toggles to sign-up mode with a name field", async () => {
    render(<LoginForm />);
    await userEvent.click(
      screen.getByRole("button", { name: /don't have an account/i }),
    );
    expect(
      screen.getByRole("heading", { name: "Create your account" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
  });

  it("signs in, stores the session, and navigates to /nda/", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ user }), { status: 200 }),
    );
    render(<LoginForm />);

    await userEvent.type(screen.getByLabelText("Email"), "jane@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "pw");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "jane@example.com", password: "pw" }),
      }),
    );
    expect(window.localStorage.getItem("prelegal.currentUser")).toBe(
      JSON.stringify(user),
    );
    expect(push).toHaveBeenCalledWith("/nda/");
  });

  it("signs up through the signup endpoint including the name", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ user }), { status: 200 }),
    );
    render(<LoginForm />);

    await userEvent.click(
      screen.getByRole("button", { name: /don't have an account/i }),
    );
    await userEvent.type(screen.getByLabelText("Name"), "Jane");
    await userEvent.type(screen.getByLabelText("Email"), "jane@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "pw");
    await userEvent.click(
      screen.getByRole("button", { name: "Create your account" }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/signup",
      expect.objectContaining({
        body: JSON.stringify({
          email: "jane@example.com",
          password: "pw",
          name: "Jane",
        }),
      }),
    );
    expect(push).toHaveBeenCalledWith("/nda/");
  });

  it("shows an error and stays put when the request fails", async () => {
    fetchMock.mockResolvedValue(new Response("boom", { status: 500 }));
    render(<LoginForm />);

    await userEvent.type(screen.getByLabelText("Email"), "jane@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "pw");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /something went wrong/i,
    );
    expect(push).not.toHaveBeenCalled();
    expect(window.localStorage.getItem("prelegal.currentUser")).toBeNull();
  });
});
