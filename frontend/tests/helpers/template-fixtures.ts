import { type FieldMeta } from "@/lib/documents";

/** Exercises every template construct in one small document: header/variable
 * spans (incl. both apostrophe styles), id-only + empty spans, bold wrapping
 * spans, schemeless links, autolinks, a stray closing tag, and a full
 * depth-0..3 nesting chain. */
export const FIXTURE_TEMPLATE = `# Test Agreement

1. <span class="header_2" id="1">Service</span>
    1. <span class="header_3" id="1.1">Access.</span>  During the <span class="orderform_link">Subscription Period</span>, <span class="coverpage_link">Customer</span> may use <span class="coverpage_link">Provider's</span> product per the <span class="keyterms_link">Use Limits</span>.
    2. <span class="header_3" id="1.2">Caps.</span>  **<span id="1.2.a">Except</span> as allowed, the cap is the <span class="keyterms_link">General Cap Amount</span>.**
        a. <span id="1.2.b">nested</span> alpha item with a [link](commonpaper.com/x) and <https://example.com>.
            i. deep roman item referencing <span class="coverpage_link">Customer’s</span> data.
2. <span class="header_2" id="2">Definitions</span>
    1. <span id="2.1"></span>**"Term"** means the period.</span>
`;

export const FIXTURE_FIELDS: FieldMeta[] = [
  { name: "Provider", label: "Provider", hint: "Vendor name.", group: "Parties" },
  { name: "Customer", label: "Customer", hint: "Customer name.", group: "Parties" },
  {
    name: "Subscription Period",
    label: "Subscription Period",
    hint: "How long.",
    group: "Term",
  },
  { name: "Use Limits", label: "Use Limits", hint: "Caps.", group: "Term" },
  {
    name: "General Cap Amount",
    label: "Liability Cap",
    hint: "The cap.",
    group: "Liability",
  },
];
