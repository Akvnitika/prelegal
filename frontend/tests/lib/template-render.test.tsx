import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { parseTemplate } from "@/lib/template-parse";
import { TemplateDocument } from "@/lib/template-render";
import { FIXTURE_TEMPLATE } from "../helpers/template-fixtures";

const parsed = parseTemplate(FIXTURE_TEMPLATE);

describe("TemplateDocument", () => {
  it("renders filled variables highlighted and unfilled ones bracketed", () => {
    const { container } = render(
      <TemplateDocument
        parsed={parsed}
        fields={{ Customer: "Globex Corporation", Provider: "" }}
      />,
    );
    const marks = [...container.querySelectorAll("mark.filled")];
    expect(marks.some((m) => m.textContent === "Globex Corporation")).toBe(true);
    const unfilled = [...container.querySelectorAll(".unfilled")].map(
      (n) => n.textContent,
    );
    expect(unfilled).toContain("[Provider]");
    expect(unfilled).toContain("[Subscription Period]");
  });

  it("keeps possessive suffixes attached after the value", () => {
    const { container } = render(
      <TemplateDocument parsed={parsed} fields={{ Provider: "Acme Ltd" }} />,
    );
    expect(container.textContent).toContain("Acme Ltd's product");
  });

  it("renders the full nesting depth as nested ordered lists", () => {
    const { container } = render(
      <TemplateDocument parsed={parsed} fields={{}} />,
    );
    expect(container.querySelector("ol.clauses")).not.toBeNull();
    expect(
      container.querySelectorAll("ol.clauses ol ol ol li").length,
    ).toBeGreaterThan(0);
  });

  it("carries the Common Paper attribution footer", () => {
    const { container } = render(
      <TemplateDocument parsed={parsed} fields={{}} />,
    );
    const footer = container.querySelector(".doc-footer");
    expect(footer).toHaveTextContent(
      "Based on the Common Paper Test Agreement standard terms",
    );
    expect(
      footer?.querySelector('a[href="https://creativecommons.org/licenses/by/4.0/"]'),
    ).not.toBeNull();
  });

  it("renders links safely in a new tab", () => {
    const { container } = render(
      <TemplateDocument parsed={parsed} fields={{}} />,
    );
    const link = container.querySelector('a[href="https://commonpaper.com/x"]');
    expect(link).not.toBeNull();
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer");
  });
});
