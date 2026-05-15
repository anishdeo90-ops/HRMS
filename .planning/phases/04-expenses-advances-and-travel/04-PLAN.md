# Phase 4 Implementation Plan: Expenses, Advances, and Travel

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` for implementation tasks when a phase plan exists. Use `superpowers:executing-plans` only as the fallback when subagent execution is unsuitable. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add governed employee expense, advance, travel, and vehicle workflows without payroll side effects.

**Architecture:** Follow the completed HRMS phase pattern: metadata first, SQL/RLS migration second, pure helpers and authorization third, APIs fourth, UI and navigation last. Keep Phase 4 finance records scoped by self, manager, department approver, HR, finance, and admin access. Attachments use private Supabase storage and signed URLs.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase Auth/Postgres/RLS/Storage, Tailwind, lucide-react, Node test runner with tsx.

---

## File Ownership

Create:

- `supabase/migrations/20260512120000_expenses_advances_travel.sql`
- `lib/hrms/expenses.ts`
- `lib/hrms/expense-authorization.ts`
- `app/api/hrms/expenses/claims/route.ts`
- `app/api/hrms/expenses/claims/[id]/route.ts`
- `app/api/hrms/expenses/claims/[id]/attachments/route.ts`
- `app/api/hrms/expenses/advances/route.ts`
- `app/api/hrms/expenses/advances/[id]/route.ts`
- `app/api/hrms/travel/requests/route.ts`
- `app/api/hrms/travel/requests/[id]/route.ts`
- `app/api/hrms/vehicles/logs/route.ts`
- `app/api/hrms/vehicles/services/route.ts`
- `app/(app)/expenses/page.tsx`
- `app/(app)/expenses/claims/page.tsx`
- `app/(app)/expenses/advances/page.tsx`
- `app/(app)/travel/page.tsx`
- `app/(app)/vehicles/page.tsx`
- `tests/expenses/expenses-sql.test.ts`
- `tests/expenses/expenses-utils.test.ts`
- `tests/expenses/expenses-authorization.test.ts`
- `tests/expenses/expenses-api-contract.test.ts`
- `tests/expenses/expenses-ui-contract.test.ts`

Modify:

- `package.json`
- `metadata/roles.yaml`
- `metadata/permissions.yaml`
- `metadata/routes.yaml`
- `metadata/forms/expense_claim.yaml`
- `metadata/approvals.yaml`
- `metadata/workflows.yaml`
- `metadata/reports/*.yaml`
- `metadata/lineage.yaml`
- `lib/types.ts`
- `lib/hrms/route-access.ts`
- `components/sidebar.tsx`
- Generated files under `lib/generated/` and `supabase/generated/metadata_seed.sql`

---

## Task 1: Metadata Contract

**Files:**
- Modify: `package.json`
- Modify: `metadata/roles.yaml`
- Modify: `metadata/permissions.yaml`
- Modify: `metadata/routes.yaml`
- Modify: `metadata/forms/expense_claim.yaml`
- Create/modify: `metadata/forms/employee_advance.yaml`
- Create/modify: `metadata/forms/travel_request.yaml`
- Create/modify: `metadata/forms/vehicle_log.yaml`
- Create/modify: `metadata/forms/vehicle_service.yaml`
- Modify: `metadata/approvals.yaml`
- Modify: `metadata/workflows.yaml`
- Create/modify: `metadata/reports/expense_reports.yaml`
- Modify: `metadata/lineage.yaml`
- Modify generated: `lib/generated/*`
- Modify generated: `supabase/generated/metadata_seed.sql`
- Modify tests: `tests/metadata/registry-contract.test.ts`

- [ ] Add `test:expenses` script to `package.json`:

```json
"test:expenses": "node --import tsx --test tests/expenses/*.test.ts"
```

- [ ] Register Phase 4 permissions, routes, forms, workflows, approval rules, and reports from `04-METADATA-SPEC.md`.
- [ ] Add or confirm finance roles: `role.expense_approver` and `role.finance_manager`.
- [ ] Update `metadata/lineage.yaml` so every new key points to the planned DB table, generated TypeScript export, API route, UI route, and test file.
- [ ] Update `tests/metadata/registry-contract.test.ts` with a Phase 4 assertion list covering the new keys.
- [ ] Run metadata validation before generation:

```text
npm.cmd run metadata:validate
```

Expected: pass.

- [ ] Regenerate metadata:

```text
npm.cmd run metadata:generate
```

Expected: updates `lib/generated/*` and `supabase/generated/metadata_seed.sql`.

- [ ] Run metadata tests:

```text
npm.cmd run test:metadata
```

Expected: pass.

## Task 2: SQL, RLS, and Storage

**Files:**
- Create: `supabase/migrations/20260512120000_expenses_advances_travel.sql`
- Create: `tests/expenses/expenses-sql.test.ts`

- [ ] Write `tests/expenses/expenses-sql.test.ts` to assert the migration creates:

```text
expense_claim_types
expense_claims
expense_claim_items
employee_advances
travel_requests
travel_itineraries
vehicle_logs
vehicle_services
```

- [ ] The SQL test must assert RLS is enabled for every table.
- [ ] The SQL test must assert helper functions are `security definer` with fixed `search_path`.
- [ ] The SQL test must assert operation-specific policies exist for self, team/approver, HR/finance/admin, and attachment access.
- [ ] The SQL test must assert private bucket creation for `expense-attachments`.
- [ ] Run the failing SQL test:

```text
npm.cmd run test:expenses
```

Expected: fails because migration is not created yet.

- [ ] Implement the migration with:
  - Tables listed above.
  - Foreign keys to `employees`, `profiles`, `hr_departments`, and the prior HRMS tables where needed.
  - Status constraints using governed workflow values.
  - Numeric amount checks.
  - Date range checks for travel dates.
  - Updated-at triggers using the existing `public.touch_updated_at()` pattern.
  - Helper functions for current employee, expense visibility, approval visibility, and finance management.
  - RLS policies that fail closed.
  - Private storage bucket and storage object policies for expense attachments.

- [ ] Rerun:

```text
npm.cmd run test:expenses
```

Expected: SQL tests pass or only later helper/API tests fail.

## Task 3: Pure Helpers and Authorization

**Files:**
- Create: `lib/hrms/expenses.ts`
- Create: `lib/hrms/expense-authorization.ts`
- Create: `tests/expenses/expenses-utils.test.ts`
- Create: `tests/expenses/expenses-authorization.test.ts`

- [ ] Write helper tests for:
  - Expense claim payload normalization.
  - Line item amount summing.
  - Read-only field stripping.
  - Attachment path sanitization.
  - Advance payload normalization.
  - Travel date and itinerary validation.
  - Vehicle log and service payload normalization.

- [ ] Write authorization tests for:
  - Employee self access.
  - Reporting manager access.
  - Department approver access.
  - HR manager access.
  - Finance manager/admin management access.
  - Inactive profiles fail closed.

- [ ] Run:

```text
npm.cmd run test:expenses
```

Expected: fails until helper modules are implemented.

- [ ] Implement `lib/hrms/expenses.ts` with exported pure functions for payload normalization, amount math, status validation, and private storage path generation.
- [ ] Implement `lib/hrms/expense-authorization.ts` with generated permission keys and role/scope checks.
- [ ] Rerun:

```text
npm.cmd run test:expenses
```

Expected: helper and authorization tests pass.

## Task 4: APIs

**Files:**
- Create: `app/api/hrms/expenses/claims/route.ts`
- Create: `app/api/hrms/expenses/claims/[id]/route.ts`
- Create: `app/api/hrms/expenses/claims/[id]/attachments/route.ts`
- Create: `app/api/hrms/expenses/advances/route.ts`
- Create: `app/api/hrms/expenses/advances/[id]/route.ts`
- Create: `app/api/hrms/travel/requests/route.ts`
- Create: `app/api/hrms/travel/requests/[id]/route.ts`
- Create: `app/api/hrms/vehicles/logs/route.ts`
- Create: `app/api/hrms/vehicles/services/route.ts`
- Create: `tests/expenses/expenses-api-contract.test.ts`

- [ ] Write API source-contract tests that assert:
  - Every route gets authenticated user/profile context before querying sensitive records.
  - Admin Supabase client usage occurs only after local access checks.
  - Create routes use normalization helpers.
  - Decision routes support approve, reject, cancel, paid/settled/completed where appropriate.
  - Attachment route writes to `expense-attachments` and returns signed URLs only after record access checks.
  - No route imports payroll, salary slip, CTC, or accounting posting helpers.

- [ ] Run:

```text
npm.cmd run test:expenses
```

Expected: API contract tests fail until route files exist.

- [ ] Implement claim list/create, claim detail/decision, and attachment routes.
- [ ] Implement advance list/create and detail/decision routes.
- [ ] Implement travel request list/create and detail/decision routes.
- [ ] Implement vehicle log and service list/create routes.
- [ ] Rerun:

```text
npm.cmd run test:expenses
```

Expected: API contract tests pass.

## Task 5: Route Access, Sidebar, and UI

**Files:**
- Modify: `lib/hrms/route-access.ts`
- Modify: `components/sidebar.tsx`
- Create: `app/(app)/expenses/page.tsx`
- Create: `app/(app)/expenses/claims/page.tsx`
- Create: `app/(app)/expenses/advances/page.tsx`
- Create: `app/(app)/travel/page.tsx`
- Create: `app/(app)/vehicles/page.tsx`
- Create: `tests/expenses/expenses-ui-contract.test.ts`

- [ ] Write UI source-contract tests that assert:
  - Finance routes are generated from metadata keys.
  - Recruiter-only profiles do not see Finance routes.
  - HR, finance manager, admin, and scoped approvers see only appropriate routes.
  - Pages call the planned `/api/hrms/...` endpoints.
  - Expense pages do not reference payroll or salary slip behavior.

- [ ] Run:

```text
npm.cmd run test:expenses
```

Expected: UI contract tests fail until route access and pages exist.

- [ ] Add Finance route helper, for example `getVisibleFinanceRoutes(profile)`, following `getVisiblePeopleRoutes` and `getVisibleTimeRoutes`.
- [ ] Add Finance sidebar group with lucide icons and collapsed-state titles.
- [ ] Implement the five pages using compact forms, tables, filters, empty states, and error banners per `04-UI-SPEC.md`.
- [ ] Rerun:

```text
npm.cmd run test:expenses
```

Expected: all Phase 4 expense tests pass.

## Task 6: Full Verification

**Files:**
- Create after implementation: `.planning/phases/04-expenses-advances-and-travel/04-SUMMARY.md`
- Create after implementation: `.planning/phases/04-expenses-advances-and-travel/04-VERIFICATION.md`
- Create after implementation: `.planning/phases/04-expenses-advances-and-travel/04-METADATA-AUDIT.md`

- [ ] Run targeted checks:

```text
npm.cmd run test:metadata
npm.cmd run test:employee-core
npm.cmd run test:attendance
npm.cmd run test:leave
npm.cmd run test:expenses
```

Expected: all pass.

- [ ] Run build:

```text
npm.cmd run build
```

Expected: pass.

- [ ] Start dev server:

```text
npm.cmd run dev
```

Expected: local server starts.

- [ ] Browser verify:

```text
agent-browser.cmd open "http://localhost:3000/expenses"
agent-browser.cmd wait --load networkidle
agent-browser.cmd errors
agent-browser.cmd snapshot -i
```

Expected: no blocking browser errors and Finance UI is visible for an authorized session.

- [ ] Repeat browser checks for:

```text
http://localhost:3000/expenses/claims
http://localhost:3000/expenses/advances
http://localhost:3000/travel
http://localhost:3000/vehicles
```

- [ ] Write Phase 4 summary, verification, and metadata audit artifacts.

## Plan Check

- Spec coverage: covers EXP-01 through EXP-06 and META-04.
- Brownfield safety: no ATS route changes except sidebar additions for authorized HRMS finance users.
- Payroll safety: plan explicitly blocks payroll, CTC, salary slip, and accounting posting behavior.
- Test strategy: metadata, SQL/RLS, helpers, authorization, APIs, UI source contracts, build, and browser verification.

## Execution Command

`$gsd-execute-phase 4`
