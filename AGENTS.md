# Agent Guide: SIF

## Commands
- Dev/Build: `pnpm dev` (port 3000), `pnpm build`, `pnpm preview`, `pnpm exec tsc`
- Code Quality: Biome (`pnpm check` / `pnpm lint` / `pnpm format`) - no ESLint/Prettier
- Test: Vitest (`pnpm test`, `pnpm vitest run <file>`)
- DB: Drizzle (`pnpm db:generate`, `pnpm db:migrate`, `pnpm db:push`, `pnpm db:studio`)

## Architecture & Conventions
- Routing: TanStack Start (file-based in `src/routes/`). Do not edit `src/routeTree.gen.ts`.
- Backend: `createServerFn` in `src/services/` or `src/lib/`. Validate via Zod with `safeParseAndThrow` (`@/lib/utils`). Auth via `requireAdmin()` or `requireUser()`.
- Database: Drizzle. Schema in `src/db/schema.ts`. Use camelCase in TS, snake_case in database.
- UI & Style: Tailwind CSS v4. Use `@/` alias. Do not edit `src/components/ui/` directly; wrap them. Use `cn()` and `lucide-react` icons. Biome style (Tabs, double quotes, semicolons). Use [.agents/skills/frontend-design](.agents/skills/frontend-design) when working with UI components.
- Code Reviews: Use [.agents/skills/thermo-nuclear-code-quality-review](.agents/skills/thermo-nuclear-code-quality-review) when reviewing code. Ignore `drizzle` folder for review as it contains only auto-generated migration files. Ensure any exported backend helper functions in `src/services/` or `src/lib/` are wrapped with `createServerOnlyFn` (or `createServerFn`) to prevent leaking server-only modules (like database connections) to the client bundle.
- Husky Hooks: Re-enable before PR submission.
- Security: Use `process.env` for secrets. JWT in `auth_token` cookie. Turnstile for public forms.

## Communication
- Mandatory Caveman Mode: Initialize and activate the `caveman` skill at [.agents/skills/caveman](.agents/skills/caveman) whenever conversing.
- Initialization Message: When utilizing any skills (including `caveman`), always output "skills initialized: <skills>" at the very start of the conversation.