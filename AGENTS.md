<!-- GSD:project-start source:PROJECT.md -->
## Project

**HireRabbits ATS to HRMS Upgrade**

HireRabbits is an existing Next.js 14 and Supabase ATS being upgraded into a complete HRMS. The upgraded product must preserve current recruiting workflows while adding employee core data, attendance, leave, expenses, payroll, performance, lifecycle, self-service, reports, notifications, and HR automation.

The HRMS reference repo at `C:\Users\Admin\Music\Rabbit F\Rabbits-main v1\hrms-develop\hrms-develop` is a feature and workflow reference only. It must not be copied into this Next.js/Supabase app.

**Core Value:** HireRabbits must become a governed HRMS without breaking the ATS workflows that already run the business.

### Constraints

- **Architecture**: Keep Next.js App Router, TypeScript, Supabase Auth, Supabase Postgres, Supabase RLS, Tailwind, and the existing API/sidebar/layout patterns.
- **Brownfield safety**: HRMS work must preserve existing ATS behavior unless a change is explicitly planned and verified.
- **Metadata governance**: New roles, statuses, routes, form fields, workflow states, permissions, reports, salary components, leave types, approval rules, and import aliases must use governed metadata.
- **Database safety**: Supabase migrations must be incremental, reversible where practical, and include RLS in the same migration as new HRMS tables.
- **Security**: RLS policies must fail closed and use helper functions or generated permission helpers for role and permission decisions.
- **Frontend QA**: Use `agent-browser.cmd` for local browser verification before adding Playwright.
- **Execution discipline**: GSD owns roadmap/state/verification; Superpowers owns implementation discipline, TDD, reviews, and branch finishing.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:STACK.md -->
## Technology Stack

- Next.js 14 App Router with TypeScript.
- Supabase Auth, Supabase Postgres, Supabase RLS, and Supabase CLI migrations.
- Tailwind CSS, Radix UI patterns where already present, and `lucide-react` icons.
- Node test runner through `node --import tsx --test` plus package scripts such as `test:metadata`, `test:expenses`, `test:payroll`, and `test:nav`.
- Local browser verification uses `agent-browser.cmd` against `localhost:3001` before adding Playwright.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

- Preserve existing ATS behavior unless a planned HRMS change explicitly requires otherwise.
- New HRMS business concepts must be registered through governed metadata and generated artifacts, not hardcoded directly in UI/API code.
- Each HRMS phase follows this order: metadata, migration/RLS, helpers/authorization, APIs, UI/navigation, tests, build, live migration, browser verification, planning docs.
- Bob owns live Supabase migration application. Worker teams may create migration files and tests, but do not mark a phase live.
- Sidebar routes belong in `lib/nav/config.ts`; future routes stay `enabled: false` until route, tests, and browser verification pass.
- Settings role assignment must use the central typed role list and must not hardcode stale role options.
- After running `npm.cmd run build` while the dev server is active, restart the dev server on port `3001` and rebuild `.next` before browser checks.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

- App shell uses a role-aware sidebar rendered from `lib/nav/config.ts`.
- Auth/profile role data comes from Supabase-backed profile state and central role types.
- HRMS domains are organized by route groups under `app/(app)` and API routes under `app/api/hrms`.
- Domain helpers and authorization live under `lib/hrms/*`.
- Supabase migrations are incremental and include table creation/upgrades, helper functions, triggers, constraints, RLS, and policies in the same migration for each phase.
- Metadata source files live under `metadata/**`; generated TypeScript and SQL live under `lib/generated/**` and `supabase/generated/metadata_seed.sql`.
- Completed HRMS domains through Phase 5: metadata governance, employee core, attendance/shifts, leave, expenses/travel/vehicles, role-based navigation, Settings role management, and payroll/salary/tax/benefits.
- Current next phase: Phase 6 Performance Management.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
