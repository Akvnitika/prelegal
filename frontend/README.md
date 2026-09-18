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
npm test           # Vitest unit, component, and page tests (tests/)
npm run typecheck  # type-checks app and test files (vitest does not)
npm run lint
npm run build
```

`npm run test:watch` re-runs tests on change. Browser-only behavior (print
dialog, native pickers, downloads, responsive layout) is covered by the
[manual test plan](docs/manual-test-plan.md).

## Build

`npm run build` statically exports the site to `out/` (`output: "export"`),
which the FastAPI backend serves in production. When developing against a
local backend, set `NEXT_PUBLIC_API_BASE_URL=http://localhost:8003`.

## Layout

- `app/page.tsx` — the login page (PL-5 stub: any credentials are accepted)
- `app/nda/page.tsx` — the creator page: form state, download and print actions
- `components/login-form.tsx` — sign-in/sign-up form for the fake login
- `lib/api.ts` — fetch wrapper for backend API calls
- `lib/auth.ts` — auth API calls and the localStorage session placeholder
- `components/nda-form.tsx` — form for the Cover Page fields
- `components/nda-document.tsx` — the rendered agreement (Cover Page + Standard Terms)
- `lib/nda.ts` — data model and formatting helpers
- `lib/standard-terms.ts` — Common Paper MNDA Standard Terms v1.0
- `lib/markdown.ts` — Markdown export of the completed agreement
- `tests/` — Vitest suite; `tests/lib/standard-terms.test.ts` also diffs the
  embedded terms against `../templates/Mutual-NDA.md`
- `docs/manual-test-plan.md` — manual test checklist for browser-only behavior
