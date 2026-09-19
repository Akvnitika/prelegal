"use client";

import { useState, type ReactNode } from "react";
import { type NdaData, type PartyInfo } from "@/lib/nda";

const inputCls =
  "w-full rounded-md border border-rule bg-paper px-3 py-2 text-sm text-ink " +
  "placeholder:text-ink/40 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-primary";

const yearsCls =
  "w-16 rounded-md border border-rule bg-paper px-2 py-1 text-sm text-ink " +
  "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-primary " +
  "disabled:cursor-not-allowed disabled:opacity-40";

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Section({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4 border-t border-rule pt-5">
      <legend className="float-left mb-1 w-full pt-5 font-serif text-lg font-semibold">
        {legend}
      </legend>
      {children}
    </fieldset>
  );
}

/**
 * Bounded year count. Keeps the raw text locally so the field can be cleared
 * while typing; commits only valid values and snaps back to the committed
 * value on blur.
 */
function YearsInput({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  disabled: boolean;
  onChange: (n: number) => void;
}) {
  const [text, setText] = useState(String(value));
  return (
    <input
      type="number"
      min={1}
      max={99}
      aria-label={label}
      className={yearsCls}
      disabled={disabled}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const n = parseInt(e.target.value, 10);
        if (!Number.isNaN(n)) onChange(Math.min(99, Math.max(1, n)));
      }}
      onBlur={() => setText(String(value))}
    />
  );
}

interface NdaFormProps {
  data: NdaData;
  /** Today's ISO date, shown while effectiveDate is "" (still floating). */
  today: string;
  onChange: (next: NdaData) => void;
}

export function NdaForm({ data, today, onChange }: NdaFormProps) {
  const update = (patch: Partial<NdaData>) => onChange({ ...data, ...patch });

  const partyFields = (key: "party1" | "party2", label: string) => {
    const party = data[key];
    const updateParty = (patch: Partial<PartyInfo>) =>
      onChange({ ...data, [key]: { ...party, ...patch } });

    return (
      <fieldset className="space-y-4">
        <legend className="mb-1 text-sm font-semibold">{label}</legend>
        <Field label="Company" htmlFor={`${key}-company`}>
          <input
            id={`${key}-company`}
            className={inputCls}
            value={party.company}
            onChange={(e) => updateParty({ company: e.target.value })}
            placeholder="Acme, Inc."
          />
        </Field>
        <Field label="Signer name" htmlFor={`${key}-name`}>
          <input
            id={`${key}-name`}
            className={inputCls}
            value={party.name}
            onChange={(e) => updateParty({ name: e.target.value })}
            placeholder="Jordan Lee"
          />
        </Field>
        <Field label="Signer title" htmlFor={`${key}-title`}>
          <input
            id={`${key}-title`}
            className={inputCls}
            value={party.title}
            onChange={(e) => updateParty({ title: e.target.value })}
            placeholder="Chief Executive Officer"
          />
        </Field>
        <Field label="Notice address (email or postal)" htmlFor={`${key}-address`}>
          <input
            id={`${key}-address`}
            className={inputCls}
            value={party.address}
            onChange={(e) => updateParty({ address: e.target.value })}
            placeholder="legal@acme.com"
          />
        </Field>
      </fieldset>
    );
  };

  return (
    <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
      <Section legend="Agreement">
        <Field label="Purpose" htmlFor="purpose">
          <textarea
            id="purpose"
            className={`${inputCls} min-h-20 resize-y`}
            value={data.purpose}
            onChange={(e) => update({ purpose: e.target.value })}
          />
          <p className="text-xs text-ink/75">How Confidential Information may be used.</p>
        </Field>
        <Field label="Effective date" htmlFor="effective-date">
          {/* Display resolves the "" sentinel to today; the committed state
              keeps "" so unrelated edits never pin the floating date. */}
          <input
            id="effective-date"
            type="date"
            className={inputCls}
            value={data.effectiveDate || today}
            onChange={(e) => update({ effectiveDate: e.target.value })}
          />
        </Field>
      </Section>

      <Section legend="Term">
        <fieldset className="space-y-2.5">
          <legend className="mb-1.5 text-sm font-medium">MNDA term</legend>
          <label className="flex items-center gap-2.5 text-sm">
            <input
              type="radio"
              name="mnda-term"
              className="accent-blue-primary"
              checked={data.mndaTermKind === "expires"}
              onChange={() => update({ mndaTermKind: "expires" })}
            />
            <span className="flex items-center gap-2">
              Expires
              <YearsInput
                label="MNDA term in years"
                disabled={data.mndaTermKind !== "expires"}
                value={data.mndaTermYears}
                onChange={(n) => update({ mndaTermYears: n })}
              />
              year(s) from the effective date
            </span>
          </label>
          <label className="flex items-center gap-2.5 text-sm">
            <input
              type="radio"
              name="mnda-term"
              className="accent-blue-primary"
              checked={data.mndaTermKind === "untilTerminated"}
              onChange={() => update({ mndaTermKind: "untilTerminated" })}
            />
            Continues until terminated
          </label>
        </fieldset>

        <fieldset className="space-y-2.5">
          <legend className="mb-1.5 text-sm font-medium">Confidentiality lasts</legend>
          <label className="flex items-center gap-2.5 text-sm">
            <input
              type="radio"
              name="confidentiality-term"
              className="accent-blue-primary"
              checked={data.confidentialityKind === "years"}
              onChange={() => update({ confidentialityKind: "years" })}
            />
            <span className="flex items-center gap-2">
              <YearsInput
                label="Term of confidentiality in years"
                disabled={data.confidentialityKind !== "years"}
                value={data.confidentialityYears}
                onChange={(n) => update({ confidentialityYears: n })}
              />
              year(s) from the effective date
            </span>
          </label>
          <label className="flex items-center gap-2.5 text-sm">
            <input
              type="radio"
              name="confidentiality-term"
              className="accent-blue-primary"
              checked={data.confidentialityKind === "perpetuity"}
              onChange={() => update({ confidentialityKind: "perpetuity" })}
            />
            In perpetuity
          </label>
          <p className="text-xs text-ink/75">
            Trade secrets stay protected for as long as applicable law treats them as trade
            secrets.
          </p>
        </fieldset>
      </Section>

      <Section legend="Governing law">
        <Field label="Governing law (state or country)" htmlFor="governing-law">
          <input
            id="governing-law"
            className={inputCls}
            value={data.governingLaw}
            onChange={(e) => update({ governingLaw: e.target.value })}
            placeholder="Delaware — or England and Wales"
          />
          <p className="text-xs text-ink/75">
            A U.S. state or another legal system, e.g. England and Wales.
          </p>
        </Field>
        <Field label="Jurisdiction" htmlFor="jurisdiction">
          <input
            id="jurisdiction"
            className={inputCls}
            value={data.jurisdiction}
            onChange={(e) => update({ jurisdiction: e.target.value })}
            placeholder="New Castle County, Delaware — or the courts of England and Wales"
          />
          <p className="text-xs text-ink/75">
            The courts that will hear any dispute.
          </p>
        </Field>
      </Section>

      <Section legend="Parties">
        {partyFields("party1", "Party 1")}
        {partyFields("party2", "Party 2")}
      </Section>

      <Section legend="Modifications">
        <Field label="Modifications to the MNDA (optional)" htmlFor="modifications">
          <textarea
            id="modifications"
            className={`${inputCls} min-h-20 resize-y`}
            value={data.modifications}
            onChange={(e) => update({ modifications: e.target.value })}
            placeholder="Leave blank if there are none."
          />
        </Field>
      </Section>
    </form>
  );
}
