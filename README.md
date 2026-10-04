# XO.am

XO.am is a Next.js tic-tac-toe arena with PostgreSQL-backed accounts, match records, settings, friends, and live rooms.

## Requirements

- Node.js 20.9 or newer
- Docker Desktop (or a PostgreSQL 16 server)

## Local development

1. Copy `.env.example` to `.env` (`cp .env.example .env`).
2. Install dependencies with `npm install`.
3. Start PostgreSQL with `npm run db:up`.
4. Apply the checked-in database migration with `npm run db:migrate`.
5. Start Next.js with `npm run dev` and open `http://localhost:3000`.

`npm run db:down` stops the local database container. Its named volume keeps development data between restarts.

For a separately managed PostgreSQL server, set `DATABASE_URL` in `.env` to its connection string and skip Docker.

Production deployments should run `npm run db:deploy` before starting the new application version.