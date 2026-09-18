"use client";

export type NdaTab = "chat" | "manual";

const TABS: { id: NdaTab; label: string }[] = [
  { id: "chat", label: "Chat" },
  { id: "manual", label: "Edit manually" },
];

export function NdaTabs({
  active,
  onChange,
}: {
  active: NdaTab;
  onChange: (tab: NdaTab) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="How to fill in the agreement"
      className="flex gap-1 rounded-lg bg-navy/5 p-1"
    >
      {TABS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          role="tab"
          id={`tab-${id}`}
          aria-selected={active === id}
          aria-controls={`panel-${id}`}
          onClick={() => onChange(id)}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-primary ${
            active === id
              ? "bg-white text-navy shadow-sm"
              : "text-gray-text hover:text-navy"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
