"use client";

import { type ReactNode } from "react";
import { type FieldMeta } from "@/lib/documents";

const inputCls =
  "w-full rounded-md border border-gray-text/40 px-3 py-2 text-sm text-navy " +
  "placeholder:text-gray-text/70 focus-visible:outline-2 " +
  "focus-visible:outline-offset-1 focus-visible:outline-blue-primary";

const LONG_TEXT_RE =
  /obligations|warranties|deliverables|description|purpose|restrictions|limitations|claims/i;

function isLongText(field: FieldMeta): boolean {
  return LONG_TEXT_RE.test(field.name) || field.hint.length > 130;
}

function Group({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4 border-t border-gray-text/25 pt-5">
      <legend className="float-left mb-1 w-full pt-5 font-serif text-lg font-semibold text-navy">
        {legend}
      </legend>
      {children}
    </fieldset>
  );
}

interface GenericFormProps {
  fields: FieldMeta[];
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
}

/** Data-driven manual editor for a generic document's registry fields. */
export function GenericForm({ fields, values, onChange }: GenericFormProps) {
  const groups: { group: string; fields: FieldMeta[] }[] = [];
  for (const field of fields) {
    const last = groups[groups.length - 1];
    if (last && last.group === field.group) last.fields.push(field);
    else groups.push({ group: field.group, fields: [field] });
  }

  return (
    <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
      {groups.map(({ group, fields: groupFields }) => (
        <Group key={group} legend={group}>
          {groupFields.map((field) => {
            const id = `field-${field.name.replace(/[^A-Za-z0-9]+/g, "-")}`;
            const shared = {
              id,
              value: values[field.name] ?? "",
              onChange: (
                e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
              ) => onChange(field.name, e.target.value),
            };
            return (
              <div key={field.name} className="space-y-1.5">
                <label
                  className="block text-sm font-medium text-navy"
                  htmlFor={id}
                >
                  {field.label}
                </label>
                {isLongText(field) ? (
                  <textarea
                    {...shared}
                    className={`${inputCls} min-h-20 resize-y`}
                  />
                ) : (
                  <input {...shared} className={inputCls} />
                )}
                <p className="text-xs text-gray-text">{field.hint}</p>
              </div>
            );
          })}
        </Group>
      ))}
    </form>
  );
}
