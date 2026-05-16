# HireRabbits ATS to HRMS Supercharged Build Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` for implementation tasks when a phase plan exists. Use `superpowers:executing-plans` only as the fallback when subagent execution is unsuitable.

**Goal:** Upgrade HireRabbits from an ATS into a complete HRMS while preserving the existing recruiting workflows.

**Architecture:** Keep the current Next.js 14 + Supabase architecture and add HRMS domains incrementally through migrations, typed API routes, role-aware UI modules, and strict RLS. Frappe HRMS is the feature and workflow reference, not a codebase to copy directly.

**Tech Stack:** Next.js App Router, TypeScript, Supabase Auth, Supabase Postgres, Supabase RLS, Tailwind, GSD, Superpowers, Codex subagents.

---

## Source Context

HireRabbits is currently a Next.js 14 + Supabase ATS. The local manual is `USER_MANUAL.md`; no separate `Master.md` or literal "About My Software" section was found. The closest product/contact detail found in the app context is:

- Product: HireRabbits ATS
- Plan context: Enterprise Plan, unlimited candidates, 50 GB storage
- Support / billing contact: `support@hirerabbits.com`

Current HireRabbits modules:

- Candidates, Kanban pipeline, sheet view, CV upload, duplicate checks, AI scoring, candidate detail panel
- Jobs, job import, recruiter assignment, headcount and pipeline counters
- JDs, assessments, public forms, public `/f/[id]` candidate-facing form links
- My Activity, interviews, communication tracker
- Dashboard, masters, users, settings, HOD portal, sync, backup, CTC/offers
- Supabase Auth, role-based access, RLS-backed data model, 49 API route handlers

## Installed Local Tooling

Superpowers is installed locally as a Codex plugin cache:

```text
C:\Users\Admin\.codex\plugins\cache\openai-curated\superpowers\63976030
```

GSD is installed locally as Codex skills:

```text
C:\Users\Admin\.codex\skills\gsd-*
```

Supabase CLI is authenticated/connected locally. Do not write the raw CLI token into this repository, Markdown files, migrations, terminal logs, commits, or chat. Use the Supabase CLI credential store and linked project state for database work.

Safe Supabase status note:

```text
Supabase CLI: authenticated locally on this machine.
Credential handling: do not commit or document raw tokens.
Preferred command mode: use `--linked` after verifying project linkage.
```

The HRMS reference repo at `C:\Users\Admin\Music\Rabbit F\Rabbits-main v1\hrms-develop\hrms-develop` is Frappe HRMS. It is much larger than the current ATS and should be treated as a feature/reference source, not copied directly into the Next/Supabase app.

Key HRMS feature domains to replicate:

- Employee core and HR setup
- Attendance, check-ins, shift scheduling, shift requests, overtime
- Leave policies, allocations, applications, balances, ledger, encashment
- Expense claims, employee advances, travel requests, vehicle expenses
- Payroll, salary components, salary structures, salary slips, tax and benefits
- Recruitment, job requisitions, job openings, applicants, interviews, job offers, appointment letters
- Performance, goals, KRAs, appraisal cycles, feedback
- Lifecycle: onboarding, separation, promotion, transfer, grievances, exit interviews, training
- Employee self-service portal, notifications, reports, automations

## GSD and Superpowers Research

### Superpowers

Repo: https://github.com/obra/superpowers

Superpowers is an agentic software development methodology built as composable skills for coding agents. Its documented workflow is:

1. Brainstorm and clarify the real goal before coding.
2. Produce a design/spec the user approves.
3. Write an implementation plan with small, testable steps.
4. Execute with subagents or batch execution.
5. Use red/green/refactor TDD.
6. Request code review between tasks.
7. Finish the branch with tests, merge/PR decision, and cleanup.

Codex installation paths from the repo:

- Codex CLI: open `/plugins`, search `superpowers`, then install.
- Codex App: open Plugins in the sidebar, find `Superpowers` under Coding, click `+`, and follow prompts.

Best use for this project:

- Make Superpowers the engineering discipline layer.
- Use it for TDD, exact task planning, subagent execution, code review, and branch finishing.
- Use its plan format when a phase is ready for implementation, especially when multiple files and tests are involved.

### GSD / Get Shit Done

Repo: https://github.com/gsd-build/get-shit-done

GSD is a lightweight meta-prompting, context engineering, and spec-driven development system. It stores project memory in `.planning/` and drives a loop:

1. Project intake and roadmap.
2. Discuss phase decisions.
3. Optional UI design contract.
4. Research and plan the phase.
5. Execute the phase with fresh agents.
6. Verify work through automated checks and UAT.
7. Ship, audit, and move to the next phase.

Codex command spelling from the GSD docs uses `$gsd-command-name`.

Important commands for this build:

- `$gsd-new-project --auto @HRMS_SUPERCHARGED_BUILD_PLAN.md`
- `$gsd-discuss-phase 1 --assumptions`
- `$gsd-ui-phase 1`
- `$gsd-plan-phase 1`
- `$gsd-execute-phase 1`
- `$gsd-verify-work 1`
- `$gsd-code-review 1 --depth=standard`
- `$gsd-ship 1 --draft`
- `$gsd-progress --next`
- `$gsd-audit-milestone`

Best use for this project:

- Make GSD the project operating system.
- Use `.planning/` for long-running memory, roadmap, phase state, research, validation contracts, UAT notes, and execution summaries.
- Use GSD workstreams if payroll, self-service, and attendance are built in parallel.
- Use GSD validation gates so every phase has automated verification before implementation starts.

