# Phase 6 Implementation Plan: Performance Management

> **GSD entrypoint:** `$gsd-execute-phase 6`. Started on 2026-05-15.

**Goal:** Add performance goals, KRAs, appraisal cycles, appraisals, and feedback while preserving existing ATS and HRMS workflows.

**Architecture:** Metadata first, SQL/RLS second, helpers and authorization third, APIs fourth, UI and navigation last. Bob coordinates integration and owns all live Supabase migration application.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase Auth/Postgres/RLS, Tailwind, lucide-react, Node test runner with tsx.

---

## File Ownership

### Anish: Metadata, SQL/RLS, SQL Tests

Create or modify:

- `metadata/roles.yaml`
- `metadata/permissions.yaml`
- `metadata/routes.yaml`
- `metadata/forms/*.yaml`
- `metadata/approvals.yaml`
- `metadata/workflows.yaml`
- `metadata/reports/*.yaml`
- `metadata/lineage.yaml`
- `metadata/allowlists/legacy-ats-literals.yaml` only if metadata hardcoding checks require scoped legacy allowances.
- `lib/generated/*`
- `supabase/generated/metadata_seed.sql`
- `supabase/migrations/20260515160000_performance_management.sql`
- `tests/metadata/registry-contract.test.ts`
- `tests/performance/performance-sql.test.ts`
- `package.json` only for `test:performance` if not already present.

Do not edit API routes, UI pages, sidebar, or helper modules unless Bob explicitly reassigns.

### Trisha: Helpers, Authorization, API, API Tests

Create or modify:

- `lib/hrms/performance.ts`
- `lib/hrms/performance-authorization.ts`
- `app/api/hrms/performance/**`
- `tests/performance/performance-utils.test.ts`
- `tests/performance/performance-authorization.test.ts`
- `tests/performance/performance-api-contract.test.ts`
- `package.json` only for `test:performance` if Anish has not already added it.

Do not edit metadata, generated files, migrations, UI pages, or sidebar unless Bob explicitly reassigns.

### Tannu: Performance UI, Nav Enablement, UI Tests, Browser Prep

Create or modify:

- `app/(app)/performance/page.tsx`
- `app/(app)/performance/goals/page.tsx`
- `app/(app)/performance/appraisals/page.tsx`
- `app/(app)/performance/feedback/page.tsx`
- `lib/nav/config.ts`
- `tests/performance/performance-ui-contract.test.ts`

Do not edit metadata, generated files, migrations, helpers, or API routes unless Bob explicitly reassigns.

---

## Task 1: Metadata Contract

- [x] Register Phase 6 permissions, routes, forms, workflows, approval rules, reports, and performance concepts.
- [x] Add or update metadata lineage for every Phase 6 key.
- [x] Add metadata tests for Phase 6 performance keys.
- [x] Run `npm.cmd run metadata:validate`.
- [x] Run `npm.cmd run metadata:generate`.
- [x] Run `npm.cmd run test:metadata`.

## Task 2: SQL, RLS, and Performance Schema

- [x] Add migration `20260515160000_performance_management.sql`.
- [x] Create all Phase 6 performance tables listed in `06-CONTEXT.md`.
- [x] Add constraints for status values, scores, weights, date ranges, and uniqueness.
- [x] Add updated-at triggers where records are mutable.
- [x] Add helper functions for performance role, team-scope, and own-record access.
- [x] Enable RLS on every new performance table.
- [x] Add fail-closed policies and scoped role policies.
- [x] Add `tests/performance/performance-sql.test.ts`.
- [x] Run `npm.cmd run test:performance`.

## Task 3: Helpers and Authorization

- [x] Add typed performance status, scoring, and weighting helpers.
- [x] Add goal, KRA, appraisal, cycle, and feedback payload normalizers.
- [x] Add authorization helpers for manage performance, review team performance, and employee self-service records.
- [x] Keep ATS interview feedback helpers separate.
- [x] Add utility and authorization tests.

## Task 4: Performance APIs

- [x] Add goals and KRAs APIs.
- [x] Add appraisal template and cycle APIs.
- [x] Add appraisal and appraisal goal APIs.
- [x] Add feedback criteria and feedback rating APIs.
- [x] Validate payloads through helpers.
- [x] Add API contract tests.

## Task 5: Performance UI and Navigation

- [x] Add performance overview page.
- [x] Add goals page.
- [x] Add appraisals page.
- [x] Add feedback page.
- [x] Flip performance nav entries in `lib/nav/config.ts` to `enabled: true` only after routes exist.
- [x] Keep sidebar visual design unchanged.
- [x] Add UI contract tests.

## Task 6: Bob Integration and Verification

- [x] Run `npm.cmd run test:metadata`.
- [x] Run `npm.cmd run test:performance`.
- [x] Run `npm.cmd run test:nav`.
- [x] Run `npm.cmd run build`.
- [x] Apply pending migration to the linked Supabase project only from Bob's pane.
- [x] Restart local dev server on port `3001` after build and rebuild `.next`.
- [x] Browser-check performance routes with `agent-browser.cmd`.
- [x] Update planning docs and team logs before marking Phase 6 complete.

## Final Verification Snapshot

Completed on 2026-05-15.

- `npm.cmd run test:metadata` passed 20/20.
- `npm.cmd run test:performance` passed 32/32 after Bob aligned Phase 6 helpers, API embeds, and UI fetch endpoints to the live migration schema.
- `npm.cmd run test:nav` passed 6/6.
- `npm.cmd run build` passed and compiled the four performance pages plus `/api/hrms/performance/**`.
- `supabase db push` applied `20260515160000_performance_management.sql`; migration list confirmed local and remote parity through `20260515160000`.
- Dev server was restarted on `localhost:3001` after build with a clean `.next`.
- `agent-browser.cmd --session hrms-phase4` verified signed-in `/performance`, `/performance/goals`, `/performance/appraisals`, and `/performance/feedback`; all rendered with CSS loaded and no visible schema-cache, relationship, missing-column, or load errors.
- Browser-authenticated fetches returned HTTP 200 for `/api/hrms/performance/goals`, `/kras`, `/templates`, `/cycles`, `/appraisals`, `/feedback`, and `/feedback/criteria`.
