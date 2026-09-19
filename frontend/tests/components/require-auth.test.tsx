import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RequireAuth } from "@/components/require-auth";
import { storeSession } from "@/lib/session";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

afterEach(() => {
  replace.mockReset();
  window.localStorage.clear();
});

describe("RequireAuth", () => {
  it("redirects to sign-in and never renders children without a session", () => {
    render(
      <RequireAuth>
        <p>secret</p>
      </RequireAuth>,
    );
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith("/");
  });

  it("renders children when a session exists", () => {
    storeSession({
      token: "tok",
      user: { id: 1, email: "j@example.com", name: null },
    });
    render(
      <RequireAuth>
        <p>secret</p>
      </RequireAuth>,
    );
    expect(screen.getByText("secret")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
