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
const session = { token: "tok-123", user };

afterEach(() => {
  fetchMock.mockReset();
  push.mockReset();
  window.localStorage.clear();
});

async function submitSignIn() {
  await userEvent.type(screen.getByLabelText("Email"), "jane@example.com");
  await userEvent.type(screen.getByLabelText("Password"), "password123");
  await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
}

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

  it("signs in, stores the session with its token, and navigates to /documents/", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(session), { status: 200 }),
    );
    render(<LoginForm />);

    await submitSignIn();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          email: "jane@example.com",
          password: "password123",
        }),
      }),
    );
    expect(window.localStorage.getItem("prelegal.session")).toBe(
      JSON.stringify(session),
    );
    expect(push).toHaveBeenCalledWith("/documents/");
  });

  it("signs up through the signup endpoint including the name", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(session), { status: 200 }),
    );
    render(<LoginForm />);

    await userEvent.click(
      screen.getByRole("button", { name: /don't have an account/i }),
    );
    await userEvent.type(screen.getByLabelText("Name"), "Jane");
    await userEvent.type(screen.getByLabelText("Email"), "jane@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "password123");
    await userEvent.click(
      screen.getByRole("button", { name: "Create your account" }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/signup",
      expect.objectContaining({
        body: JSON.stringify({
          email: "jane@example.com",
          password: "password123",
          name: "Jane",
        }),
      }),
    );
    expect(push).toHaveBeenCalledWith("/documents/");
  });

  it("explains a 401 as incorrect credentials", async () => {
    fetchMock.mockResolvedValue(new Response("no", { status: 401 }));
    render(<LoginForm />);

    await submitSignIn();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /incorrect email or password/i,
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("explains a 409 as an existing account", async () => {
    fetchMock.mockResolvedValue(new Response("no", { status: 409 }));
    render(<LoginForm />);

    await userEvent.click(
      screen.getByRole("button", { name: /don't have an account/i }),
    );
    await userEvent.type(screen.getByLabelText("Email"), "jane@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "password123");
    await userEvent.click(
      screen.getByRole("button", { name: "Create your account" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /already exists/i,
    );
  });

  it("falls back to a generic error for anything else", async () => {
    fetchMock.mockResolvedValue(new Response("boom", { status: 500 }));
    render(<LoginForm />);

    await submitSignIn();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /something went wrong/i,
    );
    expect(window.localStorage.getItem("prelegal.session")).toBeNull();
  });
});
