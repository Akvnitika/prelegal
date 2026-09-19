import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LoginPage from "@/app/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("login page", () => {
  it("renders the wordmark, value proposition, and the sign-in form", () => {
    render(<LoginPage />);
    // The wordmark appears twice: brand panel (desktop) + compact header
    // (mobile) — jsdom doesn't evaluate media queries.
    expect(screen.getAllByText(/prelegal/).length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByRole("heading", {
        name: "Draft legal agreements in minutes, not weeks.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Business Associate Agreement")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(
      screen.getByText(/aren't legal advice — have a lawyer review/i),
    ).toBeInTheDocument();
  });
});
