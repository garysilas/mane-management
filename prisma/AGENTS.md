# Prisma data layer

## Overview

This area defines the PostgreSQL data model and its ordered migrations. Prisma Client is shared through `lib/db/prisma.ts`.

## Key files

| File | Owns |
|---|---|
| `prisma/schema.prisma` | Canonical models, enums, relations, and indexes |
| `prisma/migrations/` | Checked in database history |
| `prisma.config.ts` | Schema path, migration path, and `DATABASE_URL` loading |
| `lib/db/prisma.ts` | Shared Prisma Client instance |

## Commands

```bash
npm run prisma:generate
npm run prisma:migrate
DATABASE_URL='postgresql://user:pass@localhost:5432/mane_manager' npx prisma validate
```

## Conventions

* Change `schema.prisma` and add a migration together for persistent model changes.
* Preserve tenant ownership through `barberId` and keep useful compound indexes for scoped queries.
* Use cascade deletion for barber owned records. Appointment references to clients and services use restrict deletion.
* Store money as integer cents and dates as PostgreSQL timestamps through Prisma `DateTime` fields.

## Gotchas

* `DATABASE_URL` is required by Prisma commands.
* Pull request automation creates and removes Neon database branches, but it does not run migrations or tests.
* Generate Prisma Client after schema changes before TypeScript checks or tests.

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
