# Phase 7 Implementation Plan: Employee Lifecycle

> **GSD entrypoint:** `$gsd-execute-phase 7`. Started on 2026-05-15.

**Goal:** Add onboarding, separation, promotions, transfers, grievances, training, and daily work summaries while preserving completed ATS and HRMS workflows.

**Architecture:** Metadata first, SQL/RLS second, helpers and authorization third, APIs fourth, UI and navigation last. Bob coordinates integration and owns all live Supabase migration application.

---

## File Ownership

### Anish: Metadata, SQL/RLS, SQL Tests

Create or modify:

- `metadata/permissions.yaml`
- `metadata/routes.yaml`
- `metadata/forms/*.yaml`
- `metadata/workflows.yaml`
- `metadata/approvals.yaml`
- `metadata/reports/*.yaml`
- `metadata/lineage.yaml`
- `metadata/allowlists/legacy-ats-literals.yaml` only for scoped existing literals if governance requires it.
- `lib/generated/*`
- `supabase/generated/metadata_seed.sql`
- `supabase/migrations/20260515190000_employee_lifecycle.sql`
- `tests/metadata/registry-contract.test.ts`
- `tests/lifecycle/lifecycle-sql.test.ts`
- `package.json` only for `test:lifecycle` if not already present.

Do not edit API routes, UI pages, sidebar/nav, or helper modules unless Bob explicitly reassigns.

### Trisha: Helpers, Authorization, API, API Tests

Create or modify:

- `lib/hrms/lifecycle.ts`
- `lib/hrms/lifecycle-authorization.ts`
- `app/api/hrms/lifecycle/**`
- `app/api/hrms/grievances/**`
- `app/api/hrms/training/**`
- `tests/lifecycle/lifecycle-utils.test.ts`
- `tests/lifecycle/lifecycle-authorization.test.ts`
- `tests/lifecycle/lifecycle-api-contract.test.ts`
- `package.json` only for `test:lifecycle` if Anish has not already added it.

Do not edit metadata, generated files, migrations, UI pages, or nav unless Bob explicitly reassigns.

### Tannu: Lifecycle UI, Nav Enablement, UI Tests

Create or modify:

- `app/(app)/lifecycle/page.tsx`
- `app/(app)/lifecycle/onboarding/page.tsx`
- `app/(app)/lifecycle/separation/page.tsx`
- `app/(app)/lifecycle/promotions/page.tsx`
- `app/(app)/lifecycle/transfers/page.tsx`
- `app/(app)/grievances/page.tsx`
- `app/(app)/training/page.tsx`
- `lib/nav/config.ts`
- `tests/lifecycle/lifecycle-ui-contract.test.ts`

Do not edit metadata, generated files, migrations, helpers, or API routes unless Bob explicitly reassigns.

---

## Task 1: Metadata Contract

- [ ] Register lifecycle permissions, routes, forms, workflows, approval rules, reports, and lifecycle concepts.
- [ ] Add lineage for every Phase 7 metadata key.
- [ ] Add metadata tests for Phase 7 lifecycle keys.
- [ ] Run `npm.cmd run metadata:validate`.
- [ ] Run `npm.cmd run metadata:generate`.
- [ ] Run `npm.cmd run test:metadata`.

## Task 2: SQL, RLS, and Lifecycle Schema

- [ ] Add migration `20260515190000_employee_lifecycle.sql`.
- [ ] Create the Phase 7 lifecycle tables listed in `07-CONTEXT.md`.
- [ ] Add constraints for statuses, dates, uniqueness, training feedback scores, and employment-change integrity.
- [ ] Add updated-at triggers for mutable records.
- [ ] Add helper functions for lifecycle management, team scope, employee self-service, grievance ownership, and training visibility.
- [ ] Enable RLS on every new lifecycle table.
- [ ] Add fail-closed policies and scoped role policies.
- [ ] Add `tests/lifecycle/lifecycle-sql.test.ts`.
- [ ] Run `npm.cmd run test:lifecycle`.

## Task 3: Helpers and Authorization

- [ ] Add typed lifecycle status and payload normalizers.
- [ ] Add onboarding, separation, promotion, transfer, grievance, training, and daily-summary helpers.
- [ ] Add fail-closed authorization helpers for HR management, manager/team review, employee self-service, grievances, and training.
- [ ] Add helper and authorization tests.

## Task 4: Lifecycle APIs

- [ ] Add lifecycle overview, onboarding, separation, promotion, transfer, daily-summary APIs.
- [ ] Add grievance types and employee grievance APIs.
- [ ] Add training program, event, feedback APIs.
- [ ] Validate payloads through helpers.
- [ ] Add API contract tests.

## Task 5: Lifecycle UI and Navigation

- [ ] Add lifecycle overview page.
- [ ] Add onboarding page.
- [ ] Add separation page.
- [ ] Add promotions page.
- [ ] Add transfers page.
- [ ] Add grievances page.
- [ ] Add training page.
- [ ] Flip lifecycle/grievance/training nav entries to `enabled: true` only after route files exist.
- [ ] Keep sidebar visual design unchanged.
- [ ] Add UI contract tests.

## Task 6: Bob Integration and Verification

- [ ] Run `npm.cmd run test:metadata`.
- [ ] Run `npm.cmd run test:lifecycle`.
- [ ] Run `npm.cmd run test:nav`.
- [ ] Run `npm.cmd run build`.
- [ ] Apply pending migration to the linked Supabase project only from Bob's pane.
- [ ] Restart local dev server on port `3001` after build and rebuild `.next`.
- [ ] Browser-check lifecycle, grievance, and training routes with `agent-browser.cmd`.
- [ ] Update planning docs and team logs before marking Phase 7 complete.
