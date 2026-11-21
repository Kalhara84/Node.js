# Payroll System - Employee Module (Node.js + TypeScript)

| Part     | Technology                                              | Port |
|----------|---------------------------------------------------------|------|
| Backend  | **Node.js + Express + TypeScript** + `pg`               | 3001 |
| Frontend | **Node.js + Express + TypeScript** server, browser app in **TypeScript** (compiled to `public/js`) + Bootstrap 5 (violet/orange theme) | 3000 |
| Database | PostgreSQL                                              | 5432 |

No Next.js / React. Everything is strict TypeScript (`npm run typecheck` in both folders). Step-by-step guide to create it from scratch: **BUILD_GUIDE.md**.

## Frontend structure
```
frontend/server/server.ts       Express: serves public/ + bootstrap + /config.js
frontend/client/                browser code in TypeScript: app.ts (router), api.ts, auth.ts, ui.ts, charts.ts, types.ts, pages/*.ts
frontend/public/index.html      page shell
frontend/public/css/style.css   theme
frontend/public/js/             GENERATED from client/ by tsc (do not edit)
frontend/public/assets/         logo + SVG illustrations
```

## Backend structure (MVC)
```
backend/src/
  types.ts                    Employee, Lookups, DashboardData ... (shared shapes)
  server.ts / app.ts          start + express setup (CORS, JSON)
  routes/index.ts             all routes
  middleware.ts               requireAuth (token), error handler
  controllers/                auth, dashboard, employee (+ lookups)
  models/                     SQL: user, lookup, employee, dashboard
  validators/employee.validator.ts
  lib/db.ts  lib/auth.ts      pg pool, scrypt password + HMAC token (Node crypto)
```

## Run
Requirements: Node.js 20+ and PostgreSQL 13+.

```bash
psql -U postgres -c "CREATE DATABASE payroll_db;"
psql -U postgres -d payroll_db -f database/payroll_db.sql
```

Backend (terminal 1) - edit `backend/.env` first (DB password, AUTH_SECRET):
```bash
cd backend
npm install
npm run dev        # TypeScript runs directly with tsx (auto restart)
```
Open http://localhost:3001 -> "Payroll API is running".

Frontend (terminal 2):
```bash
cd frontend
npm install
npm run dev      # compiles client/ -> public/js and starts the server
```
Open http://localhost:3000 and sign in with **admin / 1234** (change this password for real use).

## API (all need `Authorization: Bearer <token>` except login)
| Method | URL | Purpose |
|--------|-----|---------|
| POST | /api/auth/login | `{username,password}` -> `{token,user}` |
| GET | /api/auth/me | current user |
| GET | /api/dashboard | dashboard numbers |
| GET | /api/lookups | dropdown data |
| GET | /api/employees?search=&page=&limit= | list |
| GET/PUT/DELETE | /api/employees/:id | one / update / delete |
| POST | /api/employees | add |

## UI / images
Old photos (`m0.jpg`, `m1.jpg`, `login_security.png`) were removed. New original SVG artwork is in `frontend/public/assets/`
(`login-hero.svg`, `banner.svg`, `empty.svg`, `shield.svg`, `favicon.svg`). The Mike Flora `logo.jpg` is kept.
Theme colours are CSS variables at the top of `frontend/src/app/globals.css`.

## Production
```bash
cd backend  && npm run build && npm start   # tsc -> dist/, then node dist/server.js
cd frontend && npm start                    # builds client + server, then runs
```

## Useful scripts (both folders)
| Command | What |
|---------|------|
| `npm run dev` | develop with auto reload |
| `npm run typecheck` | strict TypeScript check, no files written |
| `npm run build` | compile to JavaScript |
