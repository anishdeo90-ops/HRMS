# Agent 1A Master Triage

Wave 1 triage only. Inputs read: `audit/0A-schema-map.md`, `audit/0B-api-audit.md`, `audit/0C-golden-thread.md`, `audit/0D-lineage-gaps.md`, `audit/0E-workflow-gaps.md`, and `audit/0F-ui-reality.md`. No Wave 2 repair work was started.

## SECTION 1: CRITICAL FIXES (data leaks, broken FKs, fail-open RLS, broken approval side effects)

FIX-001: `app/api/hrms/employees/[id]/route.ts` - authenticated users can fetch/update employee records without a domain authorization helper and employee status can be changed without transition validation - Agent 0B / Agent 0E

FIX-002: `app/api/hrms/employees/[id]/documents/route.ts` - authenticated users can list documents and signed URLs for any employee id without document/view authorization - Agent 0B

FIX-003: `app/api/hrms/leave/applications/route.ts` and `app/api/hrms/leave/approvals/route.ts` - scoped users trigger broad leave reads before in-memory filtering; move employee/approver scope into DB queries - Agent 0B

FIX-004: `app/api/hrms/expenses/claims/route.ts`, `app/api/hrms/expenses/advances/route.ts`, `app/api/hrms/travel/requests/route.ts`, `app/api/hrms/vehicles/logs/route.ts`, `app/api/hrms/vehicles/services/route.ts` - scoped finance/employee reads fetch global rows before in-memory filtering - Agent 0B / Agent 0F

FIX-005: `app/api/hrms/performance/goals/route.ts`, `app/api/hrms/performance/appraisals/route.ts`, `app/api/hrms/performance/feedback/route.ts` - scoped performance reads can fetch broad data before filtering - Agent 0B

FIX-006: `app/api/hrms/payroll/salary-slips/route.ts` and `app/api/hrms/payroll/_tax-resources.ts` - self-scoped payroll/tax/benefit routes resolve an employee but do not consistently constrain DB reads before filtering - Agent 0B / Agent 0F

FIX-007: `app/api/hrms/lifecycle/*` shared resource routes - promotions, transfers, separations, onboarding, grievances, and training feedback can fetch broad rows before in-memory filtering - Agent 0B

FIX-008: `app/api/hrms/expenses/claims/[id]/route.ts` plus a new migration if needed - expense claim approval/payment does not settle linked employee advances, and the schema has no claim-to-advance linkage/outstanding amount model - Agent 0B / Agent 0C / Agent 0E

FIX-009: `app/api/hrms/payroll/runs/[id]/route.ts` and `app/api/hrms/payroll/runs/route.ts` - payroll submission updates only payroll entries and does not generate `salary_slips` or `salary_slip_lines` - Agent 0B / Agent 0C / Agent 0E

FIX-010: `app/api/hrms/employees/from-candidate/[candidateId]/route.ts` - candidate-to-employee conversion creates only `employees`; it does not create or link onboarding/handoff lifecycle records - Agent 0B / Agent 0C

FIX-011: `app/api/hrms/expenses/claims/[id]/route.ts`, `app/api/hrms/expenses/advances/[id]/route.ts`, payroll run routes, salary slip route, lifecycle routes - several critical workflows allow invalid or metadata-drifted status writes from any current state - Agent 0E

## SECTION 2: HIGH FIXES (missing workflow enforcement, broken golden thread links)

FIX-012: `app/api/hrms/leave/applications/[id]/route.ts` - `cancel` and generic `update` paths are not fully metadata-transition checked; approval ledger write is not transactional with the status update.

FIX-013: `app/api/hrms/payroll/runs/[id]/route.ts`, `app/api/hrms/payroll/runs/route.ts`, `app/api/hrms/payroll/salary-slips/route.ts`, and payroll tests - payroll API action labels drift from DB/metadata states (`submitted`, `locked`, `issued`, `published` versus allowed payroll states).

FIX-014: `app/api/hrms/payroll/_tax-resources.ts` - tax declarations, benefit applications, and benefit claims approve/reject/cancel without reading current status or validating metadata transitions.

FIX-015: `app/api/hrms/performance/appraisals/[id]/route.ts` and `app/api/hrms/performance/goals/[id]/route.ts` - appraisals and goals do not validate allowed transitions against current status.

FIX-016: `app/api/hrms/lifecycle/onboarding/route.ts`, `app/api/hrms/lifecycle/separations/route.ts`, `app/api/hrms/lifecycle/separation/route.ts`, `app/api/hrms/lifecycle/onboarding/[id]/activities/route.ts`, and lifecycle helpers - onboarding/separation transitions are incomplete, separation is not gated on onboarding completion, and lifecycle side effects do not update `employees.employment_status`.

FIX-017: `supabase/migrations/*` integrity repair migration - Agent 0A found no critical employee FK or RLS gaps, but HIGH polymorphic/source ids lack FKs: `communication_logs.provider_message_id`, `employee_notifications.source_id`, `hrms_automation_notifications.source_id`, and `leave_ledger_entries.source_id`. Decide whether these are intentional polymorphic references or need explicit constraints/checks.

FIX-018: `app/api/hrms/employees/[id]/route.ts` - employee detail response does not aggregate source candidate, attendance summary, leave balance/recent leave, salary slips, appraisal/goals, or lifecycle stage.

FIX-019: `app/api/hrms/payroll/runs/route.ts` and `app/api/hrms/payroll/runs/[id]/route.ts` - payroll run APIs do not derive included employees from active salary structure assignments and do not expose included employees per run.

FIX-020: `app/api/hrms/leave/ledger/route.ts` and UI consumers - leave ledger is functionally connected but the implemented FK is `application_id`, while the golden-thread brief names `leave_application_id`; tests/docs should align before new integration tests hardcode the wrong column.

