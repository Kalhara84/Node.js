# Payroll System - Employee Module

| Part     | Technology                                                        | Port |
|----------|-------------------------------------------------------------------|------|
| Backend  | Node.js + Express + TypeScript + `pg`                             | 3001 |
| Frontend | Vite + TypeScript (single page app) + Bootstrap 5 (violet/orange) | 3000 |
| Database | PostgreSQL                                                        | 5432 |

Everything is TypeScript. There is no React and no Next.js.

## Project structure

```
Payroll_II/
  db/payroll_db.sql          database schema + sample data
  backend/                   Express API (MVC)
  frontend/
    index.html               page shell (loads src/main.ts)
    vite.config.ts           dev server on port 3000
    .env                     VITE_API_URL (backend address)
    public/                  served as-is: favicon.svg, assets/ (logo + SVG art)
    src/
      main.ts                imports Bootstrap + style.css, starts app.ts
      app.ts                 router + app shell (sidebar / topbar)
      api.ts                 fetch wrapper for every API call
      auth.ts                login / logout / current user
      ui.ts  charts.ts       helpers, modal, SVG charts
      types.ts               shared TypeScript types
      style.css              theme (colours are CSS variables at the top)
      pages/                 login, dashboard, employees, employee-view, employee-form
```

## Requirements

- Node.js 20 or newer (npm included)
- PostgreSQL 13 or newer

## Installation and run

### 1. Database

```bash
psql -U postgres -c "CREATE DATABASE payroll_db;"
psql -U postgres -d payroll_db -f db/payroll_db.sql
```

### 2. Backend (terminal 1)

```bash
cd backend
npm install
```

Edit `backend/.env` (copy it from `.env.example` if it is missing):

```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_NAME=payroll_db
FRONTEND_URL=http://localhost:3000
AUTH_SECRET=any-long-random-text
```

```bash
npm run dev
```

Open http://localhost:3001 - you should see "Payroll API is running".

### 3. Frontend (terminal 2)

```bash
cd frontend
npm install
```

`frontend/.env` (copy from `.env.example` if it is missing):

```
VITE_API_URL=http://localhost:3001/api
```

```bash
npm run dev
```

Open http://localhost:3000 and sign in with **admin / 1234** (change this password for real use).

> `FRONTEND_URL` in `backend/.env` must match the frontend address (`http://localhost:3000`), otherwise the browser blocks the API calls (CORS). The Vite dev server is fixed to port 3000 for this reason.

## Frontend scripts

| Command             | What it does                                     |
|---------------------|--------------------------------------------------|
| `npm run dev`       | start the Vite dev server with hot reload        |
| `npm run typecheck` | TypeScript check, no files written               |
| `npm run build`     | type check + production build into `dist/`       |
| `npm run preview`   | serve the production build on port 3000          |

`VITE_` variables are read when Vite starts/builds, so restart `npm run dev` after editing `frontend/.env`.

## Production

```bash
cd backend  && npm run build && npm start    # tsc -> dist/, then node dist/server.js
cd frontend && npm run build                 # static files in frontend/dist
```

Serve `frontend/dist` with any static host (Nginx, Apache, etc.) and redirect all unknown URLs to `index.html`
(the app uses client side routing). Set `VITE_API_URL` to the real API address before building and put the
site address in `FRONTEND_URL` of the backend.

## API (all need `Authorization: Bearer <token>` except login)

| Method         | URL                          | Purpose                                 |
|----------------|------------------------------|-----------------------------------------|
| POST           | /api/auth/login              | `{username,password}` -> `{token,user}` |
| GET            | /api/auth/me                 | current user                            |
| GET            | /api/dashboard               | dashboard numbers                       |
| GET            | /api/lookups                 | dropdown data                           |
| GET            | /api/employees?search=&page=&limit= | list                             |
| GET            | /api/employees/next-number   | next free employee number               |
| POST           | /api/employees               | add                                     |
| GET/PUT/DELETE | /api/employees/:id           | one / update / delete                   |

## Troubleshooting

- **"Cannot reach the server"** - backend is not running, or `VITE_API_URL` is wrong.
- **CORS error in the browser console** - `FRONTEND_URL` in `backend/.env` is not `http://localhost:3000`; fix it and restart the backend.
- **Port 3000 already in use** - stop the other program (Vite is set to `strictPort`, it will not silently pick another port).
- **Database connection error** - check `DB_*` values in `backend/.env` and that PostgreSQL is running.
