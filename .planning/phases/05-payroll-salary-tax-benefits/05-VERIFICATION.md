# Phase 5 Verification: Payroll, Salary, Tax, and Benefits

## Commands

- `npm.cmd run test:metadata`
  - Passed 19/19.
- `npm.cmd run test:payroll`
  - Passed 31/31.
- `npm.cmd run test:nav`
  - Passed 6/6.
- `npm.cmd run build`
  - Passed after removing stale `.next` and rebuilding.
- `supabase migration list`
  - Local and remote both include `20260515130000`.
- `supabase db push`
  - Applied `20260515130000_payroll_salary_tax_benefits.sql`.

## Browser Verification

Signed-in browser session: `hrms-phase4`.

Checked routes:

- `/payroll`
- `/payroll/salary-structures`
- `/payroll/runs`
- `/payroll/salary-slips`
- `/payroll/tax-benefits`

Results:

- Each route rendered signed in.
- CSS loaded with 1812-1821 rules.
- Page headings rendered at `20px`.
- No schema-cache errors.
- No ambiguous relationship errors.
- No login redirect.

## Migration Issue Resolved

Initial remote push failed because `salary_components` already existed from Phase 1 metadata governance and did not have an `id` column. The Phase 5 migration was patched to upgrade the existing table with operational payroll columns and a unique `id`, preserving the original metadata `key` primary key.

## Payroll Period API Issue Resolved

User reported a payroll toast saying `column payroll_periods.period_start does not exist`.

Fix:

- Updated `app/api/hrms/payroll/periods/route.ts` to query the live schema columns `start_date` and `end_date`.
- Updated `normalizePayrollPeriodPayload` to accept old aliases such as `period_start`, `period_end`, and `year`, but write only `start_date`, `end_date`, and `fiscal_year`.
- Added a payroll API contract test preventing `period_start` and `period_end` queries in the periods route.

Verification:

- `npm.cmd run test:payroll` passed 32/32.
- `npm.cmd run test:nav` passed 6/6.
- `npm.cmd run build` passed.
- Restarted dev server on `localhost:3001` after build.
- Browser/API check showed `/api/hrms/payroll/periods` and `/api/hrms/payroll/runs` return HTTP 200, and `/payroll` rendered with CSS loaded and no visible `period_start` error.
