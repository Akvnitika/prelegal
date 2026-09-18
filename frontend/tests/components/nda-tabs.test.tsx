import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NdaTabs } from "@/components/nda-tabs";

describe("NdaTabs", () => {
  it("renders both tabs with the active one selected", () => {
    render(<NdaTabs active="chat" onChange={vi.fn()} />);
    expect(screen.getByRole("tab", { name: "Chat" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Edit manually" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("reports tab clicks", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<NdaTabs active="chat" onChange={onChange} />);

    await user.click(screen.getByRole("tab", { name: "Edit manually" }));
    expect(onChange).toHaveBeenCalledWith("manual");
  });
});
