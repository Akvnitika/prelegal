import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Document creator — prelegal",
  description:
    "Draft a legal agreement with an AI assistant: pick a document type and fill it in through conversation.",
};

export default function CreateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