## SECTION 3: MEDIUM FIXES (metadata lineage gaps, stale generated files, missing UI data)

FIX-021: `metadata/lineage.yaml` - 94 keys from workflows, permissions, routes, and roles are missing explicit lineage entries even though `metadata:lineage` reports no built-in issues.

FIX-022: `metadata/lineage.yaml` - 42 stricter broken references point at missing or stale API/UI/test/db paths, including planned automation route names, recruitment job-openings/job-requisitions routes, lifecycle report routes, and `app/(app)/time/leave/page.tsx`.

FIX-023: `app/(app)/people/employees/[id]/page.tsx` - employee detail page is missing; this blocks the employee-pivot UI required by the golden thread.

FIX-024: `app/(app)/dashboard/page.tsx` - dashboard shows real ATS cards but not role-aware HRMS cards for HR, payroll manager, employee, or HOD use cases.

FIX-025: `app/(app)/self-service/page.tsx` - self-service summary is correctly employee-filtered but lacks detailed own attendance, leave, expenses, latest salary slip, goals, and appraisal sections.

FIX-026: `app/(app)/payroll/runs/page.tsx` - payroll runs page does not render included employees, salary structure names, gross amounts, slip status, or selected-run detail.

FIX-027: `app/(app)/performance/appraisals/page.tsx` and employee detail UI - appraisal goals are not rendered inline per appraisal and current appraisal/goal state is not visible from the employee pivot.

FIX-028: employee-visible finance, payroll, lifecycle, travel, and vehicle pages - several pages rely on backend post-filtering instead of passing explicit `employee_id` or `scope=mine` for employee role.

FIX-029: report/shared utility error handling - `app/api/hrms/self-service/summary/route.ts`, `app/api/hrms/reports/_shared.ts`, and appraisal goal inserts can mask DB errors as zero counts or success.

FIX-030: workflow tests - existing contract tests do not prove invalid transition rejection, salary slip generation, advance settlement, lifecycle employment-status side effects, or leave ledger transaction safety.

## SECTION 4: DEPENDENCY ORDER

1. Agent 2A Schema Integrity Fixer: resolve FIX-017 and decide whether FIX-008 needs a new additive migration for claim-to-advance settlement fields. If a new migration is required, Bob must apply it later; do not assume it is live.
2. Agent 2B Golden Thread Connection Fixer: implement API/helper connections for FIX-008, FIX-009, FIX-010, FIX-018, FIX-019, FIX-020, and lifecycle side-effect portions of FIX-016 after schema decisions are known.
3. Agent 2C Workflow State Machine Enforcer: implement metadata-aligned current-status validation for FIX-011 through FIX-016, coordinating with 2B where side effects happen in the same PATCH route.
4. Agent 2D Metadata Lineage Repairer: repair FIX-021 and FIX-022, then regenerate and validate metadata. This can run after API path decisions are stable so lineage does not encode stale planned routes.
5. Agent 2E UI Data Reality Fixer: implement FIX-023 through FIX-028 after APIs expose the needed employee-pivot and payroll-run data. Preserve existing layouts and avoid `lib/nav/config.ts`.
6. Wave 3 test agents: write integration coverage for FIX-030 after API/UI/schema changes settle, then run the full ordered test/build suite.

## SECTION 5: GOLDEN THREAD STATUS

Link 1: candidates -> employees - PARTIAL. Addressed by FIX-010, FIX-018, FIX-023.

Link 2: employees -> attendance - PARTIAL. Addressed by FIX-018, FIX-023, FIX-028.

Link 3: employees -> leave - PARTIAL. Addressed by FIX-003, FIX-012, FIX-018, FIX-020, FIX-023.

Link 4: employees -> salary structure -> payroll - BROKEN. Addressed by FIX-006, FIX-009, FIX-013, FIX-019, FIX-026.

Link 5: leave_applications -> leave_ledger_entries - PARTIAL. Addressed by FIX-012, FIX-020, FIX-030.

Link 6: expense_claims -> employee_advances - BROKEN. Addressed by FIX-008, FIX-011, FIX-017, FIX-030.

Link 7: employees -> appraisals -> performance_goals - PARTIAL. Addressed by FIX-005, FIX-015, FIX-018, FIX-023, FIX-027.

Link 8: employees -> onboarding -> separation - PARTIAL. Addressed by FIX-007, FIX-010, FIX-016, FIX-018, FIX-023.

## SECTION 6: ESTIMATED SCOPE

Estimated files needing changes: 35-50 files, depending on whether settlement requires a migration and whether lineage repairs use existing or renamed route references.

Estimated migrations: 0-1 new migration. A migration is likely required only if FIX-008 adds claim-to-advance linkage/outstanding settlement columns or if FIX-017 converts polymorphic source ids into constrained structures. Bob must apply any new migration.

Estimated API/helper files: 18-25 files. Highest-risk files are employee detail/conversion, leave applications/approvals, finance claims/advances/travel/vehicle routes, payroll runs/slips/tax resources, performance routes, and lifecycle shared resources.

Estimated UI files: 5-8 files. Main targets are employee detail, dashboard, self-service, payroll runs, performance appraisals, and employee-visible finance/payroll/lifecycle/travel/vehicle pages for explicit own-scope queries.

Estimated metadata/generated/test files: 8-15 files. `metadata/lineage.yaml`, generated metadata artifacts, metadata tests, workflow/API contract tests, and new golden-thread integration tests are expected.

New migration requiring Bob: possible for expense advance settlement and any formal FK/check repair; not required for RLS because Agent 0A found no missing RLS or zero-policy tables.
