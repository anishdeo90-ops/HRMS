# Phase 8 Context: Employee Self-Service Portal

## Goal

Give employees a simplified HRMS entry point for their own profile, attendance, leave, expenses, salary slips, tax/benefits, lifecycle items, performance items, and notifications without weakening existing HR/admin workflows.

## Scope

- Add governed self-service metadata for permissions, routes, forms, workflow states, and lineage.
- Add a small self-service notification foundation with fail-closed RLS.
- Add employee-only self-service routes:
  - `/self-service`
  - `/self-service/notifications`
- Add API endpoints that aggregate existing self-service-safe domain routes and expose employee notifications.
- Keep Phase 9 reporting, dashboards, scheduled automation, and broad notification automation out of scope.

## Brownfield Constraints

- Preserve ATS routes and existing HRMS domain routes.
- Reuse existing employee, attendance, leave, expense, payroll, performance, and lifecycle access controls.
- Do not expose team/admin records through employee self-service APIs.
- Keep self-service navigation visible to employees without removing existing domain links.
- Add live migration only after tests/build pass and Bob confirms project state.

## Verification Expectations

- Metadata validation, generation, lineage, hardcoding checks, and metadata tests pass.
- Self-service SQL/API/UI contract tests pass.
- Nav tests reflect enabled Phase 8 self-service routes.
- Build passes.
- Browser verification should use `agent-browser.cmd` on `localhost:3001` after any build-triggered `.next` cleanup.
