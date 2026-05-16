# Phase 8 Plan: Employee Self-Service Portal

GSD entrypoint: `$gsd-execute-phase 8`

## Ownership

Bob coordinates integration, migration application, build, browser verification, and planning docs.

Anish lane:
- `metadata/**`
- `lib/generated/**`
- `supabase/generated/metadata_seed.sql`
- `supabase/migrations/20260515210000_employee_self_service.sql`
- `tests/metadata/registry-contract.test.ts`
- `tests/self-service/self-service-sql.test.ts`
- `package.json` only for `test:self-service`
- `.planning/team-context/anish.md`

Trisha lane:
- `lib/hrms/self-service.ts`
- `lib/hrms/self-service-authorization.ts`
- `app/api/hrms/self-service/**`
- `tests/self-service/self-service-utils.test.ts`
- `tests/self-service/self-service-api-contract.test.ts`
- `package.json` only if `test:self-service` is missing

Tannu lane:
- `app/(app)/self-service/**`
- `lib/nav/config.ts` only for self-service route enablement
- `tests/self-service/self-service-ui-contract.test.ts`

## Implementation Checklist

- [x] Create Phase 8 planning artifacts.
- [x] Register Phase 8 self-service permissions, routes, forms, workflow, and lineage.
- [x] Generate metadata artifacts and metadata seed SQL.
- [x] Add `employee_notifications` migration with helper-backed RLS and operation-specific policies.
- [x] Add self-service helper and authorization utilities.
- [x] Add self-service summary and notification API routes.
- [x] Add self-service overview and notifications pages.
- [x] Enable self-service navigation for employee role after routes and tests exist.
- [x] Add SQL, API, UI, metadata, and nav contract tests.
- [x] Run metadata and self-service verification.
- [x] Run build, apply migration, restart dev server, and browser-check CSS on Phase 8 dev target.
- [x] Update planning docs and team logs.

## Verification Snapshot

- `npm.cmd run metadata:validate` - passed.
- `npm.cmd run metadata:generate` - passed.
- `npm.cmd run metadata:lineage` - passed, no issues.
- `npm.cmd run metadata:check-hardcoding` - passed.
- `npm.cmd run test:metadata` - passed, 22/22.
- `npm.cmd run test:self-service` - passed, 13/13.
- `npm.cmd run test:nav` - passed, 6/6.
- `npm.cmd run build` - passed.
- `supabase db push` - applied `20260515210000_employee_self_service.sql`.
- `supabase migration list` - confirmed local/remote parity through `20260515210000`.
- `localhost:3000/login` - returned 200 after clean `.next` restart; `/_next/static/css/app/layout.css` returned 200 with content.

## Out of Scope

- Phase 9 reports/dashboards.
- Scheduled notification automations.
- Mobile app.
- Rewriting existing attendance, leave, payroll, performance, lifecycle, or expense pages.