## Recommended Combined Workflow

Use both tools, but give them separate jobs:

- GSD owns project state, roadmap, phase sequencing, research, validation, and UAT.
- Superpowers owns coding discipline inside each phase: TDD, exact implementation plans, subagent-driven work, reviews, and branch completion.

Practical loop:

1. Use the installed Superpowers plugin and local GSD skills.
2. Create a clean branch or worktree for the HRMS upgrade.
3. Run GSD project intake using this file as the PRD.
4. Let GSD create `.planning/PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, `STATE.md`, and phase folders.
5. For each phase, run discussion and UI contract first.
6. Convert each phase plan into Superpowers-grade task plans where code is ready to be written.
7. Execute one phase at a time with subagents.
8. Verify with build, lint, targeted tests, browser checks, and Supabase migration checks.
9. Ship each phase as a draft PR or commit sequence before moving on.

Do not try to build the whole HRMS in one execution pass. This is a multi-phase product migration.

## Pre-Phase-5 Navigation Architecture

Status: Complete on 2026-05-15.

Before payroll work begins, the app sidebar is centralized in `lib/nav/config.ts`:

- Every sidebar route is a typed `NAV_CONFIG` entry with explicit role arrays.
- Future Phase 5-10 entries exist in config with `enabled: false` until their routes are implemented and verified.
- `components/sidebar.tsx` renders from `getNavForRole(profile.role)` and `getSectionsForRole(profile.role)` instead of hardcoded route JSX.
- Section headers auto-hide when all items in that section are filtered out.
- Settings remains outside the main nav loop and is visible only to `admin` and `hr_manager`.
- Settings user invite/edit role dropdowns render from the central typed `ROLES` list, excluding only `candidate`.
- User create/edit APIs validate saved role strings against the same central role list before updating `profiles.role`.
- The dashboard keeps its existing content and adds only a small role-aware context line.

Future phase rule: when a payroll, performance, lifecycle, reports, or recruitment-unification route is built, flip the existing config entry to `enabled: true` only after tests and browser verification pass. Do not add ad-hoc sidebar links.

Role-management rule: when adding or renaming an HRMS role, update the central role type/list first. Do not hardcode role `<option>` entries in Settings, and do not let API routes accept roles outside the central list.

## GSD Operating Model

GSD owns project state, roadmap, context, research, phase plans, execution summaries, verification, UAT, review, shipping, and milestone audits.

Main artifacts expected from GSD:

- `.planning/PROJECT.md`
- `.planning/config.json`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/research/STACK.md`
- `.planning/research/FEATURES.md`
- `.planning/research/ARCHITECTURE.md`
- `.planning/research/PITFALLS.md`
- `.planning/research/SUMMARY.md`
- `AGENTS.md`

Per-phase artifacts expected from GSD:

- `.planning/phases/XX-name/XX-CONTEXT.md`
- `.planning/phases/XX-name/XX-DISCUSSION-LOG.md`
- `.planning/phases/XX-name/XX-UI-SPEC.md`
- `.planning/phases/XX-name/XX-METADATA-SPEC.md`
- `.planning/phases/XX-name/XX-METADATA-LINEAGE.md`
- `.planning/phases/XX-name/XX-RESEARCH.md`
- `.planning/phases/XX-name/*-PLAN.md`
- `.planning/phases/XX-name/*-SUMMARY.md`
- `.planning/phases/XX-name/XX-VERIFICATION.md`
- `.planning/phases/XX-name/XX-UAT.md`
- `.planning/phases/XX-name/XX-HUMAN-UAT.md`
- `.planning/phases/XX-name/XX-REVIEW.md`
- `.planning/phases/XX-name/XX-METADATA-AUDIT.md`
- `.planning/vX.Y-MILESTONE-AUDIT.md`

Correct local GSD runbook:

```text
$gsd-new-project --auto @HRMS_SUPERCHARGED_BUILD_PLAN.md
$gsd-discuss-phase 1 --assumptions
$gsd-ui-phase 1
$gsd-plan-phase 1
$gsd-execute-phase 1
$gsd-verify-work 1
$gsd-code-review 1 --depth=standard
$gsd-ship 1 --draft
$gsd-progress --next
```

Gap closure loop:

```text
$gsd-plan-phase 1 --gaps
$gsd-execute-phase 1 --gaps-only
$gsd-verify-work 1
```

Milestone audit loop:

```text
$gsd-audit-uat
$gsd-audit-milestone
$gsd-audit-fix --dry-run
```

Frontend rule:

- Any phase with user-facing pages must run `$gsd-ui-phase N` before `$gsd-plan-phase N`.
- Any completed frontend phase should run `$gsd-ui-review N`.
- Frontend phases must run the Frontend Visual Verification Protocol before `XX-VERIFICATION.md` is accepted.

High-risk phase rule:

- Payroll, RLS, leave ledger, attendance automation, and candidate-to-employee conversion require `$gsd-code-review N --depth=deep`.
- These phases should stay mostly sequential unless GSD proves tasks are independent.
- Every phase requires metadata lineage audit before it can be marked verified.

Workstreams should start only after Phase 0 foundation is complete:

- `core-platform`: Phase 0, employee core, shared permissions, navigation, audit log
- `attendance-leave`: attendance, shifts, leave policies, balances
- `finance-hr`: expenses, advances, payroll, tax, salary slips
- `people-ops`: performance, lifecycle, training, grievances
- `self-service-reports`: employee portal, dashboards, reports, notifications
- `ats-unification`: recruitment terminology and candidate-to-employee conversion

