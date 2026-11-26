# Payroll System

| Part     | Technology                                                        | Port |
|----------|-------------------------------------------------------------------|------|
| Backend  | Node.js + Express + TypeScript + `pg`                             | 3001 |
| Frontend | React + Vite + TypeScript + Bootstrap 5 (violet/orange)           | 3000 |
| Database | PostgreSQL                                                        | 5432 |

Everything is TypeScript. React owns the application shell and routing lifecycle.
Existing page modules run inside a React-managed DOM boundary to preserve forms,
tables, exports, and Select2 behavior. Their internals still use imperative DOM
rendering; they have not been rewritten as JSX components. There is no Next.js.

## Project structure

```
Payroll_II/
  db/payroll_db.sql          PostgreSQL schema + up to 50 original rows per table
  backend/                   Express API (MVC)
  frontend/
    index.html               page shell (loads src/main.ts)
    vite.config.ts           dev server on port 3000
    .env                     VITE_API_URL (backend address)
    public/                  served as-is: favicon.svg, assets/ (logo + SVG art)
    src/
      main.ts                imports styles and mounts the React root
      App.tsx                React router, sidebar / topbar, page lifecycle
      navigation.ts          menu definitions, routes, route matching
      app.ts                 compatibility export for navigate()
      api.ts                 fetch wrapper for every API call
      auth.ts                login / logout / current user
      ui.ts  charts.ts       helpers, modal, SVG charts
      types.ts               shared TypeScript types
      style.css              theme (colours are CSS variables at the top)
      pages/                 login, dashboard, employees, employee-view, employee-form
```

## Requirements

Holiday Master (`a_holm.php` + `a_holenter.php`) is available from **Holidays** at
`/a_holm`; `/a_holenter` opens the same screen. It includes the holiday list,
year/search filters, view, add, edit and confirmed delete. Holiday types come from
`a_sysmast` category 3. The date stays fixed during amendment, and entry/amendment
audit fields follow the existing pattern. One holiday per date is enforced by a
database unique index. SQL is in `holiday.controller.ts`, without a model file.
For existing installations run `node --env-file=.env scripts/migrate-holidays.cjs`
from `backend`. Both setup SQL files include the migration for new databases.
Assign `a_holm` View/Add/Amend/Delete rights through User Rights. The two legacy PHP
files form one module, so they share this single program registration.

Attendance Correction is available at `/a_inqempatt` from the Attendance sidebar item.
It converts the legacy `a_inqempatt.php` inquiry and adds record creation, editing,
viewing and deletion. SQL lives in the attendance controller; no attendance model is used.
For an existing database, run `node --env-file=.env scripts/migrate-attendance.cjs`
from `backend` once. Both database setup files include the same migration for new installs.
Assign `a_inqempatt` View/Add/Amend/Delete permissions through User Rights for non-admin users.
The inquiry uses active employees, mapping codes and calendar months, with OT1/OT2/late totals.
Corrections affect `a_denmast` only; payroll transfer/recalculation is not performed by this screen.
Entry audit fields are retained on edit; amendment user/date/time are recorded separately.

- Node.js 20 or newer (npm included)
- PostgreSQL 13 or newer

## Installation and run

### 1. Database

