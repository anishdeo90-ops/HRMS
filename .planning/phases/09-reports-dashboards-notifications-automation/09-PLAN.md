# Phase 9 Plan: Reports, Dashboards, Notifications, Automation

GSD entrypoint: `$gsd-execute-phase 9`

## Ownership

Bob coordinates integration, migration application, build, browser verification, and planning docs.

Anish lane:
- `metadata/**`
- `lib/generated/**`
- `supabase/generated/metadata_seed.sql`
- `supabase/migrations/20260516000000_hrms_reports_dashboards_automation.sql`
- `tests/metadata/registry-contract.test.ts`
- `tests/reports/reports-sql.test.ts`
- `package.json` only for `test:reports`
- `.planning/team-context/anish.md`

Trisha lane:
- `lib/hrms/reports.ts`
- `lib/hrms/reports-authorization.ts`
- `lib/hrms/automation.ts`
- `app/api/hrms/reports/**`
- `app/api/hrms/dashboards/**`
- `app/api/hrms/automation/**`
- `tests/reports/reports-utils.test.ts`
- `tests/reports/reports-authorization.test.ts`
- `tests/reports/reports-api-contract.test.ts`
- `package.json` only if `test:reports` is missing
- `.planning/team-context/trisha.md`

Tannu lane:
- `app/(app)/reports/**`
- `lib/nav/config.ts` only for Phase 9 reports route enablement after routes exist
- `tests/reports/reports-ui-contract.test.ts`
- `tests/nav/nav-config.test.ts` only if Bob explicitly assigns the nav expectation update
- `.planning/team-context/Tannu.md`

## Implementation Checklist

- [x] Contact existing team tmux sessions before Phase 9 start.
- [x] Create Phase 9 planning artifacts.
- [x] Register Phase 9 report, dashboard, notification, automation, route, permission, workflow, and lineage metadata.
- [x] Generate metadata artifacts and metadata seed SQL.
- [x] Add Phase 9 report/dashboard/automation migration with helper-backed RLS.
- [x] Add report, dashboard, and automation helper/authorization utilities.
- [x] Add HRMS report, dashboard, notification-rule, and automation-rule API routes.
- [x] Add reports and dashboards UI routes.
- [x] Enable reports navigation for authorized roles after routes and tests exist.
- [x] Add SQL, API, UI, metadata, and nav contract tests.
- [x] Run metadata and reports verification.
- [x] Run build, apply migration, restart dev server, and browser-check Phase 9 route guards/CSS.
- [x] Update planning docs and team logs.

## Dispatch Plan

- Anish owns governed metadata and SQL/RLS only. No APIs, UI, nav helpers, or domain helper edits.
- Trisha owns helpers, authorization, APIs, and API contracts. No metadata/generated/migration/UI/nav edits.
- Tannu owns UI and nav enablement. No metadata/generated/migration/helper/API edits.
- Bob integrates nav tests if needed, applies the live migration, and performs browser verification.

## Verification Snapshot

Completed 2026-05-15:

- `npm.cmd run metadata:validate` - passed.
- `npm.cmd run metadata:generate` - passed.
- `npm.cmd run metadata:lineage` - passed with no issues.
- `npm.cmd run metadata:check-hardcoding` - passed.
- `npm.cmd run test:metadata` - passed 23/23.
- `npm.cmd run test:reports` - passed 30/30.
- `npm.cmd run test:nav` - passed 6/6.
- `npm.cmd run build` - passed and compiled `/reports`, `/reports/dashboards`, `/api/hrms/reports`, `/api/hrms/reports/[key]`, `/api/hrms/dashboards`, and `/api/hrms/automation/**`.
- `supabase db push` - applied `20260516000000_hrms_reports_dashboards_automation.sql`.
- `supabase migration list` - local/remote parity confirmed through `20260516000000`.
- Remote smoke query confirmed all 8 Phase 9 tables exist.
- Cleaned `.next`, restarted dev server on `localhost:3001`, and verified `/_next/static/css/app/layout.css` returned HTTP 200 with content.
- Unauthenticated `/reports` and `/reports/dashboards` requests correctly redirect to `/login`; unauthenticated reports, dashboards, and automation APIs return 401.

Browser note: signed-in browser verification is still pending because `agent-browser.cmd` has no saved auth profile and all tested sessions redirect to `/login`.

## Out of Scope

- Phase 10 recruitment terminology unification.
- Replacing existing ATS follow-up automation tables or behavior.
- Accounting/ERP journal posting.
- Mobile app.
- Rewriting existing domain pages beyond linking into reports/dashboard routes.
