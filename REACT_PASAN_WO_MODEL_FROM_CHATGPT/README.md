# Attendance & Payroll System — React + TypeScript

Complete project containing PostgreSQL database, Node.js/Express backend, and React/TypeScript frontend.

## Stack

- Frontend: React 18 + TypeScript + Vite + React Router + Bootstrap 5
- Backend: Node.js 20+ + Express + TypeScript + PostgreSQL
- Database: PostgreSQL 13+
- Frontend port: `3000`
- Backend port: `3001`

## Project structure

```text
Payroll_II/
├── db/
│   └── payroll_db.sql
├── backend/
│   ├── src/
│   ├── test/
│   ├── package.json
│   └── .env
└── frontend/
    ├── src/
    │   ├── components/
    │   ├── pages/
    │   ├── services/
    │   ├── utils/
    │   ├── assets/
    │   ├── App.tsx
    │   └── main.tsx
    ├── package.json
    └── .env
```

There is **no frontend `models/` folder**.

## 1. Database

Create the database and import the supplied SQL file:

```bash
psql -U postgres -c "CREATE DATABASE payroll_db;"
psql -U postgres -d payroll_db -f db/payroll_db.sql
```

If the database already exists, only run the SQL import as appropriate for your existing database.

## 2. Backend

Open a terminal:

```bash
cd backend
npm install
npm run dev
```

Backend:

```text
http://localhost:3001
```

Check that the PostgreSQL settings in `backend/.env` are correct.

Default example:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=payroll_db
FRONTEND_URL=http://localhost:3000
AUTH_SECRET=change-this-to-a-long-random-text
```

## 3. Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend:

```text
http://localhost:3000
```

The frontend API URL is:

```env
VITE_API_URL=http://localhost:3001/api
```

## Login

Use the login account supplied by the database SQL/test data, for example:

```text
username: admin
password: 1234
```

Change the password for a real deployment.

## Build

Frontend:

```bash
cd frontend
npm run typecheck
npm run build
```

Backend:

```bash
cd backend
npm run typecheck
npm run build
```

## Important

Do not run the old frontend from the previous SPA project. The `frontend` directory in this package is the React version and uses `src/main.tsx` and `src/App.tsx`.