Workstream commands:

```text
$gsd-workstreams create attendance-leave
$gsd-workstreams create finance-hr
$gsd-workstreams switch attendance-leave
$gsd-workstreams progress
```

Workspace isolation commands:

```text
$gsd-workspace --new --name hrms-payroll
$gsd-workspace --list
```

## Superpowers Operating Model

Superpowers owns implementation discipline inside each approved phase.

Execution rules:

- Use an isolated branch/worktree before implementation.
- Run baseline setup and tests before writing code.
- Do not proceed from a failing baseline without surfacing the failure.
- Do not write production code before a failing test unless the task is explicitly exempted.
- For bug fixes, write a failing regression test first.
- Run the test and verify it fails for the expected reason.
- Write the minimum code to make it pass.
- Refactor only after green.
- Commit each completed task independently.
- Do not dispatch parallel implementation subagents on overlapping files or shared schema.

Per-task review gates:

1. Implementer subagent follows the task, runs tests, commits, and self-reviews.
2. Spec compliance reviewer checks that the code matches the task and adds nothing extra.
3. The same implementer fixes spec gaps until spec review passes.
4. Code quality reviewer checks architecture, tests, maintainability, and production readiness.
5. The same implementer fixes Critical and Important issues until quality review passes.
6. Only then mark the task complete and continue.

Final gates:

- Final whole-implementation code review.
- Full test/build verification.
- Branch finishing workflow.
- Present merge/PR/keep/discard options only after verification passes.

## Subagent Strategy And Count

Subagents are used deliberately, not as uncontrolled parallel workers.

Already used for planning this document:

- `5` explorer subagents:
  - Superpowers workflow extraction
  - GSD workflow extraction
  - Supabase/HRMS database strategy extraction
  - Frontend visual verification protocol
  - Metadata lineage and no-hardcoding protocol

GSD planning/execution pattern:

- Research/planning phases may use parallel researcher/planner/checker agents.
- Execution runs by dependency waves, but schema/RLS/payroll/ledger tasks stay sequential unless proven independent.
- In Codex, subagents are allowed here because the user explicitly requested them.

Superpowers implementation count:

```text
Base HRMS phase minimum = 4N + 2
```

That means:

- `1` implementer subagent per task
- `1` spec compliance reviewer per task
- `1` code quality reviewer per task
- `1` metadata-lineage-auditor review per task or task batch
- `1` final whole-implementation reviewer after all tasks
- `1` final metadata-lineage-auditor review after all tasks
- Extra invocations are added for fix/re-review loops

Functionality-focused phase auditors are added on top of the base formula:

```text
Standard HRMS phase = 4N + 2 + F
High-risk workflow/data phase = 4N + 2 + F + W + D + R
Migration-heavy phase = 4N + 2 + F + M + I + R
Reports/automation phase = 4N + 2 + F + RA + A + D
Role-heavy/self-service phase = 4N + 2 + F + RB + U + R
```

Where:

```text
F  = final functional correctness audit
W  = workflow-correctness-auditor
D  = data-consistency-auditor
M  = migration-compatibility-auditor
I  = integration-contract-auditor
R  = regression-auditor
RA = reports-analytics-auditor
A  = automation-scheduler-auditor
RB = role-behavior-auditor
U  = functional-usability-qa
```

Do not run every auditor on every small task. Invoke functionality auditors at task-batch or phase level, but make them blocking for the domains they cover.

Functionality auditor roles:

- `workflow-correctness-auditor`: checks state transitions, approval paths, cancellations, reversals, and cross-module workflows.
- `data-consistency-auditor`: checks ledgers, balances, counters, foreign keys, denormalized summaries, idempotency, and reconciliation.
- `migration-compatibility-auditor`: checks ordered migrations, backfills, null/default handling, existing ATS compatibility, reset/push behavior, and rollback strategy.
- `integration-contract-auditor`: checks API routes, generated types, Supabase RPCs, storage/email/notification boundaries, imports, exports, and ATS-to-HRMS contracts.
- `regression-auditor`: checks existing ATS workflows still work after HRMS changes.
- `reports-analytics-auditor`: checks report source tables/views, filters, totals, date ranges, exports, and fixture reconciliation.
- `automation-scheduler-auditor`: checks reminders, accruals, expiries, retries, idempotency, timezone boundaries, and duplicate notification prevention.
- `role-behavior-auditor`: checks role/persona behavior such as visible actions, enabled actions, approval queues, exports, and route behavior.
- `functional-usability-qa`: checks usability only where it affects functionality, including form completion, keyboard operation, mobile flows, table overflow, and blocked controls.

Projected subagent budget by phase:

| Phase | Tasks | Base `4N+2` | Extra functional auditors | Recommended minimum |
|---|---:|---:|---|---:|
| Phase 0A: Metadata Governance Foundation | 10 | 42 | F, M, I | 45 |
| Phase 0: Foundation and Planning | 8 | 34 | F, M, I, R | 38 |
| Phase 1: Employee Core and Organization Setup | 14 | 58 | F, M, I, D, RB, R | 64 |
| Phase 2: Attendance, Check-ins, and Shifts | 16 | 66 | F, W, D, RB, U, R | 72 |
| Phase 3: Leave Management | 18 | 74 | F, W, D, RB, U, R | 80 |
| Phase 4: Expenses, Advances, and Travel | 14 | 58 | F, W, D, I, RB, U, R | 65 |
| Phase 5: Payroll, Salary, Tax, and Benefits | 24 | 98 | F, W, D, M, I, RA, RB, U, R | 107 |
| Phase 6: Performance Management | 12 | 50 | F, W, D, RA, RB, U | 56 |
| Phase 7: Employee Lifecycle | 16 | 66 | F, W, D, I, RB, U, R | 73 |
| Phase 8: Employee Self-Service Portal | 14 | 58 | F, I, RB, U, R | 63 |
| Phase 9: Reports, Dashboards, Notifications, Automation | 18 | 74 | F, D, I, RA, A, RB, U, R | 82 |
| Phase 10: Recruitment Unification | 12 | 50 | F, W, D, M, I, RB, U, R | 58 |
| **Total** | **176** | **728** |  | **803** |

