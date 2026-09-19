import { LoginForm } from "@/components/login-form";

// Mirrors catalog.json's template names — copy only, no data coupling.
const DOCUMENT_TYPES = [
  "Mutual NDA",
  "Cloud Service Agreement",
  "Design Partner Agreement",
  "Service Level Agreement",
  "Professional Services Agreement",
  "Data Processing Agreement",
  "Software License Agreement",
  "Partnership Agreement",
  "Business Associate Agreement",
  "Pilot Agreement",
  "AI Addendum",
];

function BrandPanel() {
  return (
    <div className="hidden bg-navy px-10 py-12 text-white lg:flex lg:w-[27rem] lg:flex-col lg:justify-between">
      <p className="font-serif text-2xl font-semibold">
        prelegal<span className="text-accent-yellow">.</span>
      </p>
      <div>
        <h2 className="mb-3 font-serif text-3xl font-semibold leading-tight">
          Draft legal agreements in minutes, not weeks.
        </h2>
        <p className="mb-6 text-sm leading-relaxed text-white/75">
          Chat with a drafting assistant to fill in Common Paper-based
          templates — then preview, fine-tune, and export a polished draft
          ready for your lawyer to review.
        </p>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-white/70">
          {DOCUMENT_TYPES.map((name) => (
            <li key={name} className="flex items-baseline gap-1.5">
              <span aria-hidden className="text-accent-yellow">
                •
              </span>
              {name}
            </li>
          ))}
        </ul>
      </div>
      <p className="text-xs text-white/50">
        11 agreement types, ready to fill in.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <BrandPanel />
      <div className="flex flex-1 items-center justify-center bg-desk px-4 py-12">
        <div className="w-full max-w-sm">
          <p className="mb-2 text-center font-serif text-2xl font-semibold text-navy lg:hidden">
            prelegal<span className="text-accent-yellow">.</span>
          </p>
          <p className="mb-6 text-center text-sm text-gray-text lg:hidden">
            Draft legal agreements from trusted templates.
          </p>
          <LoginForm />
          <p className="mt-6 text-center text-xs text-gray-text">
            AI-generated drafts aren&apos;t legal advice — have a lawyer review
            before signing.
          </p>
        </div>
      </div>
    </div>
  );
}
