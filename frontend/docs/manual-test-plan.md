# Manual Test Plan — Mutual NDA creator (PL-4)

Covers the behavior that automated tests (`npm test`) cannot: real browser
rendering, the print dialog, the native date picker and number spinners,
scrolling, downloads landing on disk, and responsive layout. Run it before
merging UI changes and before any demo.

## Setup

```powershell
cd frontend
npm install
npm run dev -- -p 3001   # 3000 may be in use by another project
```

Open http://localhost:3001. Record results per test ID: **Pass / Fail / Notes**.

## 1. Smoke

| ID | Steps | Expected |
| --- | --- | --- |
| SM-1 | Load the page | Header shows "prelegal / Mutual NDA creator"; form on the left, agreement preview on the right; no console errors |
| SM-2 | Read the preview without touching the form | Effective Date shows **today's date**; both term options show the first choice selected (☒); Governing Law / Jurisdiction show bracketed placeholders; Modifications shows "None." |

## 2. Form → live preview

| ID | Steps | Expected |
| --- | --- | --- |
| FP-1 | Edit **Purpose** | Preview's Purpose section updates on every keystroke, highlighted as filled |
| FP-2 | Pick an **Effective date** via the native date picker | Preview shows it long-form (e.g. "September 10, 2026"), unaffected by timezone |
| FP-3 | Clear the effective date | Preview falls back to today |
| FP-4 | Select "Continues until terminated" | ☒ moves to that option in the preview; the years box next to "Expires" greys out and rejects input |
| FP-5 | With "Expires" selected, change years using the **spinner arrows** and by typing | Preview says "1 year" (singular) or "N years"; spinner respects min 1 / max 99 |
| FP-6 | In the years box, type `0`, then click elsewhere | Value snaps back to a valid committed value (never 0 in the preview) |
| FP-7 | Repeat FP-4–FP-6 for **Confidentiality lasts** ("In perpetuity") | Same behavior in the Term of Confidentiality section |
| FP-8 | Fill **Governing law** and **Jurisdiction** | Both appear highlighted in the preview's Governing Law & Jurisdiction section |
| FP-9 | Fill all four fields for **Party 1** and **Party 2** | Signature table rows (Print name, Title, Company, Notice address) fill in the correct column |
| FP-10 | Type text in **Modifications**, then clear it | Preview shows the text, then returns to "None." |

## 3. Standard Terms

| ID | Steps | Expected |
| --- | --- | --- |
| ST-1 | Scroll the preview's Standard Terms | 11 numbered sections, Introduction → General; defined terms bold |
| ST-2 | Click an underlined cover-page reference (e.g. "Purpose" in section 1) | Preview scrolls to that Cover Page section |
| ST-3 | Click the commonpaper.com link and the CC BY 4.0 link | Each opens in a new tab |

## 4. Download

| ID | Steps | Expected |
| --- | --- | --- |
| DL-1 | Fill both company names, click **Download Markdown** | File downloads as `Mutual-NDA-<Party1>-<Party2>.md` with punctuation collapsed to hyphens (e.g. `Mutual-NDA-Acme-Inc-Globex-Corp.md`) |
| DL-2 | Download with company names blank | Filename falls back to `Mutual-NDA-Party-1-Party-2.md` |
| DL-3 | Open the file in a Markdown viewer (e.g. VS Code preview) | Complete agreement: Cover Page with your values, checked/unchecked term options, signature table, all 11 Standard Terms, CC BY footer; no `{{...}}` markers or stray formatting |
| DL-4 | Company name with special characters (e.g. `A/B & Sons!`) | Download succeeds; filename is a clean slug |

## 5. Print / PDF

| ID | Steps | Expected |
| --- | --- | --- |
| PR-1 | Click **Print or save as PDF** | Browser print dialog opens |
| PR-2 | Inspect the print preview | Only the agreement document — header bar and form are hidden; white background |
| PR-3 | Save as PDF and open it | Readable multi-page agreement; nothing clipped at page breaks |
| PR-4 | Print with fields empty | Placeholders like `[Governing law]` are visible so gaps are obvious |

## 6. Keyboard & accessibility

| ID | Steps | Expected |
| --- | --- | --- |
| KA-1 | Tab through the whole form | Every input, radio, and button is reachable in a logical order with a visible focus outline |
| KA-2 | Operate radios with arrow keys, buttons with Enter/Space | Selection and actions work without a mouse |
| KA-3 | Zoom to 200% | Layout remains usable; no clipped or overlapping text |
| KA-4 | (Optional) Screen reader pass | Every field announces its label; term options announce "Selected"/"Not selected" |

## 7. Responsive & browsers

| ID | Steps | Expected |
| --- | --- | --- |
| RB-1 | Narrow the window below ~1024px | Panes stack: form above, document below; both fully usable |
| RB-2 | On desktop width, scroll each pane | Form and preview scroll independently; header stays put |
| RB-3 | Repeat SM-1, FP-2, DL-1, PR-2 in Chrome, Edge, and Firefox (Safari if available) | Consistent behavior; date picker and downloads work in each |

## 8. Edge cases

| ID | Steps | Expected |
| --- | --- | --- |
| EC-1 | Paste a very long Purpose (several paragraphs) | Preview wraps the text; layout doesn't break; download contains all of it |
| EC-2 | Use non-Latin company names (e.g. `Müller GmbH`, `株式会社`) | Preview renders them correctly; download filename degrades gracefully |
| EC-3 | Paste text with line breaks into Purpose / Modifications | Line breaks preserved in the preview and the export |
| EC-4 | Refresh the page after filling the form | State resets to defaults (no persistence is expected in the prototype) |
