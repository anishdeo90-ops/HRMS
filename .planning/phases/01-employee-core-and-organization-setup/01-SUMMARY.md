# Phase 1 Summary: Employee Core and Organization Setup

**Status:** Complete
**Recovered:** 2026-05-13

## Delivered

- Migration: `supabase/migrations/20260510220000_employee_core_organization.sql`.
- Employee helpers: `lib/hrms/employee-core.ts`, `lib/hrms/employee-access.ts`, `lib/hrms/authorization.ts`.
- Employee APIs:
  - `app/api/hrms/employees/route.ts`
  - `app/api/hrms/employees/[id]/route.ts`
  - `app/api/hrms/employees/[id]/documents/route.ts`
  - `app/api/hrms/employees/from-candidate/[candidateId]/route.ts`
- Organization API: `app/api/hrms/organization/route.ts`.
- UI routes:
  - `app/(app)/people/employees/page.tsx`
  - `app/(app)/people/organization/page.tsx`
- Route visibility through `lib/hrms/route-access.ts` and `components/sidebar.tsx`.

## Verification

Command:

```text
npm.cmd run test:employee-core
```

Result:

```text
20 tests passed, 0 failed
```

## Notes

- Candidate-to-employee conversion is intentionally conservative and does not mutate candidate status unexpectedly.
- Employee documents use private storage paths and signed access.