```bash
psql -U postgres -c "CREATE DATABASE payrollDB_Test;"
psql -U postgres -d payrolldb_test -v ON_ERROR_STOP=1 -f db/payroll_db.sql
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

Open http://localhost:3000 and sign in using an account from the original database.
The SQL retains up to 50 original source rows in each table. Tables with fewer than
50 source rows retain all available rows. No synthetic employees or demo admin
account are added. The retained rows are a per-table sample; references to rows
outside the sample can be missing.

Re-running the SQL creates missing tables and inserts missing sample rows.
`ON CONFLICT DO NOTHING` preserves existing records. Tables are never dropped.
All columns are defined inside their `CREATE TABLE` blocks. Existing table changes
need separate, targeted migrations. Re-importing does not remove old database rows;
use a fresh database to load only this reduced dataset.

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
| GET            | /api/auth/me                 | current user and permissions            |
| POST           | /api/auth/password           | change own password                     |
| GET            | /api/dashboard               | dashboard numbers                       |
| GET            | /api/lookups                 | dropdown data                           |
| GET            | /api/employees?search=&page=&limit= | list                             |
| GET            | /api/employees/next-number   | next free employee number               |
| POST           | /api/employees               | add                                     |
| GET/PUT/DELETE | /api/employees/:id           | one / update / delete                   |

## PHP application integration

The existing **Employees**, **Programs**, **Users**, and **User Rights** screens
use the supplied `prmkfn_Project.zip` sources. The missing `login.php`, `menu.php`,
`usrval.php` and `chngpass.php` flows are now integrated into the TypeScript app:

- Existing PHP DES-crypt passwords work at login and upgrade to scrypt after a
  successful sign-in. New and changed passwords use scrypt.
- **My Account** provides current-password verification and confirmed password changes.
- Employee add/amend/delete access follows the operation flags on the `p_empenter` program (a `.php` ending in the database name is ignored)
  (and its supplied alternate). Listing requires employee view or operation rights.
  Backend checks enforce permissions even when a URL/API is accessed directly.
- Inactive accounts cannot keep using an existing token. Navigation and employee
  action buttons reflect the signed-in user's permissions.
- Administrators manage users, program definitions, modules/submodules and filtered
  rights. Single-level programs use Access; Multi-level programs use Add/Amend/Delete.
  Rights can be selected per column or for all shown programs. Hidden legacy flags
  and rights outside the displayed selection are retained.

The archive contains 284 PHP files, including attendance calculations, payroll runs,
exports, reports, old copies and libraries. Those other workflows have not been
ported by this integration; their database table definitions are retained; the SQL file retains up to 50 original source records per table.
`p_login.php` is referenced by the employee source but absent from the archive;
the app's shared login handles that dependency. No additional PHP login file is needed.

## Screen access from the database

Every screen is controlled by program rights stored in `prgmast` / `usrmast`; administrators can use every screen. The screens are already registered as programs in `db/payroll_db.sql`; give users their rights on the User Rights screen.

| Screen | Program (`prgmast.prgnam`) | Rights |
|---|---|---|
| Dashboard | `dashboard` | Access |
| Employees | `p_empm`, `p_empenter` | Access, Add, Amend, Delete |
| Program Master | `a_programs` | Add, Amend, Delete |
| User Master | `a_users` | Add, Amend |
| User Rights | `usrenter` | Access |

To control a new screen: add one line for it in `SCREENS` in `backend/src/lib/permissions.ts`, add its program row in the database, protect its routes with `requireScreen('<screen>', '<action>')`, and add it to the `Screen` type, the menu and the route list in `frontend/src`. A `.php` ending on a program name in the database is ignored.

## User access assignment (`usrenter`)

Open **User Rights** in the sidebar, or `/usrenter`. The previous
`/administration/rights` address opens the same screen. Select a user, choose
Module and Submodule **All / Select**, then press **CHECK**. Single (`S`) programs
use **Y/N**; Multiple (`M`) programs use **Add / Amend / Delete**. Use the column
checkboxes, **Check all**, or **Clear all**, then **SAVE**. **RESET** restores the
last checked values. **DELETE** removes rights only for the checked user and scope.
Changing the selection requires another CHECK before saving.

The converted source files retain the `usrenter` basename:
`frontend/src/pages/usrenter.ts` and `backend/src/routes/usrenter.ts`.
They use TypeScript because this application runs Node.js. The screen address is
`/usrenter` and the authenticated API is `/api/administration/usrenter`
(GET for CHECK, POST for SAVE/DELETE).
Original names are retained: `usrusdsno`, `usrusdsnoauto`, `modopt`, `smodopt`,
`modsno`, `modsnoauto`, `submodsno`, `submodsnoauto`, `prgsno`, `hcount`,
`hcountmod`, `usryn`, `usraddyn`, `usrameyn`, and `usrdelyn`.

The screen reads/writes the existing PostgreSQL `usdmast`, `prgmast`, `usrmast`,
and `a_sysmast` tables. Their original names and fields remain in
`db/payroll_db.sql`; no new database or migration is required for this screen.
Saving preserves the hidden legacy flags and creation audit on existing rights.
Only administrators can manage rights, including through direct API requests.
Administrator accounts retain full access independently of ordinary program rights.

## Complete PostgreSQL database

`db/payroll_db.sql` remains the **only** database setup file. It creates all 38
original tables and all 566 original fields, plus the application's account flags.
It contains all 5,205,838 PRMKFN source records, with no demo records mixed into them.
This includes 3,415 employees, 11 users and 66 program definitions.
There are no migration scripts or follow-up SQL files.

The loose `prmkfn.sql` produced a Windows cyclic-redundancy read error. The adjacent
`Database/Databse.zip` contains the same-named 630,032,001-byte SQL dump; its SQL was
extracted with ZIP CRC verification and used for conversion.

Import into a new, empty database:

```powershell
psql -U postgres -c "CREATE DATABASE payroll_db;"
psql -U postgres -d payroll_db -v ON_ERROR_STOP=1 -f db/payroll_db.sql
```

If `payroll_db` already exists, use a new name and set `DB_NAME` in `backend/.env`.
The script is transactional and fails on existing tables; it does not reset a live
database. The existing configured database is not replaced automatically.

MySQL integer display widths are removed; auto-increment fields become PostgreSQL
sequences; double fields remain double precision; enums become checked text.
The 5,974,360 zero dates become NULL, with nullable date fields and unique expression indexes
for legacy composite date keys. Original indexes, identifiers and sequence next
values are retained. Optional employee lookup fields accept NULL for the web form.
The attendance `a_atttran.atttime` field uses INTERVAL because 47 source values
exceed 23 hours; all those values are preserved. Other clock fields remain TIME.
Password storage widens to 200 characters; legacy hashes themselves are preserved.

On initial import, legacy `ADM` accounts and the known `admin`/`nalaka`/`2000` codes
receive the database-controlled `usdadmin` flag. Editing a designation later does
not grant administrator access. New users receive no administrative privileges.

Validation: backend `npm.cmd test` and frontend `npm.cmd run build`. Full source
SQL validation uses an isolated PostgreSQL schema with rollback. The user-rights
API was also checked against PostgreSQL temporary tables with rollback, including
scope isolation, hidden flags and audit preservation. Headless Chrome checks with
a mock API verified CHECK, selection controls, SAVE/RESET/DELETE and desktop/mobile
layouts. Preview screenshots are in `artifacts/usrenter-desktop.png` and
`artifacts/usrenter-mobile.png` and use test data.

## Troubleshooting

- **"Cannot reach the server"** - backend is not running, or `VITE_API_URL` is wrong.
- **CORS error in the browser console** - `FRONTEND_URL` in `backend/.env` is not `http://localhost:3000`; fix it and restart the backend.
- **Port 3000 already in use** - stop the other program (Vite is set to `strictPort`, it will not silently pick another port).
- **Database connection error** - check `DB_*` values in `backend/.env` and that PostgreSQL is running.
