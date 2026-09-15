import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderRichText, toPlainTerms } from "@/lib/rich-text";
import { STANDARD_TERMS } from "@/lib/standard-terms";

describe("renderRichText", () => {
  it("renders **text** as bold", () => {
    render(<p>{renderRichText("A “**Disclosing Party**” may share.")}</p>);
    const strong = screen.getByText("Disclosing Party");
    expect(strong.tagName).toBe("STRONG");
  });

  it("renders {{Name}} as a link to the matching cover section", () => {
    render(<p>{renderRichText("solely for the {{Purpose}} stated")}</p>);
    const link = screen.getByRole("link", { name: "Purpose" });
    expect(link).toHaveAttribute("href", "#cover-purpose");
    expect(link).toHaveClass("term-ref");
  });

  it("leaves plain text untouched around the markers", () => {
    const { container } = render(
      <p>{renderRichText("before **bold** middle {{Purpose}} after")}</p>,
    );
    expect(container.textContent).toBe("before bold middle Purpose after");
  });

  it("handles multiple markers of both kinds in one string", () => {
    const { container } = render(
      <p>{renderRichText("**A** and **B** for the {{Purpose}} on the {{Effective Date}}")}</p>,
    );
    expect(container.querySelectorAll("strong")).toHaveLength(2);
    expect(container.querySelectorAll("a.term-ref")).toHaveLength(2);
  });

  it("renders text without markers as-is", () => {
    const { container } = render(<p>{renderRichText("no markers here")}</p>);
    expect(container.textContent).toBe("no markers here");
    expect(container.querySelector("strong")).toBeNull();
    expect(container.querySelector("a")).toBeNull();
  });

  it("renders every real Standard Terms body without leftover markers", () => {
    for (const section of STANDARD_TERMS) {
      const { container, unmount } = render(<p>{renderRichText(section.body)}</p>);
      expect(container.textContent).not.toContain("**");
      expect(container.textContent).not.toContain("{{");
      unmount();
    }
  });
});

describe("toPlainTerms", () => {
  it("strips {{...}} markers to the plain name", () => {
    expect(toPlainTerms("solely for the {{Purpose}} stated")).toBe(
      "solely for the Purpose stated",
    );
  });

  it("strips every marker in the string", () => {
    expect(toPlainTerms("{{MNDA Term}} and {{Term of Confidentiality}}")).toBe(
      "MNDA Term and Term of Confidentiality",
    );
  });

  it("leaves bold markers and plain text alone", () => {
    expect(toPlainTerms("a “**Cover Page**” with no refs")).toBe(
      "a “**Cover Page**” with no refs",
    );
  });
});
