# Phase 10 Plan: Recruitment Unification

GSD entrypoint: `$gsd-execute-phase 10`

## Ownership

Bob coordinates integration, migration application, build, browser verification, and planning docs.

Anish lane:
- `metadata/**`
- `lib/generated/**`
- `supabase/generated/metadata_seed.sql`
- `supabase/migrations/20260516030000_recruitment_unification.sql`
- `tests/metadata/registry-contract.test.ts`
- `tests/recruitment/recruitment-sql.test.ts`
- `package.json` only for `test:recruitment`
- `.planning/team-context/anish.md`

Trisha lane:
- `lib/hrms/recruitment.ts`
- `lib/hrms/recruitment-authorization.ts`
- `app/api/hrms/recruitment/**`
- `tests/recruitment/recruitment-utils.test.ts`
- `tests/recruitment/recruitment-authorization.test.ts`
- `tests/recruitment/recruitment-api-contract.test.ts`
- `package.json` only if `test:recruitment` is missing
- `.planning/team-context/trisha.md`

Tannu lane:
- `app/(app)/recruitment/**`
- `lib/nav/config.ts` only for Phase 10 recruitment route additions/enablement after routes exist
- `tests/recruitment/recruitment-ui-contract.test.ts`
- `tests/nav/nav-config.test.ts` only if needed for intentional Phase 10 nav updates
- `.planning/team-context/Tannu.md`

## Implementation Checklist

- [x] Contact existing team tmux sessions before Phase 10 start.
- [x] Create Phase 10 planning artifacts.
- [ ] Register Phase 10 recruitment permissions, routes, forms, workflows, reports, import aliases, and lineage metadata.
- [ ] Generate metadata artifacts and metadata seed SQL.
- [ ] Add additive recruitment unification migration with helper-backed RLS.
- [ ] Add recruitment helper and authorization utilities.
- [ ] Add HRMS recruitment summary, appointment-letter, and candidate handoff API routes.
- [ ] Add recruitment overview and appointment-letter UI routes.
- [ ] Add or enable Recruiting navigation entries only after route files and tests exist.
- [ ] Add SQL, helper/auth/API, UI, metadata, nav, and ATS-reachability contract tests.
- [ ] Run metadata and recruitment verification.
- [ ] Run build, apply migration, restart dev server, and browser-check Phase 10 routes/CSS.
- [ ] Update planning docs and team logs.

## Dispatch Plan

- Anish owns governed metadata and SQL/RLS only. No APIs, UI, nav helpers, or domain helper edits.
- Trisha owns helpers, authorization, APIs, and API contracts. No metadata/generated/migration/UI/nav edits.
- Tannu owns UI and nav enablement. No metadata/generated/migration/helper/API edits.
- Bob integrates any nav expectation changes, applies the live migration, and performs browser verification.

## Brownfield Safety Checks

- Existing ATS routes remain reachable: `/candidates`, `/jobs`, `/hod-portal`, `/jds`, `/masters`, `/import`, `/sync`, and `/my-activity`.
- Existing ATS APIs remain available: `/api/candidates`, `/api/jobs`, `/api/hiring-requests`, `/api/interviews`, `/api/recruitment-forms`, and offer/CTC APIs.
- New HRMS recruitment APIs must not mutate ATS records unless the endpoint action clearly says so and authorization passes.
- Candidate-to-employee handoff must write an auditable handoff record and leave employee creation/onboarding side effects explicit.

## Out of Scope

- Replacing the current ATS candidate board, job pages, import flow, public forms, or CTC/offers behavior.
- Renaming existing ATS database tables.
- Payroll salary posting or offer compensation redesign.
- Playwright adoption unless Bob decides a repeatable browser workflow is required after agent-browser checks.
