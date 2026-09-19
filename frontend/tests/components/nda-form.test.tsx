import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { NdaForm } from "@/components/nda-form";
import { DEFAULT_PURPOSE, defaultNdaData, todayIso, type NdaData } from "@/lib/nda";

/**
 * NdaForm is controlled, so tests wrap it in a stateful harness that applies
 * onChange back into props (as the page does) and records the latest data.
 */
function renderForm(initial: NdaData = defaultNdaData()) {
  const latest: { data: NdaData } = { data: initial };
  function Harness() {
    const [data, setData] = useState(initial);
    return (
      <NdaForm
        data={data}
        today={todayIso()}
        onChange={(next) => {
          latest.data = next;
          setData(next);
        }}
      />
    );
  }
  render(<Harness />);
  return latest;
}

describe("NdaForm", () => {
  describe("agreement fields", () => {
    it("prefills the purpose with the default and accepts edits", async () => {
      const user = userEvent.setup();
      const latest = renderForm();
      const purpose = screen.getByLabelText("Purpose");
      expect(purpose).toHaveValue(DEFAULT_PURPOSE);

      await user.clear(purpose);
      await user.type(purpose, "Evaluating a pilot.");
      expect(latest.data.purpose).toBe("Evaluating a pilot.");
    });

    it("keeps the effective date floating ('' in state) while editing other fields", async () => {
      const user = userEvent.setup();
      const latest = renderForm();
      // The input displays today, but the committed state must stay "" so
      // the document keeps tracking today until a date is chosen.
      expect(screen.getByLabelText("Effective date")).toHaveValue(todayIso());

      const party1 = within(screen.getByRole("group", { name: "Party 1" }));
      await user.type(party1.getByLabelText("Company"), "Acme");
      await user.type(screen.getByLabelText("Governing law (state or country)"), "Delaware");

      expect(latest.data.effectiveDate).toBe("");
    });

    it("updates the effective date", () => {
      const latest = renderForm();
      fireEvent.change(screen.getByLabelText("Effective date"), {
        target: { value: "2026-12-01" },
      });
      expect(latest.data.effectiveDate).toBe("2026-12-01");
    });
  });

  describe("MNDA term", () => {
    it("defaults to the expiring option with an enabled years input", () => {
      renderForm();
      expect(screen.getByRole("radio", { name: /^Expires/ })).toBeChecked();
      expect(screen.getByLabelText("MNDA term in years")).toBeEnabled();
    });

    it("switches to 'continues until terminated' and disables the years input", async () => {
      const user = userEvent.setup();
      const latest = renderForm();
      await user.click(screen.getByRole("radio", { name: /Continues until terminated/ }));
      expect(latest.data.mndaTermKind).toBe("untilTerminated");
      expect(screen.getByLabelText("MNDA term in years")).toBeDisabled();
    });

    it("commits typed year values", async () => {
      const user = userEvent.setup();
      const latest = renderForm();
      const years = screen.getByLabelText("MNDA term in years");
      await user.clear(years);
      await user.type(years, "5");
      expect(latest.data.mndaTermYears).toBe(5);
    });

    it("clamps years to the 1-99 range", async () => {
      const user = userEvent.setup();
      const latest = renderForm();
      const years = screen.getByLabelText("MNDA term in years");

      await user.clear(years);
      await user.type(years, "0");
      expect(latest.data.mndaTermYears).toBe(1);

      await user.clear(years);
      await user.type(years, "150");
      expect(latest.data.mndaTermYears).toBe(99);
    });

    it("keeps the committed value when the field is cleared, snapping back on blur", async () => {
      const user = userEvent.setup();
      const latest = renderForm();
      const years = screen.getByLabelText("MNDA term in years");

      await user.clear(years);
      await user.type(years, "7");
      await user.clear(years);
      expect(latest.data.mndaTermYears).toBe(7);
      expect(years).toHaveValue(null);

      await user.tab();
      expect(years).toHaveValue(7);
    });
  });

  describe("term of confidentiality", () => {
    it("defaults to a year-bounded term", () => {
      renderForm();
      expect(screen.getByLabelText("Term of confidentiality in years")).toBeEnabled();
      expect(screen.getByRole("radio", { name: "In perpetuity" })).not.toBeChecked();
    });

    it("switches to perpetuity and disables the years input", async () => {
      const user = userEvent.setup();
      const latest = renderForm();
      await user.click(screen.getByRole("radio", { name: "In perpetuity" }));
      expect(latest.data.confidentialityKind).toBe("perpetuity");
      expect(screen.getByLabelText("Term of confidentiality in years")).toBeDisabled();
    });

    it("commits confidentiality years independently of the MNDA term years", async () => {
      const user = userEvent.setup();
      const latest = renderForm();
      const years = screen.getByLabelText("Term of confidentiality in years");
      await user.clear(years);
      await user.type(years, "10");
      expect(latest.data.confidentialityYears).toBe(10);
      expect(latest.data.mndaTermYears).toBe(1);
    });
  });

  describe("governing law", () => {
    it("updates governing law and jurisdiction", async () => {
      const user = userEvent.setup();
      const latest = renderForm();
      await user.type(screen.getByLabelText("Governing law (state or country)"), "Delaware");
      await user.type(screen.getByLabelText("Jurisdiction"), "New Castle County");
      expect(latest.data.governingLaw).toBe("Delaware");
      expect(latest.data.jurisdiction).toBe("New Castle County");
    });
  });

  describe("parties", () => {
    it("updates every field of party 1 without touching party 2", async () => {
      const user = userEvent.setup();
      const latest = renderForm();
      const party1 = within(screen.getByRole("group", { name: "Party 1" }));

      await user.type(party1.getByLabelText("Company"), "Acme, Inc.");
      await user.type(party1.getByLabelText("Signer name"), "Jordan Lee");
      await user.type(party1.getByLabelText("Signer title"), "CEO");
      await user.type(
        party1.getByLabelText("Notice address (email or postal)"),
        "legal@acme.com",
      );

      expect(latest.data.party1).toEqual({
        company: "Acme, Inc.",
        name: "Jordan Lee",
        title: "CEO",
        address: "legal@acme.com",
      });
      expect(latest.data.party2).toEqual(defaultNdaData().party2);
    });

    it("updates party 2 independently", async () => {
      const user = userEvent.setup();
      const latest = renderForm();
      const party2 = within(screen.getByRole("group", { name: "Party 2" }));
      await user.type(party2.getByLabelText("Company"), "Globex Corp");
      expect(latest.data.party2.company).toBe("Globex Corp");
      expect(latest.data.party1.company).toBe("");
    });
  });

  describe("modifications", () => {
    it("updates the optional modifications text", async () => {
      const user = userEvent.setup();
      const latest = renderForm();
      await user.type(
        screen.getByLabelText("Modifications to the MNDA (optional)"),
        "No changes.",
      );
      expect(latest.data.modifications).toBe("No changes.");
    });
  });
});