These are planning estimates. GSD will refine the task count per phase. If a phase plan has fewer or more tasks, use the base formula plus the required phase-level functional auditors.

Maximum simultaneous execution:

- Research agents may run in parallel when independent.
- Implementation agents should usually run sequentially.
- Parallel implementation is allowed only across isolated workstreams/workspaces with non-overlapping files, database migrations, and product state.
- Frontend visual QA is a separate read-only reviewer subagent. It can run after an implementation task or phase is complete, but it must not edit files or compete with implementation agents.

## Target Architecture

Keep the current stack:

- Next.js App Router
- Supabase Auth
- Supabase Postgres
- Supabase RLS
- TypeScript
- Tailwind
- Existing API route pattern
- Existing sidebar/layout pattern

Add HRMS domains as native Next/Supabase modules. Do not run Frappe inside this app and do not port Python DocTypes directly. Use Frappe HRMS as the reference for field coverage, workflows, reports, and business rules.

Core architectural additions:

- `employees` table linked to `profiles`
- `departments`, `branches`, `companies`, `employee_grades`, `employment_types`
- Document status pattern similar to Frappe `docstatus`: draft, submitted, cancelled
- Approval pattern for leave, expense, attendance, shift, and payroll workflows
- Shared audit/activity log across ATS and HRMS modules
- Scheduled jobs for attendance, leave accrual/expiry, reminders, payroll readiness, and notifications
- Employee self-service routes separate from admin HR routes

## Metadata Governance And Lineage

This build must treat metadata as a governed product surface, not as helper constants scattered through files.

Problem to prevent:

- Hard-coded roles in components, API routes, and SQL policies
- Hard-coded workflow states such as `approved`, `submitted`, `cancelled`
- Hard-coded route lists and sidebar labels
- Hard-coded form fields, report columns, import aliases, salary components, leave types, approval rules, and permissions
- Metadata that exists in the UI but cannot be traced back to a requirement, migration, or source reference

Immediate rule:

```text
No new HRMS business metadata may be introduced directly inside TSX, API routes, SQL migrations, or tests without a registry key and lineage entry.
```

Stable metadata keys must be used everywhere. Display labels can change; keys should not.

Example keys:

```text
role.hr_manager
role.employee
permission.leave.approve
route.hrms.leave.applications
field.employee.date_of_joining
workflow.leave_application.submitted
workflow.leave_application.approved
report.payroll.salary_register
salary_component.basic
leave_type.earned_leave
approval_rule.expense.department_head
```

### Metadata Registry

Add a source-controlled metadata registry before HRMS implementation starts:

```text
metadata/
  registry.schema.json
  roles.yaml
  permissions.yaml
  routes.yaml
  workflows.yaml
  approvals.yaml
  lineage.yaml
  forms/
    employee.yaml
    leave_application.yaml
    expense_claim.yaml
  reports/
    salary_register.yaml
    leave_balance.yaml
  payroll/
    salary_components.yaml
    salary_structures.example.yaml
  leave/
    leave_types.yaml
    leave_policies.example.yaml
  imports/
    candidate_import_aliases.yaml
    job_import_aliases.yaml
```

Mirror governed metadata into runtime database tables only where the app needs runtime lookup or auditability:

```text
metadata_registry
metadata_versions
metadata_lineage
roles
permissions
role_permissions
app_routes
workflow_definitions
workflow_states
workflow_transitions
form_schemas
field_definitions
report_definitions
approval_rules
approval_steps
salary_components
leave_types
```

YAML/JSON registries are the reviewed source of truth. Database migrations should upsert metadata by stable key. Migrations must not embed business labels or statuses ad hoc.

### Generated Metadata Artifacts

Generate TypeScript and SQL artifacts from the metadata registry:

```text
lib/generated/metadata.ts
lib/generated/roles.ts
lib/generated/routes.ts
lib/generated/workflows.ts
lib/generated/forms.ts
lib/generated/reports.ts
lib/generated/permissions.ts
supabase/generated/metadata_seed.sql
```

Application code must import generated keys and helpers instead of writing raw strings.

Allowed:

```ts
import { ROLE_KEYS, canAccessRoute } from "@/lib/generated/permissions";
```

Not allowed:

```ts
const allowedRoles = ["admin", "hr_manager"];
const status = "approved";
```

### Metadata Validation Scripts

Add package scripts during Phase 0A:

```json
{
  "metadata:validate": "tsx scripts/metadata/validate.ts",
  "metadata:generate": "tsx scripts/metadata/generate.ts",
  "metadata:check-hardcoding": "tsx scripts/metadata/check-hardcoding.ts",
  "metadata:lineage": "tsx scripts/metadata/lineage-report.ts"
}
```

Validation must check that every governed item has:

- `key`
- `label`
- `domain`
- `owner`
- `source_ref`
- `introduced_in_phase`
- `db_table`
- `ts_export`
- `api_routes`
- `ui_surfaces`
- `tests`

