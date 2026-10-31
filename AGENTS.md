# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project overview

Air War Trail frontend: a server-rendered Astro 7 site (`output: "server"`) with React 19 islands, deployed to **Cloudflare Workers** via `@astrojs/cloudflare`. Users sign up, subscribe through Stripe, and stream premium video content (Mux). Content comes from a separate backend Worker (the Air War Trail CMS API) over a service binding.

## Stack

| Area | Tooling |
| --- | --- |
| Framework | Astro 7, React 19 (with React Compiler), Tailwind CSS 4, Radix UI, Preline |
| Language | TypeScript 7 (strict, `@/*` → `src/*`) |
| Package manager | **pnpm** (version pinned in `packageManager`) |
| Lint / format | **Biome** (tabs, double quotes, organize imports) |
| Hosting | Cloudflare Workers (`wrangler.jsonc`), D1, KV, service binding, rate limiters |
| Auth | Better Auth + Drizzle adapter (D1), Stripe plugin, Turnstile |
| Data fetching | tRPC client (`@trpc/tanstack-react-query`) against the CMS Worker |
| Forms / validation | react-hook-form, Zod 4 |
| Email | Resend, react-email |
| Env / secrets | Varlock (`.env.schema`, see [Environment variables](#environment-variables)) |

## Commands

Always use `pnpm`. Never use `npm`, `yarn`, or commit a different lockfile.

```bash
pnpm install            # install deps (minimumReleaseAge is enforced, see pnpm-workspace.yaml)
pnpm dev                # astro dev
pnpm dev:cf             # astro build + wrangler dev (runs on the workerd runtime)
pnpm build              # production build
pnpm preview            # build + astro preview
pnpm lint               # biome lint
pnpm format             # biome format --write
pnpm deploy:cf          # build + wrangler deploy  (production — do not run without explicit user approval)
```

There is no test suite yet. Verify changes with `pnpm lint`, `pnpm build`, and (for type errors) `pnpm exec tsc --noEmit`.

Do not run `pnpm clean`, `pnpm deploy:cf`, `wrangler deploy`, or any D1 migration against remote databases unless the user explicitly asks.

## Repository layout

```
src/
  actions/        Astro Actions
  components/     React + Astro components (ui/ = shadcn-style primitives, plus auth, checkout, video, playlist, ...)
  content/        Content collections (policies)
  layouts/        BaseLayout.astro, Meta.astro
  lib/            auth.ts, auth-client.ts, auth-check.ts, db-auth-schema.ts, schemas.ts, utils.ts, trpc/
  lib/trpc/       client.ts (browser), server.ts (service binding), types.ts (AppRouter), index.ts
  middleware.ts   Session -> token error -> auth guards (sequence)
  pages/          File-based routes; pages/api/ holds auth, stripe, trpc, images endpoints
  styles/         global.css (Tailwind), lenis.css
drizzle/          Generated SQL migrations for the auth D1 database
docs/api/         Documentation of the CMS tRPC API (read before touching trpc code)
worker-configuration.d.ts   Generated Cloudflare types (do not edit by hand)
.agents/          Agent skills and agent-only docs (see below)
```

## Working in this project

### Cloudflare Workers runtime
- **Wrangler only:** this project is configured with `wrangler.jsonc` and deployed with Wrangler. The `cf` CLI / `cloudflare.config.ts` was evaluated and rolled back because Astro 7 and `@astrojs/cloudflare` do not support it yet. Do not run `cf migrate`, `cf dev`, `cf build`, or `cf deploy`, and do not add `cloudflare.config.ts`. Revisit when Astro and the Cloudflare plugin add support.
- Access bindings and env with `import { env } from "cloudflare:workers"`, not `Astro.locals.runtime` or `process.env`.
- Bindings: `DB_AUTH` (D1), `KV_AUTH` (sessions KV), `ASSETS`, `AWT_CMS` (service binding to the CMS Worker), `RATE_LIMIT_BASIC` / `RATE_LIMIT_PREMIUM`.
- Code runs on workerd with `nodejs_compat`. Avoid Node-only APIs that are not covered by that flag, and avoid long CPU-bound work.
- After changing bindings or vars in `wrangler.jsonc`, regenerate types with `pnpm exec wrangler types` so `worker-configuration.d.ts` stays accurate.
- All routes are SSR. Do not add `prerender = true` without discussing it first.

### Backend access (tRPC via service binding)
- **Server side** (`.astro` frontmatter, `pages/api/*`): use `createServerTRPCClient(env, Astro.request)` from `src/lib/trpc/server.ts`. It calls the CMS Worker over the `AWT_CMS` service binding.
- **Client side** (React islands): use the client in `src/lib/trpc/client.ts` with TanStack Query.
- Read `docs/api/README.md` and the relevant router doc before adding or changing calls. Those docs describe a backend that lives in another repo, so do not invent procedures that are not documented there.

### Auth and payments
- Better Auth is configured in `src/lib/auth.ts` (server) and `src/lib/auth-client.ts` (client). The auth schema is `src/lib/db-auth-schema.ts`.
- Session state is stored in Cloudflare KV and resolved in `src/middleware.ts` into `context.locals.auth`. Use that rather than re-fetching sessions.
- Never weaken subscription or auth checks to make something work locally.
- Stripe routes live in `src/pages/api/stripe/`. Keep secret keys server-side only.

### Database (Drizzle + D1)
- Edit the schema in `src/lib/db-auth-schema.ts`, then generate a migration with `pnpm exec drizzle-kit generate`. Better Auth tables are managed via Better Auth's schema generation, so check `drizzle/migrations` naming before adding one.
- Apply migrations locally first (`pnpm exec wrangler d1 migrations apply DB_AUTH --local`). Ask before applying with `--remote`.

### Code style
- Biome is the only linter and formatter. Do not add ESLint or Prettier.
- Run `pnpm exec biome check --write <files>` on files you touched, or `pnpm lint` and `pnpm format` before finishing. Biome covers `src/**`, `.astro`, `.vscode`, and `astro.config.mjs`.
- Tabs for indentation, double quotes, imports organized automatically.
- Use the `@/` alias for imports from `src/`.
- TypeScript is strict. No `any` or `@ts-ignore` without a comment explaining why.
- Prefer existing `src/components/ui/*` primitives and Tailwind utilities (use `cn` from `@/lib/utils`) over new CSS or new UI libraries.
- Match the surrounding code: Astro components for static/server markup, React only where interactivity is needed (choose `client:*` directives deliberately).

## Environment variables

- `.env` and `.env.production` are gitignored and contain real secrets. **Never read, print, log, or commit their values**, and never copy secrets into code, docs, or `wrangler.jsonc`.
- Names currently in use: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `BETTER_AUTH_INFRA_API_KEY`, `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`, `PUBLIC_TURNSTILE_SITE_KEY`, `STRIPE_WEBHOOK_SECRET`, `PUBLIC_STRIPE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `AWT_PREMIUM_LIBRARY_ID`, `AWT_BASIC_LIBRARY_ID`, `AWT_CMS_API_KEY`.
- Non-secret public values live in `wrangler.jsonc` `vars`. Secrets are set in Cloudflare (`wrangler secret put`) and locally in `.env` / `.dev.vars`.
- **Varlock** is the source of truth for env. `.env.schema` (committed) declares every variable, type, and `@sensitive`/`@public` flag; add new variables there first. `env.d.ts` is generated from it (commit it).
- Local secrets live in `.env.local` as `varlock("local:...")` ciphertext, encrypted with the Mac Secure Enclave and unlocked with Touch ID. Run `pnpm env:encrypt` to encrypt plaintext `@sensitive` values in `.env.local` in place. Check validity with `pnpm env:load` (redacts secrets).
- `APP_ENV=production` selects `.env.production` overrides. `pnpm deploy:cf` sets it and deploys through `varlock-wrangler`, which uploads non-sensitive values as vars and sensitive ones as secrets. Use `pnpm dev:cf` / `pnpm cf:types` instead of bare `wrangler dev` / `wrangler types`.
- Still read bindings and env with `import { env } from "cloudflare:workers"`; do not introduce another env-validation approach.

## Agent skills and docs (`.agents/`)

- Project skills live in `.agents/skills/<skill-name>/SKILL.md`. Check there before starting a task that a skill might cover, and follow it.
- Agent-only guides (for example, update or migration notes) belong in `.agents/`, not in `docs/`. `docs/` is for documentation about the project itself.
- `.agents/` is currently empty. When adding a skill, keep each one focused, with a clear `description` in its frontmatter.

## Guardrails

- Ask before: deploying, applying remote D1 migrations, changing Cloudflare/Stripe/Better Auth configuration, adding or upgrading dependencies, or deleting files.
- Dependency installs respect `minimumReleaseAge` (3 days) in `pnpm-workspace.yaml`. Do not bypass it.
- Keep diffs focused. Do not reformat or refactor unrelated files.
- Do not commit or push unless asked.
- `worker-configuration.d.ts`, `dist/`, `.astro/`, `.wrangler/` are generated. Do not hand-edit them.
