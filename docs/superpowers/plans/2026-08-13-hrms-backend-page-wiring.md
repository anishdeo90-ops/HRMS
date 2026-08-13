# HRMS Backend Page Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect every HRMS page to Supabase-backed APIs with backward/forward lineage through `public.entity_links` and `public.entity_events`, removing remaining hardcoded `DEMO_*` runtime data.

**Architecture:** Keep the existing Next.js UI and route structure. Add the smallest shared HRMS backend surface under `/api/hrms/*`, backed by invoker RPCs/views and RLS in Supabase. Reuse ATS tables where ATS is source of truth; HRMS only stores HRMS-owned records.

**Tech Stack:** Next.js App Router, TypeScript, Supabase Postgres/RLS/RPC, existing `components/hrms/*`, existing `lib/hrms/types.ts`.

## Global Constraints

- Ponytail full: reuse existing helpers and add the fewest tables/APIs that make the pages real.
- No `SECURITY DEFINER`, no `auth.role()` in RLS; use authenticated grants, invoker RPCs, and org membership checks.
- Every create/update writes `public.entity_events`; every cross-product relation writes `public.entity_links`.
- ATS remains source for job openings, candidate approval, accepted offers, and candidate-to-employee conversion.
- Payroll is future; store HRMS-to-payroll facts now (`payable_fraction`, approved reimbursements, leave LOP, separation links) but do not build payroll tables.
- Remove runtime imports from `lib/hrms/demo-data.ts` as pages are connected.
- Keep UI behavior visible in Chrome on `http://localhost:3001/hrms`; screenshots are in `docs/hrms/screenshots/`.

---

## Current State

Already real:
- `/api/hrms/employees`, `/api/hrms/employees/[id]`, `/api/hrms/options`
- `/api/hrms/masters/[type]` for branch, business-unit, department, sub-department, designation, employment-type, function-role
- Pages: `/hrms/team/directory`, `/hrms/team/directory/add`, `/hrms/team/directory/[id]`, org-structure master pages

Still demo-backed:
- Dashboard, Me, Team attendance/separation/reports/tickets/approvals/tasks/regularization
- Performance dashboard/goals/KRA/appraisals/reports/cycles/templates
- Onboarding candidate approval through new joinees and document/form masters
- Calendar, More, and most Settings pages

Browser evidence:
- Dashboard: `docs/hrms/screenshots/hrms-dashboard-2026-08-13.png`
- Directory: `docs/hrms/screenshots/hrms-team-directory-2026-08-13.png`
- Settings: `docs/hrms/screenshots/hrms-settings-2026-08-13.png`

## Shared Files

- Modify: `supabase/migrations/<next>_hrms_page_wiring.sql`
- Modify: `lib/hrms/types.ts` only when response shapes need fields already shown in UI
- Modify: `lib/hrms/masters.ts` to remove demo fallback for announcement-category and expense-type
- Create/modify: `app/api/hrms/**/route.ts`
- Modify page files under `app/(app)/hrms/**/page.tsx`
- Keep: `components/hrms/*` unless a component blocks real data wiring
- Test: extend `scripts/check-hrms-foundation.mjs` or add `scripts/check-hrms-page-wiring.mjs`

## Shared Backend Contract

Use these APIs before adding page-specific ones:
- `GET /api/hrms/dashboard`
- `GET /api/hrms/me`
- `GET /api/hrms/attendance`
- `POST /api/hrms/attendance/punches`
- `POST /api/hrms/attendance/manual`
- `POST /api/hrms/attendance/regularizations`
- `GET /api/hrms/approvals`
- `PATCH /api/hrms/approvals/[id]`
- `GET /api/hrms/leaves`
- `POST /api/hrms/leaves`
- `PATCH /api/hrms/leaves/[id]`
- `GET /api/hrms/expenses`
- `POST /api/hrms/expenses`
- `GET /api/hrms/onboarding`
- `POST /api/hrms/onboarding/[id]/actions`
- `GET /api/hrms/performance`
- `POST /api/hrms/performance/<resource>`
- `GET /api/hrms/settings/<resource>`
- `POST/PATCH /api/hrms/settings/<resource>`
- `GET /api/hrms/jobs` reads ATS jobs/requisitions only

Every response should fit the existing `lib/hrms/types.ts` models where possible.

---

### Task 1: John - Me + Team Operations

