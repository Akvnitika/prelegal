import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import Home from "@/app/nda/page";
import { GREETING } from "@/lib/chat";
import { formatEffectiveDate, todayIso } from "@/lib/nda";

// The chat backend is mocked at the lib boundary; everything else (the
// useNdaChat hook, the panels, the preview) runs for real.
const { postChatMock } = vi.hoisted(() => ({ postChatMock: vi.fn() }));

vi.mock("@/lib/chat", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/chat")>()),
  postChat: postChatMock,
}));

// jsdom implements neither object URLs, printing, nor anchor navigation;
// stub them so the download and print flows can be observed.
const createObjectURL = vi.fn<(blob: Blob | MediaSource) => string>(() => "blob:vitest");
const revokeObjectURL = vi.fn();
const anchorClicks: { href: string; download: string }[] = [];

beforeAll(() => {
  Object.assign(URL, { createObjectURL, revokeObjectURL });
  HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
    anchorClicks.push({ href: this.href, download: this.download });
  };
  window.print = vi.fn();
});

afterAll(() => {
  Reflect.deleteProperty(URL, "createObjectURL");
  Reflect.deleteProperty(URL, "revokeObjectURL");
  Reflect.deleteProperty(HTMLAnchorElement.prototype, "click");
  Reflect.deleteProperty(window, "print");
});

afterEach(() => {
  vi.clearAllMocks();
  anchorClicks.length = 0;
});

function preview() {
  return within(
    screen.getByRole("article", { name: "Mutual Non-Disclosure Agreement preview" }),
  );
}

/** The manual form now lives behind the "Edit manually" tab. */
function openManualTab() {
  fireEvent.click(screen.getByRole("tab", { name: "Edit manually" }));
}

