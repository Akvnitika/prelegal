# prelegal

A platform for drafting common legal agreements.

> **Status: Work in progress** 🚧

## Run

The whole app (static frontend + FastAPI backend + SQLite) runs in a single
Docker container:

```bash
# Mac
scripts/start-mac.sh
scripts/stop-mac.sh

# Linux
scripts/start-linux.sh
scripts/stop-linux.sh

# Windows (PowerShell)
scripts\start-windows.ps1
scripts\stop-windows.ps1
```

Then open http://localhost:8000, sign in, and you land in the Mutual NDA
creator. The login is currently a stub (PL-5): any credentials are accepted
and nothing is authenticated. The SQLite database is recreated from scratch
every time the container starts.

## Develop

- Frontend: `cd frontend && npm install && npm run dev` → http://localhost:3000
  (set `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000` to reach a local backend)
- Backend: `cd backend && uv run fastapi dev app/main.py` → http://localhost:8000
  (set `ENVIRONMENT=development` to enable CORS for the next dev server)
- Tests: `cd backend && uv run pytest` and `cd frontend && npm test`

## Layout

- `frontend/` — Next.js app, statically exported at build time
- `backend/` — FastAPI app (uv project); serves the API and the built frontend
- `templates/` — Common Paper legal templates (CC BY 4.0)
- `catalog.json` — index of the available templates
- `scripts/` — start/stop scripts per platform
