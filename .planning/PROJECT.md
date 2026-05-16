# HireRabbits ATS to HRMS Upgrade

## What This Is

HireRabbits is an existing Next.js 14 and Supabase applicant tracking system being upgraded into a governed HRMS. The product must preserve current recruiting workflows while adding employee records, attendance, leave, expenses, payroll, performance, lifecycle, self-service, reporting, notifications, and HR automation.

The HRMS reference repo is a workflow and feature reference only. It must not be copied into this Next.js/Supabase app.

## Core Value

HireRabbits must become a governed HRMS without breaking ATS workflows that already run the business.

## Requirements

### Validated

- Completed: Metadata governance foundation is present and test-verified.
- Completed: Employee core and organization setup are present and test-verified.
- Completed: Attendance, check-ins, shifts, corrections, roster, and overtime foundation are present and test-verified.
- Completed: Leave setup, applications, approvals, balances, ledger, compensatory leave, and encashment foundation are present and test-verified.
- Completed: Phase 4 expenses, advances, travel, vehicles, live migration, pre-Phase-5 role-based navigation, central Settings role assignment, and Phase 5 payroll are present and test/browser-verified.

### Active

- [x] Build expenses, employee advances, travel requests, and vehicle expense tracking with governed metadata, RLS, API routes, and role-aware UI.
- [x] Centralize sidebar navigation in typed role-aware config before Phase 5 so future HRMS modules are enabled by config flips, not sidebar JSX edits.
- [x] Keep Settings user role assignment tied to the central typed role list so new users inherit the correct sidebar visibility.
- [x] Build payroll-grade salary operations without weakening existing CTC/offers behavior.
- [ ] Build performance, lifecycle, self-service, reports, notifications, automations, and recruitment unification in later phases.
- [ ] Keep metadata lineage and hardcoding checks green for every new governed role, route, permission, workflow state, form, report, import alias, and salary or expense component.

### Out of Scope

- Copying code from the Frappe HRMS reference repo - it is a workflow reference only.
- Replacing the ATS experience wholesale - existing recruiting workflows must remain stable unless explicitly planned and verified.
- Building multiple high-risk domains in one pass - payroll, leave ledger changes, RLS changes, attendance automation, and candidate-to-employee conversion require focused verification.

## Context

- Stack: Next.js 14 App Router, TypeScript, Supabase Auth, Supabase Postgres, Supabase RLS, Tailwind, Radix, lucide-react, and Node test runner with tsx.
- Current HRMS code footprint includes metadata governance, employee core, organization setup, attendance/check-ins/shifts/overtime, and leave management.
- Missing GSD `.planning/` artifacts were reconstructed on 2026-05-13 from `HRMS_SUPERCHARGED_BUILD_PLAN.md` and verification commands.
- The local parent Git repository currently sees `Music/HRMS/HRMS-main/` as untracked; this project directory does not have its own `.git` directory.

## Constraints

- **Architecture**: Keep Next.js App Router, TypeScript, Supabase Auth, Supabase Postgres, Supabase RLS, Tailwind, and existing API/sidebar/layout patterns.
- **Brownfield safety**: Preserve ATS behavior unless a change is explicitly planned and verified.
- **Metadata governance**: New roles, statuses, routes, form fields, workflow states, permissions, reports, salary components, leave types, approval rules, and import aliases must use governed metadata.
- **Database safety**: Supabase migrations must be incremental and include RLS in the same migration as new HRMS tables.
- **Security**: RLS policies must fail closed and use helper functions or generated permission helpers for role and permission decisions.
- **Frontend QA**: Use `agent-browser.cmd` for local browser verification before adding Playwright.
- **Execution discipline**: GSD owns roadmap/state/verification; Superpowers owns TDD, implementation discipline, reviews, and branch finishing.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use the HRMS reference repo as feature reference only | Avoid copying incompatible Frappe implementation into Next.js/Supabase | Good |
| Use governed metadata for HRMS roles, routes, permissions, forms, reports, workflows, imports, and payroll/expense concepts | Prevent hardcoded business rules and keep lineage auditable | Good |
| Complete Phase 4 before payroll | Metadata, migration, APIs, UI, browser checks, and live Supabase migration have been verified | Good |
| Move sidebar route visibility into typed `lib/nav/config.ts` before Phase 5 | Prevent sidebar overload and role leakage as payroll/performance/lifecycle/report routes are added | Good |
| Use central `ROLES` for Settings invite/edit and user API validation | Ensure newly created HRMS users receive roles that match navigation and permission rules | Good |
| Upgrade existing `salary_components` table in Phase 5 instead of replacing it | Phase 1 metadata governance already owns `salary_components.key`; Phase 5 adds operational columns while preserving metadata lineage | Good |
| Treat Git status as unreliable for phase completion | `HRMS-main` is untracked from parent repo, so commits cannot prove progress | Pending |

---
*Last updated: 2026-05-15 after Phase 5 payroll verification and live migration.*
