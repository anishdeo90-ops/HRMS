# Phase 7 Context: Employee Lifecycle

> **GSD entrypoint:** `$gsd-execute-phase 7`. Started on 2026-05-15 after Phase 6 browser/API verification passed.

## Goal

Add governed employee lifecycle workflows after hiring: onboarding, separation, promotions, transfers, grievances, training, exit interviews, and daily work summaries.

## Brownfield Guardrails

- Preserve existing ATS candidate, job, interview, offer, and hiring workflows.
- Do not change completed HRMS domains except through explicit integration contracts.
- Lifecycle records must reference existing `employees`, `profiles`, departments, companies, branches, and grades where applicable.
- Candidate-to-employee onboarding must not mutate ATS candidate records unexpectedly.
- Bob owns any live Supabase migration application.

## Scope

Tables planned from the build plan:

- `employee_onboarding_templates`
- `employee_onboardings`
- `employee_boarding_activities`
- `employee_separation_templates`
- `employee_separations`
- `employee_promotions`
- `employee_transfers`
- `grievance_types`
- `employee_grievances`
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

## Required Contracts

- Metadata must register lifecycle permissions, routes, forms, workflows, approvals, reports, and lineage.
- Migration must include tables, constraints, triggers, helper functions, RLS enablement, and policies in the same phase.
- APIs must use local authorization helpers and avoid broad admin reads.
- UI routes must be enabled in `lib/nav/config.ts` only after route files and tests exist.
- Tests must cover metadata, SQL/RLS, helpers, authorization, API contracts, UI contracts, nav enablement, build, migration push, and browser verification.