describe("Home page", () => {
  it("renders the tabs, chat greeting, preview pane, and both actions", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { name: "Create a Mutual Non-Disclosure Agreement" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Chat" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText(GREETING)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download Markdown" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Print or save as PDF" })).toBeInTheDocument();
    expect(
      preview().getByRole("heading", { name: "Standard Terms" }),
    ).toBeInTheDocument();
  });

  it("shows the chat by default and the form only on the manual tab", () => {
    render(<Home />);
    expect(screen.queryByLabelText("Effective date")).not.toBeInTheDocument();

    openManualTab();
    expect(screen.getByLabelText("Effective date")).toBeInTheDocument();
    expect(screen.queryByText(GREETING)).not.toBeInTheDocument();
  });

  it("sends a chat message and applies the returned field updates to the preview", async () => {
    postChatMock.mockResolvedValue({
      reply: "Delaware it is. Who signs for Acme?",
      updates: { governingLaw: "Delaware", party1: { company: "Acme, Inc." } },
    });
    const user = userEvent.setup();
    render(<Home />);

    await user.type(
      screen.getByLabelText("Message the drafting assistant"),
      "Acme, governed by Delaware",
    );
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(
      await screen.findByText("Delaware it is. Who signs for Acme?"),
    ).toBeInTheDocument();
    expect(preview().getByText("Delaware")).toBeInTheDocument();
    expect(preview().getByText("Acme, Inc.")).toBeInTheDocument();

    // The transcript sent includes the greeting and the user's message.
    const [transcript] = postChatMock.mock.calls[0];
    expect(transcript[0]).toEqual({ role: "assistant", content: GREETING });
    expect(transcript[1]).toEqual({
      role: "user",
      content: "Acme, governed by Delaware",
    });
  });

  it("shows chat-filled values in the manual form, and keeps the transcript across tab switches", async () => {
    postChatMock.mockResolvedValue({
      reply: "Done.",
      updates: { governingLaw: "Delaware" },
    });
    const user = userEvent.setup();
    render(<Home />);

    await user.type(
      screen.getByLabelText("Message the drafting assistant"),
      "Delaware law",
    );
    await user.click(screen.getByRole("button", { name: "Send" }));
    await screen.findByText("Done.");

    openManualTab();
    expect(screen.getByLabelText("Governing law (state or country)")).toHaveValue("Delaware");

    fireEvent.click(screen.getByRole("tab", { name: "Chat" }));
    expect(screen.getByText(GREETING)).toBeInTheDocument();
    expect(screen.getByText("Done.")).toBeInTheDocument();
  });

  it("defaults the effective date to today in the form and the preview", () => {
    render(<Home />);
    openManualTab();
    const today = todayIso();
    expect(screen.getByLabelText("Effective date")).toHaveValue(today);
    expect(preview().getByText(formatEffectiveDate(today)!)).toBeInTheDocument();
  });

  it("updates the preview as the user types", async () => {
    const user = userEvent.setup();
    render(<Home />);
    openManualTab();
    const party1 = within(screen.getByRole("group", { name: "Party 1" }));
    await user.type(party1.getByLabelText("Company"), "Acme, Inc.");
    await user.type(party1.getByLabelText("Signer name"), "Jordan Lee");
    await user.type(screen.getByLabelText("Governing law (state or country)"), "Delaware");

    expect(preview().getByText("Acme, Inc.")).toBeInTheDocument();
    expect(preview().getByText("Jordan Lee")).toBeInTheDocument();
    expect(preview().getByText("Delaware")).toBeInTheDocument();
  });

  it("shows a chosen effective date instead of today", () => {
    render(<Home />);
    openManualTab();
    fireEvent.change(screen.getByLabelText("Effective date"), {
      target: { value: "2031-01-02" },
    });
    expect(screen.getByLabelText("Effective date")).toHaveValue("2031-01-02");
    expect(preview().getByText("January 2, 2031")).toBeInTheDocument();
  });

  it("falls back to today when a chosen effective date is cleared", () => {
    render(<Home />);
    openManualTab();
    const dateInput = screen.getByLabelText("Effective date");
    fireEvent.change(dateInput, { target: { value: "2031-01-02" } });
    expect(preview().getByText("January 2, 2031")).toBeInTheDocument();

    fireEvent.change(dateInput, { target: { value: "" } });
    const today = todayIso();
    expect(screen.getByLabelText("Effective date")).toHaveValue(today);
    expect(preview().getByText(formatEffectiveDate(today)!)).toBeInTheDocument();
  });

  it("reflects term selection in the preview's checked options", async () => {
    const user = userEvent.setup();
    const { container } = render(<Home />);
    openManualTab();
    await user.click(screen.getByRole("radio", { name: /Continues until terminated/ }));

    const selected = [...container.querySelectorAll(".nda-doc p.option.selected")];
    expect(
      selected.some((p) => p.textContent?.includes("Continues until terminated")),
    ).toBe(true);
    expect(selected.some((p) => p.textContent?.includes("Expires"))).toBe(false);
  });

  it("downloads the completed agreement as Markdown", async () => {
    const user = userEvent.setup();
    render(<Home />);
    openManualTab();
    const party1 = within(screen.getByRole("group", { name: "Party 1" }));
    const party2 = within(screen.getByRole("group", { name: "Party 2" }));
    await user.type(party1.getByLabelText("Company"), "Acme, Inc.");
    await user.type(party2.getByLabelText("Company"), "Globex Corp");

    await user.click(screen.getByRole("button", { name: "Download Markdown" }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob.type).toBe("text/markdown;charset=utf-8");
    const markdown = await blob.text();
    expect(markdown).toContain("# Mutual Non-Disclosure Agreement");
    expect(markdown).toContain("| Company | Acme, Inc. | Globex Corp |");
    expect(markdown).toContain(formatEffectiveDate(todayIso())!);

    expect(anchorClicks).toEqual([
      { href: "blob:vitest", download: "Mutual-NDA-Acme-Inc-Globex-Corp.md" },
    ]);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:vitest");
  });

  it("opens the print dialog from the print button", async () => {
    const user = userEvent.setup();
    render(<Home />);
    await user.click(screen.getByRole("button", { name: "Print or save as PDF" }));
    expect(window.print).toHaveBeenCalledTimes(1);
  });
});
