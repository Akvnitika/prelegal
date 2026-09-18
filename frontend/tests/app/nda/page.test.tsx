import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import Home from "@/app/nda/page";
import { formatEffectiveDate, todayIso } from "@/lib/nda";

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

describe("Home page", () => {
  it("renders the form pane, preview pane, and both actions", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { name: "Create a Mutual Non-Disclosure Agreement" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download Markdown" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Print or save as PDF" })).toBeInTheDocument();
    expect(
      preview().getByRole("heading", { name: "Standard Terms" }),
    ).toBeInTheDocument();
  });

  it("defaults the effective date to today in the form and the preview", () => {
    render(<Home />);
    const today = todayIso();
    expect(screen.getByLabelText("Effective date")).toHaveValue(today);
    expect(preview().getByText(formatEffectiveDate(today)!)).toBeInTheDocument();
  });

  it("updates the preview as the user types", async () => {
    const user = userEvent.setup();
    render(<Home />);
    const party1 = within(screen.getByRole("group", { name: "Party 1" }));
    await user.type(party1.getByLabelText("Company"), "Acme, Inc.");
    await user.type(party1.getByLabelText("Signer name"), "Jordan Lee");
    await user.type(screen.getByLabelText("Governing law (state)"), "Delaware");

    expect(preview().getByText("Acme, Inc.")).toBeInTheDocument();
    expect(preview().getByText("Jordan Lee")).toBeInTheDocument();
    expect(preview().getByText("Delaware")).toBeInTheDocument();
  });

  it("shows a chosen effective date instead of today", () => {
    render(<Home />);
    fireEvent.change(screen.getByLabelText("Effective date"), {
      target: { value: "2031-01-02" },
    });
    expect(screen.getByLabelText("Effective date")).toHaveValue("2031-01-02");
    expect(preview().getByText("January 2, 2031")).toBeInTheDocument();
  });

  it("falls back to today when a chosen effective date is cleared", () => {
    render(<Home />);
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