Domain-specific validation:

- Workflows require explicit states, transitions, terminal states, and permissions.
- Routes require role/permission mapping and sidebar placement decision.
- Forms require field type, storage mapping, validation, privacy class, and test IDs.
- Reports require source tables/views, filters, columns, permission, export behavior, and fixture.
- Salary components require category, formula/fixed rule, taxable flag, recurrence, and effective dates.
- Leave types require accrual, carry-forward, encashment, negative balance, holiday/weekend behavior, and approval behavior.
- Approval rules require approver resolver, fallback, delegation, timeout/escalation, and audit events.

Required checks before HRMS code can merge:

```powershell
npm run metadata:validate
npm run metadata:generate
npm run metadata:check-hardcoding
npm run metadata:lineage
npm run build
supabase db reset
supabase migration up
```

### Hardcoding Scanner

The hardcoding scanner must inspect:

```text
app/
components/
lib/
supabase/migrations/
```

It should flag suspicious literals for:

- Roles and permissions
- Workflow statuses and transitions
- Routes and nav labels
- Form field labels/options
- Report names, columns, and filters
- Import aliases
- Salary components
- Leave types
- Approval labels and approver roles

Allowlists are permitted only for:

- Generated files
- Test fixtures
- Metadata registry files
- Deliberate technical constants

### Metadata Lineage Trace

Every governed item must trace through:

```text
Source reference
-> GSD requirement
-> metadata registry key
-> DB migration/upsert
-> generated TypeScript type/helper
-> API authorization/workflow usage
-> UI rendering/form/report usage
-> automated tests
-> metadata audit note
```

Example lineage entry:

```yaml
key: workflow.leave_application.approved
domain: leave
source_ref:
  system: frappe_hrms
  module: leave
  artifact: Leave Application
  field_or_state: Approved
plan_requirement:
  file: HRMS_SUPERCHARGED_BUILD_PLAN.md
  phase: 3
  requirement: Submit, approve, reject, cancel leave application
registry:
  file: metadata/workflows.yaml
db:
  migration: supabase/migrations/2026xxxx_leave_workflows.sql
  tables:
    - workflow_states
    - workflow_transitions
typescript:
  generated: lib/generated/workflows.ts
api:
  routes:
    - app/api/leaves/applications/[id]/approve/route.ts
ui:
  surfaces:
    - app/(app)/leaves/applications/page.tsx
tests:
  unit:
    - tests/metadata/workflows.test.ts
  api:
    - tests/api/leave-approval.test.ts
  e2e:
    - tests/e2e/leave-approval.spec.ts
```

### Metadata Lineage Auditor Subagent

Add a read-only subagent role:

```text
metadata-lineage-auditor
```

Responsibilities:

- Compare each phase plan against metadata registries.
- Flag new business strings not represented by metadata keys.
- Trace each metadata key from source reference to requirement, migration, generated TypeScript, API, UI, and tests.
- Review RLS policies against `role_permissions`.
- Verify reports, forms, workflows, approvals, salary components, leave types, and import aliases are not duplicated in UI/API code.
- Produce `.planning/phases/XX-name/XX-METADATA-AUDIT.md`.

Blocking findings:

- `unregistered_metadata`: business metadata exists in implementation but not in registry.
- `untraceable_metadata`: registry metadata exists but cannot be traced through DB/types/API/UI/tests.
- `hardcoded_policy`: role/permission logic is embedded outside generated helpers or approved SQL helper functions.
- `metadata_drift`: DB, generated TypeScript, UI, and tests disagree on the same key.

## Role Model

Extend current roles:

- `admin`: full system access
- `hr_manager`: HRMS administration and approvals
- `hr_user`: HR operations without full system administration
- `recruiter`: ATS recruiting workflows
- `hod`: hiring requests, candidate remarks, team approvals
- `employee`: self-service profile, attendance, leave, expenses, salary slips
- `leave_approver`: leave approval queue
- `expense_approver`: expense approval queue
- `interviewer`: interview feedback and candidate evaluations
- `payroll_manager`: payroll, salary structures, salary slips, tax/benefits

## Phase Roadmap

### Phase 0: Foundation and Planning

Goal: Prepare the codebase for HRMS without breaking ATS.

Deliverables:

- GSD `.planning/` project created from this plan
- HRMS feature matrix mapped from Frappe modules to HireRabbits modules
- Role and permission matrix
- Supabase migration strategy
- Navigation IA for ATS + HRMS
- Baseline test/build verification

Verification:

- `npm run build`
- Supabase migration dry-run review
- Manual route map review

### Phase 1: Employee Core and Organization Setup

Goal: Add employee master data and organization structure.

Tables:

- `employees`
- `companies`
- `branches`
- `departments`
- `employee_grades`
- `employment_types`
- `department_approvers`
- `employee_documents`

Routes:

- `/employees`
- `/employees/[id]`
- `/hr/setup`

Key workflows:

- Create employee from joined candidate
- Link employee to existing profile/user
- Manage department, designation, site, branch, grade, reporting manager
- Upload employee documents

### Phase 2: Attendance, Check-ins, and Shifts

Goal: Replicate the HRMS attendance foundation.

Tables:

- `attendance`
- `employee_checkins`
- `attendance_requests`
- `shift_types`
- `shift_locations`
- `shift_assignments`
- `shift_requests`
- `shift_schedules`
- `overtime_types`
- `overtime_slips`

Routes:

- `/attendance`
- `/attendance/checkins`
- `/attendance/requests`
- `/shifts`
- `/shifts/roster`

