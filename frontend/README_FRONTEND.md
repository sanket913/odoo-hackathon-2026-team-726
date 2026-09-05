# PeoplePay360 — Frontend

React 18 + Vite + Tailwind CSS SPA for PeoplePay360. See the repository root `README.md`
for the full project overview; this file covers frontend-specific setup and commands only.

## Requirements

- Node.js 18+ and npm
- The backend API running (see `backend/README_BACKEND.md`) — by default at
  `http://localhost:8000/api/v1`

## Setup

```bash
cd frontend
npm install
cp .env.example .env
```

`VITE_API_BASE_URL=/api/v1` uses the same-origin Vite proxy, which forwards API requests to `http://127.0.0.1:8000`. This works even when Vite selects another port, such as 5174. If your backend uses a different port, update the proxy target in `vite.config.js`.

## Run the dev server

```bash
npm run dev
```

Open `http://localhost:5173`. Log in with any of the demo credentials listed in the root
`README.md`.

## Build for production

```bash
npm run build
npm run preview   # serve the production build locally to sanity-check it
```

For production, configure your web server to forward `/api` to the backend. If deploying the API on a separate origin, set `VITE_API_BASE_URL` to that API URL before building and allow the exact frontend origin in the backend CORS configuration.

## Run tests

```bash
npm run test
node scripts/login-smoke.mjs # requires the frontend, backend, seeded demo accounts and Microsoft Edge
```

18 tests across 5 files: the Payrun wizard (step 1 "Continue" never calls the create-payrun
endpoint), the `RequireAuth`/`RequirePermission` route guards, Zod schema validation for the
employee and contract forms, and the API response normalizers.

## Key conventions

- **JavaScript only** — no TypeScript anywhere in this project.
- All server state goes through TanStack Query via the service modules in
  `src/lib/api/services/*.js` — pages never call Axios directly.
- All forms use React Hook Form + Zod (`src/schemas/*.js`).
- The dark enterprise theme tokens live in `tailwind.config.js` and `src/index.css`.
- The access token is kept in memory only (never `localStorage`); the refresh token lives in
  an HttpOnly cookie the browser sends automatically — see `src/lib/api/client.js` for the
  401 → refresh → retry flow.

See `docs/ARCHITECTURE.md` in the repository root for the full frontend layering
explanation.
