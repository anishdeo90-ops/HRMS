# Phase 5 Implementation Plan: Payroll, Salary, Tax, and Benefits

> **GSD entrypoint:** `$gsd-execute-phase 5`. Completed on 2026-05-15.

**Goal:** Add payroll-grade salary operations while keeping ATS CTC/offers separate.

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
- `lib/generated/*`
- `supabase/generated/metadata_seed.sql`
- `supabase/migrations/20260515130000_payroll_salary_tax_benefits.sql`
- `tests/metadata/registry-contract.test.ts`
- `tests/payroll/payroll-sql.test.ts`
- `package.json`

Do not edit API routes, UI pages, sidebar, or helper modules unless Bob explicitly reassigns.

### Trisha: Helpers, Authorization, API, API Tests

Create or modify:

- `lib/hrms/payroll.ts`
- `lib/hrms/payroll-authorization.ts`
- `app/api/hrms/payroll/**`
- `tests/payroll/payroll-utils.test.ts`
- `tests/payroll/payroll-authorization.test.ts`
- `tests/payroll/payroll-api-contract.test.ts`
- `package.json` only for `test:payroll` if Anish has not already added it.

Do not edit metadata, generated files, migrations, UI pages, or sidebar unless Bob explicitly reassigns.

### Tannu: Payroll UI, Nav Enablement, UI Tests, Browser Prep

Create or modify:

- `app/(app)/payroll/page.tsx`
- `app/(app)/payroll/salary-structures/page.tsx`
- `app/(app)/payroll/runs/page.tsx`
- `app/(app)/payroll/salary-slips/page.tsx`
- `app/(app)/payroll/tax-benefits/page.tsx`
- `lib/nav/config.ts`
- `tests/payroll/payroll-ui-contract.test.ts`

Do not edit metadata, generated files, migrations, helpers, or API routes unless Bob explicitly reassigns.

---

## Task 1: Metadata Contract

- [x] Register Phase 5 permissions, routes, forms, workflows, approval rules, reports, salary components, and payroll concepts.
- [x] Confirm `payroll_manager` role exists in governed metadata.
- [x] Add or update metadata lineage for every Phase 5 key.
- [x] Add metadata tests for Phase 5 payroll keys.
- [x] Run `npm.cmd run metadata:validate`.
- [x] Run `npm.cmd run metadata:generate`.
- [x] Run `npm.cmd run test:metadata`.

## Task 2: SQL, RLS, and Payroll Schema

- [x] Add migration `20260515130000_payroll_salary_tax_benefits.sql`.
- [x] Create all Phase 5 payroll tables listed in `05-CONTEXT.md`.
- [x] Add constraints for status values, amounts, dates, and uniqueness.
- [x] Add updated-at triggers where records are mutable.
- [x] Add helper functions for payroll role and own-record access.
- [x] Enable RLS on every new payroll table.
- [x] Add fail-closed policies and scoped role policies.
- [x] Add `tests/payroll/payroll-sql.test.ts`.
- [x] Run `npm.cmd run test:payroll`.

## Task 3: Helpers and Authorization

- [x] Add typed payroll status/value helpers.
- [x] Add salary structure and payroll entry normalization helpers.
- [x] Add authorization helpers for manage payroll, view payroll, and employee self-service.
- [x] Keep ATS candidate offer/CTC helpers separate.
- [x] Add utility and authorization tests.

## Task 4: Payroll APIs

- [x] Add salary components and salary structures APIs.
- [x] Add payroll runs APIs for periods, entries, and status transitions.
- [x] Add salary slips APIs for HR/payroll views and employee own-slip views.
- [x] Add tax and benefits APIs for declarations, applications, and claims.
- [x] Validate payloads through helpers.
- [x] Add API contract tests.

## Task 5: Payroll UI and Navigation

- [x] Add payroll overview page.
- [x] Add salary structures page.
- [x] Add payroll runs page.
- [x] Add salary slips page with employee self-service-safe behavior.
- [x] Add tax and benefits page.
- [x] Flip payroll nav entries in `lib/nav/config.ts` to `enabled: true` only after routes exist.
- [x] Keep sidebar visual design unchanged.
- [x] Add UI contract tests.

## Task 6: Bob Integration and Verification

- [x] Run `npm.cmd run test:metadata`.
- [x] Run `npm.cmd run test:payroll`.
- [x] Run `npm.cmd run test:nav`.
- [x] Run `npm.cmd run build`.
- [x] Apply pending migration to the linked Supabase project only from Bob's pane.
- [x] Restart local dev server on port `3001` after build and rebuild `.next`.
- [x] Browser-check payroll routes with `agent-browser.cmd`.
- [x] Update planning docs and team logs before marking Phase 5 complete.

## Completion Snapshot

- `npm.cmd run test:metadata` passed 19/19.
- `npm.cmd run test:payroll` passed 31/31.
- `npm.cmd run test:nav` passed 6/6.
- `npm.cmd run build` passed after clean `.next` rebuild.
- `supabase db push` applied `20260515130000_payroll_salary_tax_benefits.sql` and `supabase migration list` showed local/remote parity.
- `agent-browser.cmd --session hrms-phase4` verified all five payroll routes signed in with CSS loaded and no schema-cache or relationship errors.
