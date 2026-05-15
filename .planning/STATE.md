# State: HireRabbits ATS to HRMS Upgrade

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-05-13)

**Core value:** HireRabbits must become a governed HRMS without breaking ATS workflows that already run the business.
**Current focus:** Phase 4 - Expenses, Advances, and Travel.

## Current Position

- Phase: 4 of 10
- Phase name: Expenses, Advances, and Travel
- Plan: 04-PLAN.md
- Status: Ready to execute
- Recovery note: `.planning/` was missing and was reconstructed from `HRMS_SUPERCHARGED_BUILD_PLAN.md`, code inspection, and verification commands.

## Progress

`[####------] 4/11 roadmap phases complete`

Completed:
- Phase 0: Foundation and Planning
- Phase 1: Employee Core and Organization Setup
- Phase 2: Attendance, Check-ins, and Shifts
- Phase 3: Leave Management

Next:
- Phase 4: Expenses, Advances, and Travel

## Verification Snapshot

Last verified on 2026-05-13:

- `npm.cmd run test:metadata` - passed, 17/17 tests.
- `npm.cmd run test:employee-core` - passed, 20/20 tests.
- `npm.cmd run test:attendance` - passed, 36/36 tests.
- `npm.cmd run test:leave` - passed, 17/17 tests.
- `npm.cmd run build` - passed after network access was available for Google Fonts.

## Recent Decisions

- Resume from Phase 4 because application code and tests show metadata, employee core, attendance, and leave are already implemented and passing.
- Treat Git status as insufficient for phase tracking because this folder is untracked from the parent `C:\Users\Admin` repository.
- Keep Phase 4 finance workflows separate from payroll posting.

## Pending Todos

- Execute Phase 4 implementation plan.
- Add Phase 4 metadata keys for expense routes, permissions, workflows, forms, reports, and approval rules.
- Add Supabase migration with RLS for expense, advance, travel, and vehicle tables.
- Add APIs, UI routes, sidebar visibility, helper functions, and tests for Phase 4.
- Run browser verification after frontend implementation.

## Blockers and Concerns

- Git repository boundary is unclear: `HRMS-main` has no local `.git` and appears untracked from parent repo.
- Supabase migration application status was not checked during recovery.
- Phase 4 must avoid payroll side effects.

## Session Continuity

Resume with:

`$gsd-execute-phase 4`

If more planning is desired before execution, review:

- `.planning/phases/04-expenses-advances-and-travel/04-CONTEXT.md`
- `.planning/phases/04-expenses-advances-and-travel/04-UI-SPEC.md`
- `.planning/phases/04-expenses-advances-and-travel/04-PLAN.md`
