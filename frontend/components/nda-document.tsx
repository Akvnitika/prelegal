import type { ReactNode } from "react";
import {
  effectiveDateDisplay,
  pluralYears,
  SIGNATURE_ROWS,
  type NdaData,
  type PartyInfo,
} from "@/lib/nda";
import {
  STANDARD_TERMS,
  STANDARD_TERMS_URL,
  STANDARD_TERMS_VERSION,
  coverAnchor,
} from "@/lib/standard-terms";
import { DRAFT_NOTICE } from "@/lib/draft-notice";
import { renderRichText } from "@/lib/rich-text";

function Filled({ value, placeholder }: { value: string; placeholder: string }) {
  const v = value.trim();
  if (!v) return <span className="unfilled">[{placeholder}]</span>;
  return <mark className="filled">{v}</mark>;
}

function OptionLine({ selected, children }: { selected: boolean; children: ReactNode }) {
  return (
    <p className={selected ? "option selected" : "option"}>
      <span className="option-box" aria-hidden="true">
        {selected ? "☒" : "☐"}
      </span>
      <span className="sr-only">{selected ? "Selected: " : "Not selected: "}</span>
      <span>{children}</span>
    </p>
  );
}

function PartyCells({ pick, data }: { pick: (p: PartyInfo) => string; data: NdaData }) {
  const cell = (value: string) => {
    const v = value.trim();
    return <td>{v ? <mark className="filled">{v}</mark> : null}</td>;
  };
  return (
    <>
      {cell(pick(data.party1))}
      {cell(pick(data.party2))}
    </>
  );
}

export function NdaDocument({ data }: { data: NdaData }) {
  const effectiveDate = effectiveDateDisplay(data.effectiveDate, "");

  return (
    <article className="nda-doc" aria-label="Mutual Non-Disclosure Agreement preview">
      <p className="draft-notice">{DRAFT_NOTICE}</p>
      <h1>Mutual Non-Disclosure Agreement</h1>

      <p className="doc-intro">
        This Mutual Non-Disclosure Agreement (the “MNDA”) consists of: (1) this Cover Page
        (“<strong>Cover Page</strong>”) and (2) the Common Paper Mutual NDA Standard Terms
        Version {STANDARD_TERMS_VERSION} (“<strong>Standard Terms</strong>”) identical to
        those posted at{" "}
        <a href={STANDARD_TERMS_URL} target="_blank" rel="noreferrer">
          commonpaper.com/standards/mutual-nda/1.0
        </a>{" "}
        and reproduced in full below. Any modifications of the Standard Terms should be made
        on the Cover Page, which will control over conflicts with the Standard Terms.
      </p>

      <h2>Cover Page</h2>

      <section id={coverAnchor("Purpose")}>
        <h3>Purpose</h3>
        <p className="hint">How Confidential Information may be used</p>
        <p className="prewrap">
          <Filled value={data.purpose} placeholder="Purpose" />
        </p>
      </section>

      <section id={coverAnchor("Effective Date")}>
        <h3>Effective Date</h3>
        <p>
          <Filled value={effectiveDate} placeholder="Effective date" />
        </p>
      </section>

      <section id={coverAnchor("MNDA Term")}>
        <h3>MNDA Term</h3>
        <p className="hint">The length of this MNDA</p>
        <OptionLine selected={data.mndaTermKind === "expires"}>
          Expires <Filled value={pluralYears(data.mndaTermYears)} placeholder="—" /> from
          Effective Date.
        </OptionLine>
        <OptionLine selected={data.mndaTermKind === "untilTerminated"}>
          Continues until terminated in accordance with the terms of the MNDA.
        </OptionLine>
      </section>

      <section id={coverAnchor("Term of Confidentiality")}>
        <h3>Term of Confidentiality</h3>
        <p className="hint">How long Confidential Information is protected</p>
        <OptionLine selected={data.confidentialityKind === "years"}>
          <Filled value={pluralYears(data.confidentialityYears)} placeholder="—" /> from
          Effective Date, but in the case of trade secrets until Confidential Information is
          no longer considered a trade secret under applicable laws.
        </OptionLine>
        <OptionLine selected={data.confidentialityKind === "perpetuity"}>
          In perpetuity.
        </OptionLine>
      </section>

      <section>
        <h3>Governing Law &amp; Jurisdiction</h3>
        <p id={coverAnchor("Governing Law")}>
          Governing Law: <Filled value={data.governingLaw} placeholder="Governing law" />
        </p>
        <p id={coverAnchor("Jurisdiction")}>
          Jurisdiction: <Filled value={data.jurisdiction} placeholder="Jurisdiction" />
        </p>
      </section>

      <section>
        <h3>MNDA Modifications</h3>
        {data.modifications.trim() ? (
          <p className="prewrap">
            <mark className="filled">{data.modifications.trim()}</mark>
          </p>
        ) : (
          <p>None.</p>
        )}
      </section>

      <p className="sign-note">
        By signing this Cover Page, each party agrees to enter into this MNDA as of the
        Effective Date.
      </p>

      <table className="sig-table">
        <thead>
          <tr>
            <th scope="col">
              <span className="sr-only">Field</span>
            </th>
            <th scope="col">Party 1</th>
            <th scope="col">Party 2</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Signature</th>
            <td className="sig-cell" />
            <td className="sig-cell" />
          </tr>
          {SIGNATURE_ROWS.map((row) => (
            <tr key={row.label}>
              <th scope="row">{row.label}</th>
              <PartyCells pick={row.pick} data={data} />
            </tr>
          ))}
          <tr>
            <th scope="row">Date</th>
            <td />
            <td />
          </tr>
        </tbody>
      </table>

      <h2>Standard Terms</h2>

      {/* explicit role: Safari drops implicit list semantics when list-style is none */}
      <ol className="terms-list" role="list">
        {STANDARD_TERMS.map((section) => (
          <li key={section.title}>
            <strong>{section.title}</strong>. {renderRichText(section.body)}
          </li>
        ))}
      </ol>

      <p className="doc-footer">
        Common Paper Mutual Non-Disclosure Agreement (Version {STANDARD_TERMS_VERSION}) free
        to use under{" "}
        <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
          CC BY 4.0
        </a>
        .
      </p>
    </article>
  );
}