Key workflows:

- Employee check-in/check-out
- Attendance calendar
- Attendance correction request
- Shift assignment and shift change request
- Roster view
- Approval queue

### Phase 3: Leave Management

Goal: Add complete leave policy and self-service leave.

Tables:

- `leave_types`
- `leave_periods`
- `leave_policies`
- `leave_policy_details`
- `leave_policy_assignments`
- `leave_allocations`
- `leave_applications`
- `leave_ledger_entries`
- `holiday_lists`
- `leave_block_lists`
- `compensatory_leave_requests`
- `leave_encashments`

Routes:

- `/leaves`
- `/leaves/applications`
- `/leaves/balances`
- `/leaves/policies`
- `/leaves/ledger`

Key workflows:

- Configure leave types and policies
- Assign policy to employee
- Calculate leave balance
- Submit, approve, reject, cancel leave application
- Maintain leave ledger

### Phase 4: Expenses, Advances, and Travel

Goal: Add employee expense workflows.

Tables:

- `expense_claims`
- `expense_claim_items`
- `expense_claim_types`
- `employee_advances`
- `travel_requests`
- `travel_itineraries`
- `vehicle_logs`
- `vehicle_services`

Routes:

- `/expenses`
- `/expenses/claims`
- `/expenses/advances`
- `/travel`
- `/vehicles`

Key workflows:

- Expense claim with attachments
- Advance request and settlement
- Travel request approval
- Vehicle expense tracking
- Approval queue and reports

### Phase 5: Payroll, Salary, Tax, and Benefits

Status: Complete on 2026-05-15. Implemented governed payroll metadata, migration, helpers, APIs, UI routes, role-based nav enablement, tests, live Supabase migration, and browser verification.

Implementation note: Phase 1 already created `salary_components` as governed metadata keyed by `key`. Phase 5 upgrades that table with payroll operational columns and a unique `id` instead of replacing it.

Goal: Upgrade existing CTC/offers into payroll-grade salary operations.

Tables:

- `salary_components`
- `salary_structures`
- `salary_structure_details`
- `salary_structure_assignments`
- `payroll_periods`
- `payroll_entries`
- `salary_slips`
- `salary_slip_lines`
- `additional_salaries`
- `employee_incentives`
- `salary_withholdings`
- `income_tax_slabs`
- `employee_tax_exemption_declarations`
- `employee_benefit_applications`
- `employee_benefit_claims`
- `gratuity_rules`

Routes:

- `/payroll`
- `/payroll/salary-structures`
- `/payroll/runs`
- `/payroll/salary-slips`
- `/payroll/tax-benefits`

Key workflows:

- Define salary components
- Assign salary structures
- Generate salary slips
- Lock/submit/cancel salary slips
- Employee salary slip self-service
- Tax and benefit declaration tracking

### Phase 6: Performance Management

Goal: Add goals, KRAs, appraisals, and feedback.

Tables:

- `goals`
- `kras`
- `appraisal_templates`
- `appraisal_template_goals`
- `appraisal_cycles`
- `appraisals`
- `appraisal_goals`
- `employee_performance_feedback`
- `employee_feedback_criteria`
- `employee_feedback_ratings`

Routes:

- `/performance`
- `/performance/goals`
- `/performance/appraisals`
- `/performance/feedback`

Key workflows:

- Create goals and KRAs
- Configure appraisal templates
- Run appraisal cycle
- Collect self/manager feedback
- Report performance outcomes

### Phase 7: Employee Lifecycle

Goal: Add lifecycle events after hiring.

Tables:

- `employee_onboarding_templates`
- `employee_onboardings`
- `employee_boarding_activities`
- `employee_separation_templates`
- `employee_separations`
- `employee_promotions`
- `employee_transfers`
- `employee_grievances`
- `grievance_types`
- `exit_interviews`
- `training_programs`
- `training_events`
- `training_feedback`
- `daily_work_summaries`

Routes:

- `/lifecycle`
- `/lifecycle/onboarding`
- `/lifecycle/separation`
- `/lifecycle/promotions`
- `/lifecycle/transfers`
- `/grievances`
- `/training`

Key workflows:

- Candidate joined to employee onboarding
- Activity checklist tracking
- Promotion/transfer record
- Separation and exit interview
- Training and feedback
- Daily work summaries

### Phase 8: Employee Self-Service Portal

Goal: Give employees a simplified HRMS experience.

Routes:

- `/self-service`
- `/self-service/profile`
- `/self-service/attendance`
- `/self-service/leaves`
- `/self-service/expenses`
- `/self-service/salary-slips`
- `/self-service/notifications`

Key workflows:

- View profile
- Check in/out
- Apply for leave
- Submit expense claim
- Download salary slip
- View approval statuses and notifications

### Phase 9: Reports, Dashboards, Notifications, Automation

Goal: Add HRMS reporting and scheduled operations.

Reports:

- Employee information
- Employee analytics
- Monthly attendance sheet
- Shift attendance
- Leave balance
- Leave ledger
- Employee advance summary
- Unpaid expense claims
- Salary register
- Bank remittance
- Recruitment analytics
- Employee exits
- Birthdays and anniversaries

Automations:

- Leave accrual and expiry
- Attendance reminders
- Interview reminders
- Birthday and work anniversary reminders
- Payroll readiness checks
- Pending approval notifications

### Phase 10: Recruitment Unification

Goal: Align the existing ATS with HRMS recruitment terminology without losing current HireRabbits workflows.

Mappings:

