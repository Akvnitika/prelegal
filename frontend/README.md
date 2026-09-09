# prelegal frontend

Next.js app for creating legal agreements. The first (prototype) feature is a
Mutual NDA creator ([PL-4](https://jpjira.atlassian.net/browse/PL-4)): fill in
the key business terms, preview the completed agreement live, and download it.

The agreement is the Common Paper Mutual NDA (Standard Terms v1.0 plus Cover
Page), transcribed into `lib/standard-terms.ts` from `../templates/` and used
under CC BY 4.0.

## Develop

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Checks

```bash
npm run lint
npm run build
```

## Layout

- `app/page.tsx` — the creator page: form state, download and print actions
- `components/nda-form.tsx` — form for the Cover Page fields
- `components/nda-document.tsx` — the rendered agreement (Cover Page + Standard Terms)
- `lib/nda.ts` — data model and formatting helpers
- `lib/standard-terms.ts` — Common Paper MNDA Standard Terms v1.0
- `lib/markdown.ts` — Markdown export of the completed agreement
