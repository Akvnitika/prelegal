import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GenericForm } from "@/components/generic-form";
import { type FieldMeta } from "@/lib/documents";

const FIELDS: FieldMeta[] = [
  { name: "Provider", label: "Provider", hint: "Vendor name.", group: "Parties" },
  { name: "Customer", label: "Customer", hint: "Customer name.", group: "Parties" },
  {
    name: "Obligations",
    label: "Obligations",
    hint: "What each side must do.",
    group: "Scope",
  },
];

describe("GenericForm", () => {
  it("groups fields under their legends with hints", () => {
    render(<GenericForm fields={FIELDS} values={{}} onChange={vi.fn()} />);
    expect(screen.getByRole("group", { name: "Parties" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Scope" })).toBeInTheDocument();
    expect(screen.getByText("Vendor name.")).toBeInTheDocument();
  });

  it("uses a textarea for long-text fields and inputs otherwise", () => {
    render(<GenericForm fields={FIELDS} values={{}} onChange={vi.fn()} />);
    expect(screen.getByLabelText("Obligations").tagName).toBe("TEXTAREA");
    expect(screen.getByLabelText("Provider").tagName).toBe("INPUT");
  });

  it("shows values and reports edits by field name", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <GenericForm
        fields={FIELDS}
        values={{ Provider: "Acme" }}
        onChange={onChange}
      />,
    );
    expect(screen.getByLabelText("Provider")).toHaveValue("Acme");

    await user.type(screen.getByLabelText("Customer"), "G");
    expect(onChange).toHaveBeenCalledWith("Customer", "G");
  });
});
