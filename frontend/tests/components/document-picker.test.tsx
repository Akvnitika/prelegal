import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DocumentGallery } from "@/components/document-picker";

const DOCS = [
  {
    key: "csa",
    name: "Cloud Service Agreement",
    description: "Cloud subscriptions.",
    about: "",
    fields: [],
  },
  {
    key: "baa",
    name: "Business Associate Agreement",
    description: "HIPAA PHI handling.",
    about: "",
    fields: [],
  },
];

describe("DocumentGallery", () => {
  it("lists every document with its description", () => {
    render(<DocumentGallery documents={DOCS} />);
    expect(screen.getByText("Cloud Service Agreement")).toBeInTheDocument();
    expect(screen.getByText("Cloud subscriptions.")).toBeInTheDocument();
    expect(
      screen.getByText("Business Associate Agreement"),
    ).toBeInTheDocument();
  });
});
