import type { Metadata } from "next";
import { RequireAuth } from "@/components/require-auth";

// Preserves the metadata the creator had when it lived at the root route.
export const metadata: Metadata = {
  title: "Mutual NDA creator — prelegal",
  description:
    "Create a Common Paper Mutual Non-Disclosure Agreement: fill in the key terms, preview the completed document, and download it.",
};

// Not LayoutProps<"/nda">: that generated type only exists after a build
// has seen the route, which would make `npm run typecheck` order-dependent.
export default function NdaLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