- `jobs` -> Job Opening / Job Requisition
- `candidates` -> Job Applicant
- `interviews` -> Interview / Interview Feedback
- `candidate_offers` -> Job Offer / Appointment Letter
- `hiring_requests` -> Job Requisition / Staffing Plan

Key workflows:

- Keep the existing ATS UX where it is stronger.
- Add HRMS-compatible statuses and reports.
- Convert joined candidate into employee onboarding.
- Add appointment letter templates and appointment workflow.

## First GSD Runbook

GSD and Superpowers are installed locally. Start the project intake with:

```text
$gsd-new-project --auto @HRMS_SUPERCHARGED_BUILD_PLAN.md
$gsd-discuss-phase 1 --assumptions
$gsd-ui-phase 1
$gsd-plan-phase 1
```

Then review the generated plan before execution. For implementation:

```text
$gsd-execute-phase 1
$gsd-verify-work 1
$gsd-code-review 1 --depth=standard
$gsd-ship 1 --draft
$gsd-progress --next
```

For high-risk phases:

```text
$gsd-code-review N --depth=deep
$gsd-audit-uat
$gsd-audit-milestone
```

For verification gaps:

```text
$gsd-plan-phase N --gaps
$gsd-execute-phase N --gaps-only
$gsd-verify-work N
```

For each major frontend phase, run:

```text
$gsd-ui-phase N
$gsd-ui-review N
```

For uncertain technical areas:

```text
$gsd-spike "Supabase payroll schema and salary slip generation strategy"
$gsd-spike "Attendance check-in geolocation and roster implementation"
$gsd-sketch "Employee self-service dashboard"
```

## Superpowers Execution Rules For This Build

Every implementation plan should follow this standard:

- Exact files to create/modify
- Failing test first
- Run test and confirm failure
- Minimal implementation
- Run test and confirm pass
- Refactor only after green
- Commit each task independently
- Review spec compliance before code quality
- Do not start parallel implementation agents on overlapping files

Recommended plan location:

- `docs/superpowers/plans/YYYY-MM-DD-hrms-phase-N.md`

Required plan header for phase implementation plans:

```markdown
# [Feature Name] Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]
```

Every implementation task must include:

- Exact files to create, modify, and test
- A failing test step
- The command to run the failing test
- The minimal implementation step
- The command to verify the passing test
- A commit command
- Expected output or success signal
- No vague placeholders

## Supabase Database Build Workflow

Supabase CLI is connected locally. The raw CLI token must not be saved in this plan or committed anywhere.

Current Supabase state:

- `supabase/schema_full.sql` is the current ATS full setup snapshot.
- `supabase/schema_v3.sql` is an older incremental schema file and must not be replayed blindly.
- `supabase/migrations/20260424005500_add_job_platform_to_jobs.sql` is the only proper migration currently present.
- `supabase/add_job_platform.sql` duplicates the same column change and should not be treated as a migration chain step.

Database principle:

- Do not paste one giant HRMS schema into production.
- Add HRMS domains through small, ordered migrations.
- Enable RLS in the same migration that creates each HRMS table.
- Use explicit fail-closed policies for HRMS tables.
- Never seed tokens, service account JSON, API keys, passwords, real salary data, or private employee documents.

Preflight commands:

```powershell
supabase status
supabase migration list --linked
supabase db dump --linked --file backups/pre_hrms_20260510.sql
npm run build
```

Per-migration local verification:

```powershell
supabase db reset
supabase migration up
npm run build
```

Remote review and push:

```powershell
supabase migration list --linked
supabase db push --linked --dry-run
supabase db push --linked
supabase migration list --linked
```

Post-deploy database checks:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;

select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;

select schemaname, tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

Recommended migration sequence:

1. Role model expansion and helper functions.
2. Organization foundation.
3. Employee core.
4. Shared workflow infrastructure.
5. Attendance and shifts.
6. Leave management.
7. Expenses, advances, and travel.
8. Payroll, salary, tax, and benefits.
9. Performance and lifecycle.
10. Self-service, reports, automation, and recruitment unification.

RLS access model:

- `admin`: full HRMS access.
- `hr_manager`: full HR operations except separated payroll-only areas.
- `hr_user`: operational HR access with limited deletes and limited payroll visibility.
- `employee`: own profile, attendance, leave, expenses, and submitted salary slips.
- `leave_approver`: leave approval queue for assigned departments/employees.
- `expense_approver`: expense approval queue for assigned departments/employees.
- `payroll_manager`: payroll tables, salary structures, salary slips, tax/benefits.
- `recruiter`: ATS access plus explicitly allowed candidate-to-employee handoff.
- `hod`: team requests and approvals, not broad payroll/employee access.
- `interviewer`: interview feedback only.

## Quality Gates

Every phase must pass:

- `npm run build`
- TypeScript checks from Next build
- Targeted route/API tests when test infrastructure exists
- Supabase migration review
- RLS policy review
- Browser verification for frontend routes
- Manual UAT checklist written into `.planning/phases/.../UAT.md`

High-risk phases needing extra care:

- Payroll and tax
- Leave balance calculations
- Attendance/shift automation
- Role permissions and RLS
- Candidate-to-employee conversion

## Frontend Visual Verification Protocol

Use `agent-browser.cmd` as the primary frontend verification tool. It is already installed at:

```text
C:\Users\Admin\AppData\Roaming\npm\agent-browser.cmd
```

Do not install a browser MCP by default. Browser MCP servers add tool/schema overhead and are unnecessary while `agent-browser.cmd` can open pages, snapshot DOM state, capture screenshots, inspect console/errors, and compare screenshots.

