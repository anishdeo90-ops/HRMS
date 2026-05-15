# Research Summary

**Recovered:** 2026-05-13
**Source:** `HRMS_SUPERCHARGED_BUILD_PLAN.md`, local code inspection, and verification commands.

## Existing Architecture

- Next.js 14 App Router app with Supabase Auth and Supabase Postgres.
- API routes are implemented under `app/api`.
- HRMS APIs use `/api/hrms/...` for employee, organization, attendance, shifts, overtime, and leave.
- HRMS UI routes currently live under grouped routes such as `/people/...` and `/time/...`.
- Sidebar visibility is controlled by generated route metadata and helpers in `lib/hrms/route-access.ts`.
- Metadata is source-controlled in YAML under `metadata/` and generated into `lib/generated/*` plus `supabase/generated/metadata_seed.sql`.

## Verified HRMS Domains

- Metadata governance.
- Employee core and organization setup.
- Attendance, check-ins, corrections, shifts, rosters, and overtime.
- Leave setup, applications, approvals, balances, ledger, compensatory requests, and encashments.

## Phase 4 Implementation Pattern

Follow the established pattern from completed phases:

1. Add metadata YAML for Phase 4 keys.
2. Regenerate metadata constants and seed SQL.
3. Add focused tests before implementation.
4. Add Supabase migration with tables, helper functions, indexes, triggers, RLS, and storage policies where needed.
5. Add pure helper functions in `lib/hrms`.
6. Add authorization helpers that fail closed.
7. Add API routes under `/api/hrms`.
8. Add route visibility helpers and sidebar entries.
9. Add UI pages using the existing dense operational table/form style.
10. Run targeted tests, build, and browser verification.

## Key Risks

- Expense approvals must be scoped by self, reporting manager, department approver, HR, finance, and admin without global reads.
- Attachments must use private storage paths and signed access.
- Advances must not become payroll postings in Phase 4.
- Travel and vehicle workflows must remain finance/HR operations, not ATS workflows.
