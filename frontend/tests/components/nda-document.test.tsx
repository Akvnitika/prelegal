import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NdaDocument } from "@/components/nda-document";
import { defaultNdaData } from "@/lib/nda";
import { STANDARD_TERMS } from "@/lib/standard-terms";
import { filledData } from "../helpers/fixtures";

describe("NdaDocument", () => {
  it("renders the document title and preview landmark", () => {
    render(<NdaDocument data={filledData()} />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Mutual Non-Disclosure Agreement" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("article", { name: "Mutual Non-Disclosure Agreement preview" }),
    ).toBeInTheDocument();
  });

  describe("filled values", () => {
    it("highlights entered cover-page values", () => {
      render(<NdaDocument data={filledData()} />);
      const purpose = screen.getByText("Evaluating a joint go-to-market partnership.");
      expect(purpose.tagName).toBe("MARK");
      expect(purpose).toHaveClass("filled");
      expect(screen.getByText("Delaware")).toHaveClass("filled");
      expect(screen.getByText("New Castle County, Delaware")).toHaveClass("filled");
    });

    it("formats the effective date", () => {
      render(<NdaDocument data={filledData()} />);
      expect(screen.getByText("September 10, 2026")).toBeInTheDocument();
    });

    it("shows the modifications text trimmed", () => {
      const data = filledData();
      data.modifications = "  Custom clause.  ";
      render(<NdaDocument data={data} />);
      expect(screen.getByText("Custom clause.")).toBeInTheDocument();
      expect(screen.queryByText("None.")).not.toBeInTheDocument();
    });
  });

  describe("placeholders", () => {
    it("shows bracketed placeholders for missing values", () => {
      render(<NdaDocument data={{ ...defaultNdaData(), purpose: "" }} />);
      for (const placeholder of [
        "[Purpose]",
        "[Effective date]",
        "[Governing law]",
        "[Jurisdiction]",
      ]) {
        expect(screen.getByText(placeholder)).toHaveClass("unfilled");
      }
    });

    it("shows None. when there are no modifications", () => {
      render(<NdaDocument data={defaultNdaData()} />);
      expect(screen.getByText("None.")).toBeInTheDocument();
    });
  });

  describe("term options", () => {
    it("marks the selected MNDA term and confidentiality options", () => {
      const { container } = render(<NdaDocument data={filledData()} />);
      const options = [...container.querySelectorAll("p.option")];
      expect(options).toHaveLength(4);

      const [expires, untilTerminated, years, perpetuity] = options;
      expect(expires).toHaveClass("selected");
      expect(expires.textContent).toContain("☒");
      expect(expires.textContent).toContain("2 years");
      expect(untilTerminated).not.toHaveClass("selected");
      expect(untilTerminated.textContent).toContain("☐");

      expect(years).toHaveClass("selected");
      expect(years.textContent).toContain("3 years");
      expect(perpetuity).not.toHaveClass("selected");
    });

    it("flips the marks when the other options are chosen", () => {
      const { container } = render(
        <NdaDocument
          data={{
            ...filledData(),
            mndaTermKind: "untilTerminated",
            confidentialityKind: "perpetuity",
          }}
        />,
      );
      const options = [...container.querySelectorAll("p.option")];
      const [expires, untilTerminated, years, perpetuity] = options;
      expect(expires).not.toHaveClass("selected");
      expect(untilTerminated).toHaveClass("selected");
      expect(years).not.toHaveClass("selected");
      expect(perpetuity).toHaveClass("selected");
    });

    it("announces the selection state to screen readers", () => {
      render(<NdaDocument data={filledData()} />);
      expect(screen.getAllByText("Selected:")).toHaveLength(2);
      expect(screen.getAllByText("Not selected:")).toHaveLength(2);
    });
  });

  describe("signature table", () => {
    it("shows both parties' details in the matching rows", () => {
      render(<NdaDocument data={filledData()} />);
      for (const value of [
        "Jordan Lee",
        "Pat Kim",
        "Chief Executive Officer",
        "General Counsel",
        "Acme, Inc.",
        "Globex Corp",
        "legal@acme.com",
        "1 Globex Way, Springfield",
      ]) {
        expect(screen.getByText(value)).toBeInTheDocument();
      }
    });

    it("leaves cells empty when party details are missing", () => {
      const { container } = render(<NdaDocument data={defaultNdaData()} />);
      expect(container.querySelectorAll(".sig-table mark")).toHaveLength(0);
    });
  });

  describe("standard terms", () => {
    it("renders all eleven sections in order", () => {
      const { container } = render(<NdaDocument data={filledData()} />);
      const items = [...container.querySelectorAll("ol.terms-list > li")];
      expect(items).toHaveLength(STANDARD_TERMS.length);
      items.forEach((li, i) => {
        expect(li.textContent).toContain(STANDARD_TERMS[i].title);
      });
    });

    it("links every cover-page reference to an existing anchor", () => {
      const { container } = render(<NdaDocument data={filledData()} />);
      const refs = [...container.querySelectorAll("a.term-ref")];
      expect(refs.length).toBeGreaterThan(0);
      for (const ref of refs) {
        const href = ref.getAttribute("href");
        expect(href).toMatch(/^#cover-/);
        const target = container.querySelector(`[id="${href!.slice(1)}"]`);
        expect(target, `missing anchor for ${href}`).not.toBeNull();
      }
    });

    it("opens external links in a new tab without a referrer", () => {
      render(<NdaDocument data={filledData()} />);
      const external = [
        screen.getByRole("link", { name: "commonpaper.com/standards/mutual-nda/1.0" }),
        screen.getByRole("link", { name: "CC BY 4.0" }),
      ];
      for (const link of external) {
        expect(link).toHaveAttribute("target", "_blank");
        expect(link).toHaveAttribute("rel", "noreferrer");
      }
    });
  });
});