Do not install Playwright just for one-off visual inspection. Add Playwright later only when a flow needs persistent automated e2e regression coverage in the repo or CI.

Recommended read-only subagent role:

```text
frontend-visual-qa
```

Frontend visual QA responsibilities:

- Does not edit files.
- Reads the phase UI spec, route list, role matrix, and implementation summary.
- Starts or uses the dev server.
- Opens each target route in `agent-browser.cmd`.
- Captures desktop and mobile screenshots.
- Checks blank screens, Next error overlays, hydration warnings, console errors, failed requests, and layout overflow.
- Compares current screenshots against approved baselines when a baseline exists.
- Writes findings into `.planning/phases/XX-name/XX-VERIFICATION.md` or a linked visual QA note.

Baseline startup flow:

```powershell
npm.cmd run dev
agent-browser.cmd open "http://localhost:3000"
agent-browser.cmd wait --load networkidle
agent-browser.cmd errors --clear
agent-browser.cmd console --clear
```

Per-route visual check:

```powershell
agent-browser.cmd set viewport 1440 900
agent-browser.cmd open "http://localhost:3000/dashboard"
agent-browser.cmd wait --load networkidle
agent-browser.cmd eval "document.querySelector('[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay') ? 'ERROR_OVERLAY' : 'OK'"
agent-browser.cmd eval "document.body.innerText.trim().length > 0 ? 'HAS_CONTENT' : 'BLANK'"
agent-browser.cmd errors
agent-browser.cmd console
agent-browser.cmd screenshot ".planning/visual/phase-XX/current/dashboard-1440x900.png" --full
```

Screenshot storage:

- Approved baselines: `.planning/visual/phase-XX/baseline/`
- Current verification shots: `.planning/visual/phase-XX/current/`
- Failed diffs: `.planning/visual/phase-XX/diff/`

Screenshot diff command:

```powershell
agent-browser.cmd diff screenshot --baseline ".planning/visual/phase-XX/baseline/dashboard-1440x900.png"
```

Use unannotated screenshots for baseline comparison. Use `--annotate` only for debugging and for explaining findings.

Viewport matrix:

- `1440x900`: primary desktop/admin HRMS layout
- `1280x720`: common laptop and dense table stress check
- `1024x768`: tablet/small desktop
- `390x844`: modern mobile self-service
- `360x740`: narrow mobile stress case

Route coverage:

- Existing ATS shell: `/dashboard`, `/candidates`, `/jobs`, `/my-activity`, `/hod-portal`, `/jds`, `/masters`, `/settings`, `/users`, `/sync`, `/import`
- Public surface: `/login`, `/f/[id]` when a fixture form exists
- New HRMS routes per phase: `/employees`, `/hr/setup`, `/attendance`, `/leaves`, `/expenses`, `/payroll`, `/performance`, `/lifecycle`, `/self-service`
- Verify allowed-role views for `admin`, `hr_manager`, `recruiter`, `hod`, `employee`, `leave_approver`, `expense_approver`, and `payroll_manager` as those roles are introduced

Failure conditions:

- Blank body
- Next.js error overlay
- Uncaught browser errors
- Console errors caused by the app
- Hydration mismatch warnings
- Failed resource/API requests
- Unexpected 401/403/404/500 responses
- Unexpected redirect to `/login`
- Text overlap, clipped controls, unreadable tables, broken mobile navigation, or inaccessible form controls

Playwright adoption threshold:

- Add `@playwright/test` only when the flow must become repeatable automated coverage.
- Good Playwright candidates: login smoke, role-based route access, candidate-to-employee conversion, leave submit/approve, expense submit/approve, payroll run review, salary slip self-service, public form submission.
- Keep `agent-browser.cmd` for exploratory visual QA and screenshot review even after Playwright is added.

## Immediate Next Actions

1. Create or switch to a dedicated branch/worktree for the HRMS upgrade.
2. Run Supabase preflight without exposing credentials: `supabase status`, `supabase migration list --linked`, and a pre-HRMS dump.
3. Run GSD project intake from this plan: `$gsd-new-project --auto @HRMS_SUPERCHARGED_BUILD_PLAN.md`.
4. Let GSD generate `.planning/` artifacts, phase roadmap, research, and validation contracts.
5. Start Phase 0 before writing product code.
6. Use Superpowers subagent-driven development for implementation after a phase plan is approved.
7. Apply the base `4N + 2` subagent invocation rule for each phase with `N` implementation tasks, then add required phase-level functional auditors from the subagent budget table.

## Source References

- HireRabbits local manual: `USER_MANUAL.md`
- Local HRMS reference repo: `C:\Users\Admin\Music\Rabbit F\Rabbits-main v1\hrms-develop\hrms-develop`
- Superpowers GitHub: https://github.com/obra/superpowers
- Superpowers README: https://raw.githubusercontent.com/obra/superpowers/main/README.md
- GSD GitHub: https://github.com/gsd-build/get-shit-done
- GSD User Guide: https://raw.githubusercontent.com/gsd-build/get-shit-done/main/docs/USER-GUIDE.md
- GSD Command Reference: https://raw.githubusercontent.com/gsd-build/get-shit-done/main/docs/COMMANDS.md
- GSD Architecture: https://raw.githubusercontent.com/gsd-build/get-shit-done/main/docs/ARCHITECTURE.md
- Local Superpowers plugin: `C:\Users\Admin\.codex\plugins\cache\openai-curated\superpowers\63976030`
- Local GSD skills: `C:\Users\Admin\.codex\skills\gsd-*`
