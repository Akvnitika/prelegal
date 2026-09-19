import type { Metadata } from "next";
import { RequireAuth } from "@/components/require-auth";

export const metadata: Metadata = {
  title: "My documents",
  description: "Your saved agreements: reopen, continue, or download them.",
};

export default function DocumentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireAuth>{children}</RequireAuth>;
}