**Files:**
- Modify: `supabase/migrations/<next>_hrms_page_wiring.sql`
- Create: `app/api/hrms/me/route.ts`
- Create: `app/api/hrms/attendance/route.ts`
- Create: `app/api/hrms/attendance/punches/route.ts`
- Create: `app/api/hrms/attendance/manual/route.ts`
- Create: `app/api/hrms/attendance/regularizations/route.ts`
- Create: `app/api/hrms/leaves/route.ts`
- Create: `app/api/hrms/leaves/[id]/route.ts`
- Create: `app/api/hrms/approvals/route.ts`
- Create: `app/api/hrms/approvals/[id]/route.ts`
- Create: `app/api/hrms/tickets/route.ts`
- Create: `app/api/hrms/separations/route.ts`
- Modify: `app/(app)/hrms/me/in-out/page.tsx`
- Modify: `app/(app)/hrms/me/leaves/page.tsx`
- Modify: `app/(app)/hrms/me/leaves/add/page.tsx`
- Modify: `app/(app)/hrms/team/in-out/page.tsx`
- Modify: `app/(app)/hrms/team/regularization/page.tsx`
- Modify: `app/(app)/hrms/team/approvals/page.tsx`
- Modify: `app/(app)/hrms/team/pending-tasks/page.tsx`
- Modify: `app/(app)/hrms/team/separation/page.tsx`
- Modify: `app/(app)/hrms/team/tickets/page.tsx`
- Modify: `app/(app)/hrms/team/reports/page.tsx`

**Interfaces:**
- Consumes: `hrms.employees`, `hrms.employee_assignments`, `public.hrms_employee_directory`
- Produces: `hrms.attendance_days`, `hrms.attendance_punches`, `hrms.leave_types`, `hrms.leave_requests`, `hrms.approval_requests`, `hrms.approval_steps`, `hrms.tickets`, `hrms.separations`

- [ ] Add the migration tables above with `org_id`, `created_by`, `updated_by`, timestamps, RLS enabled, and grants to `authenticated`.
- [ ] Add RPCs or views for: my attendance, team attendance, leave balances, approval inbox, pending tasks, tickets, separations.
- [ ] Wire `/hrms/me/in-out`: month filter reads real attendance; punch actions call `POST /api/hrms/attendance/punches`.
- [ ] Wire `/hrms/me/leaves` and `/hrms/me/leaves/add`: leave balances derive from ledger/requests; cancel uses `PATCH /api/hrms/leaves/[id]`.
- [ ] Wire `/hrms/team/in-out`: filters use real employees/departments; Import can stay disabled unless CSV upload already exists.
- [ ] Wire `/hrms/team/regularization`, `/team/approvals`, `/team/pending-tasks`: approve/reject updates approval step and request status.
- [ ] Wire `/hrms/team/separation`: start separation creates request, links employee to separation, writes event.
- [ ] Wire `/hrms/team/tickets`: create/resolve tickets; `related_to` uses `entity_links` when present.
- [ ] Wire `/hrms/team/reports`: use real branch/department options and server aggregates.
- [ ] Replace all `DEMO_*` imports in these pages.
- [ ] Check: `rg "DEMO_|demo-data" "app/(app)/hrms/me" "app/(app)/hrms/team"` returns only employee detail child sections not owned by this task.
- [ ] Check in Chrome: buttons visible in the Team screenshot perform real network calls or are explicitly disabled.

### Task 2: Ron - ATS Linkage, Onboarding, Calendar, More

**Files:**
- Modify: `supabase/migrations/<next>_hrms_page_wiring.sql`
- Create: `app/api/hrms/dashboard/route.ts`
- Create: `app/api/hrms/onboarding/route.ts`
- Create: `app/api/hrms/onboarding/[id]/actions/route.ts`
- Create: `app/api/hrms/onboarding/documents/route.ts`
- Create: `app/api/hrms/onboarding/forms/route.ts`
- Create: `app/api/hrms/calendar/route.ts`
- Create: `app/api/hrms/jobs/route.ts`
- Create: `app/api/hrms/referrals/route.ts`
- Create: `app/api/hrms/assets/route.ts`
- Create: `app/api/hrms/announcements/route.ts`
- Create: `app/api/hrms/expenses/route.ts`
- Modify: `app/(app)/hrms/page.tsx`
- Modify: `app/(app)/hrms/calendar/page.tsx`
- Modify: `app/(app)/hrms/onboarding/*/page.tsx`
- Modify: `app/(app)/hrms/more/*/page.tsx`
- Modify: `app/(app)/hrms/me/reimbursement/page.tsx`
- Modify: `app/(app)/hrms/me/reimbursement/add/page.tsx`

