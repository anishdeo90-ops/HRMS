# Phase 3 Summary: Leave Management

**Status:** Complete
**Recovered:** 2026-05-13

## Delivered

- Migration: `supabase/migrations/20260511190000_leave_management.sql`.
- Leave helpers:
  - `lib/hrms/leave.ts`
  - `lib/hrms/leave-authorization.ts`
- APIs:
  - `app/api/hrms/leave/setup/route.ts`
  - `app/api/hrms/leave/applications/route.ts`
  - `app/api/hrms/leave/applications/[id]/route.ts`
  - `app/api/hrms/leave/approvals/route.ts`
  - `app/api/hrms/leave/balances/route.ts`
  - `app/api/hrms/leave/ledger/route.ts`
  - `app/api/hrms/leave/compensatory/route.ts`
  - `app/api/hrms/leave/encashments/route.ts`
- Metadata:
  - `metadata/leave/leave_types.yaml`
  - `metadata/leave/leave_policies.example.yaml`
  - `metadata/imports/leave_import_aliases.yaml`
  - `metadata/reports/leave_balance.yaml`

## Verification

Command:

```text
npm.cmd run test:leave
```

Result:

```text
17 tests passed, 0 failed
```

## Notes

- Ledger append behavior is kept out of public direct mutation routes and handled through decision flows.
- Leave access is scoped through self, manager, department approver, HR, and admin permissions.
