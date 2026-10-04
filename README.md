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

## Vercel PostgreSQL

Vercel's original Postgres product is discontinued. Create a database through a PostgreSQL provider in the Vercel Marketplace, such as Neon, and connect it to this Vercel project.

Configure these variables in the Vercel project for every environment that needs a database:

- `DATABASE_URL`: the provider's pooled connection string for application requests.
- `DATABASE_URL_UNPOOLED`: the provider's direct connection string for Prisma migrations.
- `SESSION_COOKIE_NAME`: `xoam_session`.

The provider may expose different variable names. Map its pooled and direct URLs to the names above; do not use `NEXT_PUBLIC_` for database credentials. After saving the variables, redeploy so the build and serverless functions receive them.

For Production deployments, Vercel runs `npm run db:deploy` automatically before `npm run build`. This applies committed Prisma migrations on pushes to the production branch. Preview builds skip migrations so they cannot alter a shared production database. Give Preview an isolated database branch before applying migrations there. For local Docker development, the example `.env` uses the same local connection for both URLs.