**Interfaces:**
- Consumes: ATS jobs/requisitions/candidates/offers where existing ATS tables own data
- Produces: `hrms.onboarding_cases`, `hrms.document_types`, `hrms.onboarding_forms`, `hrms.employee_documents`, `hrms.assets`, `hrms.asset_assignments`, `hrms.announcements`, `hrms.expense_types`, `hrms.expense_claims`, `hrms.expense_claim_lines`

- [ ] Add onboarding/document/form/asset/announcement/expense tables with RLS and entity events.
- [ ] `GET /api/hrms/jobs` reads ATS job/requisition rows; do not create an HRMS jobs table.
- [ ] Candidate approval creates/updates `hrms.onboarding_cases` and links ATS candidate/job to the case using `entity_links`.
- [ ] Onboarding initiation sends state changes through `/api/hrms/onboarding/[id]/actions`; no toast-only actions.
- [ ] Document approval updates `hrms.employee_documents` or onboarding document rows and writes events.
- [ ] New joinee conversion creates `hrms.employees` through existing employee RPC, creates assignment, links onboarding case to employee, links ATS candidate to employee.
- [ ] Dashboard widgets read `/api/hrms/dashboard`: headcount, attendance, approvals, holidays, birthdays, anniversaries, ATS new joinees, ATS job openings, announcements.
- [ ] Calendar reads `/api/hrms/calendar`: holidays, leave/regularization approvals, birthdays, anniversaries, ATS interviews/joining dates.
- [ ] More/Job Opening reads ATS and Refer Candidate writes ATS candidate/referral plus `entity_links`.
- [ ] Inventory add/allocate/return writes asset events and employee links.
- [ ] Announcements add/edit/publish reads real category/branch/department masters.
- [ ] Reimbursement add/list/approval creates expense claim, lines, approval request, and HRMS-to-payroll lineage event when approved.
- [ ] Replace all `DEMO_*` imports in dashboard, onboarding, calendar, more, reimbursement pages.
- [ ] Check: `rg "DEMO_|demo-data" "app/(app)/hrms/onboarding" "app/(app)/hrms/more" "app/(app)/hrms/calendar" "app/(app)/hrms/page.tsx"`.
- [ ] Check in Chrome: Dashboard screenshot counters come from API, and Job Opening still matches ATS counts.

### Task 3: Bon - Settings + Performance + Metadata

**Files:**
- Modify: `supabase/migrations/<next>_hrms_page_wiring.sql`
- Modify: `app/api/hrms/masters/[type]/route.ts`
- Create: `app/api/hrms/settings/company-profile/route.ts`
- Create: `app/api/hrms/settings/system-settings/route.ts`
- Create: `app/api/hrms/settings/policies/route.ts`
- Create: `app/api/hrms/settings/permissions/route.ts`
- Create: `app/api/hrms/settings/email-templates/route.ts`
- Create: `app/api/hrms/settings/cron-jobs/route.ts`
- Create: `app/api/hrms/settings/leave-types/route.ts`
- Create: `app/api/hrms/settings/holidays/route.ts`
- Create: `app/api/hrms/settings/achievements/route.ts`
- Create: `app/api/hrms/settings/activity-logs/route.ts`
- Create: `app/api/hrms/settings/face-identities/route.ts`
- Create: `app/api/hrms/settings/shifts/route.ts`
- Create: `app/api/hrms/settings/roster/route.ts`
- Create: `app/api/hrms/settings/general/route.ts`
- Create: `app/api/hrms/performance/route.ts`
- Create: `app/api/hrms/performance/goals/route.ts`
- Create: `app/api/hrms/performance/kra/route.ts`
- Create: `app/api/hrms/performance/appraisals/route.ts`
- Create: `app/api/hrms/performance/cycles/route.ts`
- Create: `app/api/hrms/performance/templates/route.ts`
- Modify: `app/(app)/hrms/settings/**/page.tsx`
- Modify: `app/(app)/hrms/performance/**/page.tsx`
- Modify: `app/(app)/hrms/me/ranking/page.tsx`

