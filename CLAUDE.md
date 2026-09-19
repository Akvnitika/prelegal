# Prelegal Project

## Overview

This is a SaaS product to allow users to draft legal agreements based on templates in the templates directory.
The user can carry out AI chat in order to establish what document they want and how to fill in the fields.
The available documents are covered in the catalog.json file in the project root, included here:

@catalog.json

## Current status (through PL-8, merged 2026-09-19)

All catalog document types are supported end to end, with real multi-user
authentication, per-user document persistence, and draft disclaimers:

- **Auth (PL-8)**: sign up / sign in with PBKDF2-hashed passwords (stdlib,
  `backend/app/security.py`), 409 on duplicate email, 401 on bad credentials,
  bearer session tokens in a `sessions` table, sign-out. The chat and
  saved-document APIs require a session; `/create`, `/nda`, and `/documents`
  are client-guarded (static export has no middleware). Post-login lands on
  `/documents`.
- **Creators**: `/create` (PL-7) is the chat-led generic creator for the 10
  non-NDA templates — selection mode grounded in catalog.json (unsupported
  requests get a closest-match offer), then field filling against the
  registry in `backend/app/documents/registry.py` (field names must exactly
  match each template's `<span class="…_link">` variables; test-enforced).
  `/nda` (PL-6) is the bespoke Mutual NDA creator. Both: chat + Edit-manually
  tabs over shared state, live paper preview, print, Markdown export.
- **Saved documents (PL-8)**: creator state (fields/NdaData + full chat
  transcript) auto-saves (debounced) to `/api/saved-documents` (path is
  disjoint from the `/api/documents` template catalog). `/documents` lists,
  reopens (restores the conversation too), and deletes. Everything still
  resets on container restart by design.
- **Disclaimers (PL-7/8)**: every document preview/print/export carries
  "DRAFT — Subject to review by qualified legal counsel." plus the Common
  Paper CC BY 4.0 attribution; the chat input and login carry a UI-only
  not-legal-advice line.
- **Cross-stack contracts** are pinned by golden fixtures (backend
  `tests/test_chat.py`/`test_doc_chat_router.py` ↔ frontend
  `tests/lib/chat.test.ts`/`doc-chat.test.ts`) — change both sides together.
  Datetimes must serialize with an explicit UTC offset (SQLite drops tzinfo).

## Development process

When instructed to build a feature:
1. Use your Atlassian tools to read the feature instructions from Jira
2. Develop the feature - do not skip any step from the feature-dev 7 step process
3. Thoroughly test the feature with unit tests and integration tests and fix any issues
4. Submit a PR using your github tools

## AI design

When writing code to make calls to LLMs, use your Cerebras skill (LiteLLM via
OpenRouter with Cerebras as the inference provider) and Structured Outputs so
you can interpret the results and populate fields in the legal document.

The current model is `openrouter/openai/gpt-oss-120b` (see
`backend/app/services/chat_common.py`) — chosen in PL-7 because Cerebras
genuinely serves it on OpenRouter (verified live), unlike the skill doc's
original gpt-sol alias. Two litellm quirks apply: pass
`allowed_openai_params=["reasoning_effort"]` (the openrouter mapping rejects
the param otherwise) and keep `extra_body={"provider": {"order":
["cerebras"]}}`. Copy the `completion()` call in
`backend/app/services/nda_chat.py` rather than the raw skill snippet.

There is an OPENROUTER_API_KEY in the .env file in the project root.

## Technical design

The entire project is packaged into a Docker container.
The backend is in backend/, a uv project using FastAPI.
The frontend is in frontend/, a Next.js static export (`output: "export"`)
served by FastAPI; routes: `/` (login), `/documents`, `/create`, `/nda`.
The database is SQLite, created from scratch each time the container starts
(tables: users, sessions, saved_documents — sessions and data intentionally
last one container lifetime).
`templates/` and `catalog.json` are read at runtime by `backend/app/paths.py`.
Scripts in scripts/:
```bash
# Mac
scripts/start-mac.sh    # Start
scripts/stop-mac.sh     # Stop

# Linux
scripts/start-linux.sh
scripts/stop-linux.sh

# Windows
scripts/start-windows.ps1
scripts/stop-windows.ps1
```
Backend available at http://localhost:8003

Test/verify commands: `cd backend && uv run pytest`; `cd frontend && npm test
&& npm run typecheck && npm run lint && npm run build`.

## Color Scheme
- Accent Yellow: `#ecad0a`
- Blue Primary: `#209dd7`
- Purple Secondary: `#753991` (submit buttons)
- Dark Navy: `#032147` (headings)
- Gray Text: `#888888`
- Danger: `#dc2626` (errors)

The brand palette above covers all app chrome. Only the rendered document
paper (`.paper`/`.nda-doc`/`.tmpl-doc` in `frontend/app/globals.css`) keeps
the older "pine" tokens, so documents read as printed pages inside the shell.
