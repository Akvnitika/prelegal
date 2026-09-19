import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppHeader } from "@/components/app-header";
import { storeSession } from "@/lib/session";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

afterEach(() => {
  push.mockReset();
  fetchMock.mockReset();
  window.localStorage.clear();
});

function signIn() {
  storeSession({
    token: "tok-123",
    user: { id: 1, email: "jane@example.com", name: "Jane" },
  });
}

describe("AppHeader", () => {
  it("shows the title, nav, and the signed-in user", () => {
    signIn();
    render(<AppHeader title="Cloud Service Agreement" />);
    expect(screen.getByText("Cloud Service Agreement")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "My documents" }).getAttribute("href"),
    ).toMatch(/^\/documents\/?$/);
    expect(screen.getByText("Jane")).toBeInTheDocument();
  });

  it("marks the documents nav as current instead of linking it", () => {
    signIn();
    render(<AppHeader title="My documents" activeNav="documents" />);
    expect(
      screen.queryByRole("link", { name: "My documents" }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText("My documents").length).toBeGreaterThan(0);
  });

  it("renders the save indicator and page actions", () => {
    signIn();
    render(
      <AppHeader
        title="X"
        saveStatus="Saved"
        actions={<button type="button">Download Markdown</button>}
      />,
    );
    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Download Markdown" }),
    ).toBeInTheDocument();
  });

  it("signs out: invalidates the server session, clears local state, returns to sign-in", async () => {
    signIn();
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    const user = userEvent.setup();
    render(<AppHeader title="X" />);

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/signout",
      expect.objectContaining({ method: "POST" }),
    );
    expect(window.localStorage.getItem("prelegal.session")).toBeNull();
    expect(push).toHaveBeenCalledWith("/");
  });
});