**Interfaces:**
- Consumes: existing org/member/product tables, employee directory, org masters
- Produces: `hrms.org_settings`, `hrms.policies`, `hrms.role_permissions`, `hrms.email_templates`, `hrms.cron_jobs`, `hrms.leave_types`, `hrms.holidays`, `hrms.achievements`, `hrms.face_identities`, `hrms.roster_assignments`, `hrms.performance_cycles`, `hrms.kras`, `hrms.goals`, `hrms.appraisal_templates`, `hrms.appraisals`, `hrms.ranking_snapshots`

- [ ] Extend masters API to cover `announcement-category` and `expense-type`; remove their demo fallback in `lib/hrms/masters.ts`.
- [ ] Wire Company Profile, System Settings, Policy Setup, Permission Management, Email Master, Cron Master, Leave Settings, Holidays, Achievements, Activity Logs, Face Identity, Shifts, Roster, General Settings.
- [ ] Role permissions must gate APIs server-side; UI hiding alone is not enough.
- [ ] Activity Logs reads from `entity_events`, not a separate fake log list.
- [ ] Cron Master records configured jobs and run history only; do not implement a scheduler in this task.
- [ ] Roster writes dated employee shift assignment rows and links to shifts/employees.
- [ ] Performance dashboard/goals/KRA/appraisals/reports/cycles/templates read and mutate real performance tables.
- [ ] My Ranking reads `hrms.ranking_snapshots` for current employee only unless admin/hr_manager/hod.
- [ ] Replace all `DEMO_*` imports in settings, performance, and ranking pages.
- [ ] Check: `rg "DEMO_|demo-data" "app/(app)/hrms/settings" "app/(app)/hrms/performance" "app/(app)/hrms/me/ranking/page.tsx"`.
- [ ] Check in Chrome: every Settings card opens and save buttons persist after refresh.

### Task 4: Merge Gate - One Pass After John/Ron/Bon

**Files:**
- Modify: `scripts/check-hrms-foundation.mjs` or create `scripts/check-hrms-page-wiring.mjs`
- Modify: `HRMS_USER_MANUAL.md`

**Interfaces:**
- Consumes: all worker APIs and migrations
- Produces: one verification gate before push

- [ ] Run `rg "DEMO_|demo-data" "app/(app)/hrms"`; every remaining hit must be in a test or documented non-runtime fixture.
- [ ] Run `rg "toast.success" "app/(app)/hrms"`; every toast-only mutation must now call an API first.
- [ ] Run `node scripts/check-hrms-foundation.mjs`.
- [ ] Run `npm.cmd run build`.
- [ ] Apply migration to Supabase, then run `supabase db lint --linked --schema public,hrms --fail-on error`.
- [ ] Chrome smoke test on port 3001: Dashboard, Directory, Add Employee, Settings, one Me action, one Team action, one Onboarding action, one Performance action, one More action.
- [ ] Update `HRMS_USER_MANUAL.md` with the newly connected modules and known gaps.
- [ ] Commit one worker branch or merge commit only after the checks pass.

## Page Ownership

John:
- `/hrms/me/in-out`
- `/hrms/me/leaves`
- `/hrms/me/leaves/add`
- `/hrms/team/in-out`
- `/hrms/team/separation`
- `/hrms/team/reports`
- `/hrms/team/tickets`
- `/hrms/team/approvals`
- `/hrms/team/pending-tasks`
- `/hrms/team/regularization`

Ron:
- `/hrms`
- `/hrms/calendar`
- `/hrms/onboarding/*`
- `/hrms/more/*`
- `/hrms/me/reimbursement`
- `/hrms/me/reimbursement/add`

Bon:
- `/hrms/settings/*`
- `/hrms/performance/*`
- `/hrms/me/ranking`
- `/hrms/settings/masters/announcement-category`
- `/hrms/settings/masters/expense-type`

Codex merge owner:
- `/hrms/team/directory`, `/hrms/team/directory/add`, `/hrms/team/directory/[id]`
- shared migrations, shared RLS, cross-worker API shape, final verification

## Self-Review

- Spec coverage: all HRMS navigation groups are assigned.
- Placeholder scan: no task uses TBD/TODO language.
- Type consistency: APIs return existing `lib/hrms/types.ts` view models unless the worker extends that file in the same task.
