# Mane Manager

## Stack

* **Language and runtime**: TypeScript on Node.js 22
* **Framework**: Next.js 16 App Router, React 19, Tailwind CSS 4
* **Key dependencies**: Prisma 6 with PostgreSQL, Clerk, Trigger.dev, Resend, Twilio
* **Package manager**: npm with `package-lock.json`

## Build approach

Journey (finish one complete barber or booking client path before starting the next).

## Commands

```bash
npm install
npm run dev
npm run dev:local
npm run build
npm run lint
npm run test:unit
npm run test:e2e
npm run prisma:generate
npm run prisma:migrate
```

The Run action in `.codex/environments/environment.toml` says `npm rum dev:local`. Use the command above until that action is corrected.

## Specs

No specs exist now. Put future specs in `docs/specs/NNNN-title.md`.

## Rules

* Keep pages and route handlers in `app`, reusable UI in `components`, and business rules in `lib`.
* Use the `@/` alias for project imports and keep TypeScript strict.
* Validate request data with the Zod schemas in `lib/validators` before database work.
* Protected operations call `getOrCreateCurrentBarber()` and scope every record lookup by `barberId`.
* Keep timezone calculations in `lib/utils/time.ts`. Store dates as `Date` values and return ISO strings at API boundaries.
* Treat email and SMS delivery as best effort. Missing provider variables make those wrappers return without sending.
* Payments are preserved scaffolding and are not an active product surface.
* Add or update focused Vitest coverage for business rules. Playwright proves the public booking journey through real APIs and a migrated database, then verifies the persisted appointment and reminder records.

## Agent skills

- [next-dev-loop](.agents/skills/next-dev-loop/): `vercel/next.js`, verifies behavior in a running Next.js app
- [clerk](.agents/skills/clerk/): `clerk/skills`, routes Clerk tasks to focused guidance
- [clerk-nextjs-patterns](.agents/skills/clerk-nextjs-patterns/): `clerk/skills`, covers Clerk patterns for Next.js
- [clerk-webhooks](.agents/skills/clerk-webhooks/): `clerk/skills`, covers verified Clerk webhook handling
- [clerk-testing](.agents/skills/clerk-testing/): `clerk/skills`, covers Clerk flows in Playwright and Cypress
MCP servers: Neon (recommended), Clerk (recommended)

## Context files

- [app/api/AGENTS.md](app/api/AGENTS.md): route validation, authentication, and response conventions
- [lib/scheduling/AGENTS.md](lib/scheduling/AGENTS.md): scheduling invariants, booking transactions, and timezone rules
- [prisma/AGENTS.md](prisma/AGENTS.md): data model and migration conventions

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
