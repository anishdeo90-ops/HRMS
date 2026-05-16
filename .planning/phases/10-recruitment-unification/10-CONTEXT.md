# Phase 10 Context: Recruitment Unification

## Goal

Align the existing HireRabbits ATS with HRMS recruitment terminology and downstream employee onboarding without losing current ATS workflows.

## Scope

- Govern HRMS recruitment terminology for existing ATS concepts:
  - `jobs` as Job Openings / Job Requisitions.
  - `candidates` as Job Applicants.
  - `interviews` as Interviews / Interview Feedback.
  - `candidate_offers` as Job Offers / Appointment Letters.
  - `hiring_requests` as Job Requisitions / Staffing Plans.
- Add governed metadata for recruitment permissions, routes, forms, workflows, reports, import aliases, and lineage.
- Add additive SQL structures for recruitment terminology/status mapping, appointment letter templates, appointment letters, and candidate-to-employee onboarding handoff tracking.
- Add HRMS-facing recruitment helpers and APIs that wrap or summarize existing ATS tables without breaking existing ATS routes.
- Add HRMS-facing recruitment overview and appointment-letter UI surfaces while keeping the current ATS screens reachable.

## Brownfield Constraints

- Do not rename, drop, or rewrite existing ATS tables in Phase 10.
- Preserve existing `/candidates`, `/jobs`, `/hod-portal`, `/jds`, `/masters`, `/import`, `/sync`, `/my-activity`, settings, candidate offer, CTC, interview, and public form behavior.
- New HRMS recruitment concepts must be governed through metadata and generated artifacts.
- SQL/RLS must fail closed and use existing role/permission helper patterns.
- Candidate-to-employee handoff must be explicit and auditable; do not silently mutate ATS candidate records.
- Keep ATS offer/CTC helpers separate from payroll-grade salary operations.

## Expected Deliverables

- Metadata and generated artifacts for recruitment unification.
- Migration `20260516030000_recruitment_unification.sql` with additive tables, constraints, triggers, helper-backed RLS, and compatibility checks.
- HRMS recruitment helper/auth/API layer under `lib/hrms/recruitment*` and `app/api/hrms/recruitment/**`.
- UI routes:
  - `/recruitment`
  - `/recruitment/appointments`
- Navigation entries in the existing Recruiting section only after route files and tests exist.
- Contract tests for metadata, SQL/RLS, helper/auth/API, UI, nav, and existing ATS reachability.

## Verification Expectations

- Metadata validation, generation, lineage, hardcoding, and metadata tests pass.
- Recruitment SQL/RLS contract tests pass.
- Recruitment helper/auth/API/UI contract tests pass.
- Existing ATS route contract coverage confirms key ATS screens stay reachable and current route labels are intentionally preserved or paired with HRMS terminology.
- `npm.cmd run test:recruitment`, `npm.cmd run test:nav`, and `npm.cmd run build` pass.
- Bob applies the live migration, confirms Supabase local/remote parity, restarts the dev server after build, and browser-checks recruitment routes and CSS.
