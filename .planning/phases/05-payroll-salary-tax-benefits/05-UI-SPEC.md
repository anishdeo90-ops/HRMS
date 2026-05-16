# Phase 5 UI Spec: Payroll, Salary, Tax, and Benefits

## Product Frame

Payroll is a controlled internal HRMS workflow. The UI should be dense, calm, and operational, matching the existing dashboard and finance pages. Do not build a marketing page.

## Navigation

Enable the existing payroll entries in `lib/nav/config.ts` only after the corresponding routes exist:

- `/payroll` - payroll overview
- `/payroll/salary-structures` - salary components, structures, and employee assignments
- `/payroll/runs` - payroll periods and payroll entries
- `/payroll/salary-slips` - generated slips and employee own-slip view
- `/payroll/tax-benefits` - tax slabs, declarations, benefits, and claims

Do not show payroll routes to recruiter, HOD, leave approver, expense approver, or interviewer roles. Employee access is own salary slips and own declaration surfaces only.

## Page Contracts

### `/payroll`

Purpose: Payroll overview and readiness queue.

Required sections:

- Compact KPI strip: active salary structures, open payroll periods, draft payroll entries, generated slips.
- Payroll period table.
- Pending payroll actions.
- Quick links to structures, runs, salary slips, and tax/benefits.

### `/payroll/salary-structures`

Purpose: Configure salary components, structures, and assignments.

Required controls:

- Salary component list with earning/deduction/statutory flags.
- Salary structure form.
- Structure detail rows with amount/formula fields.
- Employee assignment table with effective dates.

### `/payroll/runs`

Purpose: Prepare and review payroll periods and entries.

Required controls:

- Payroll period form with month/year/date range.
- Payroll entry table with gross, deductions, net pay, and status.
- Status actions for draft, submitted, approved, locked, cancelled where authorized.

### `/payroll/salary-slips`

Purpose: Review generated salary slips.

Required controls:

- Salary slip table with employee, period, gross, deductions, net, and status.
- Slip line preview.
- Employee-safe own-slip state.

### `/payroll/tax-benefits`

Purpose: Track tax slabs, declarations, benefits, and claims.

Required controls:

- Income tax slab table.
- Employee declaration table.
- Benefit application and claim tables.
- Review controls for authorized payroll/HR roles.

## Visual Rules

- Use compact page headers, KPI strips, tables, inline forms, tabs, and restrained Tailwind styling.
- Keep cards only for repeated summaries or form panels; do not nest cards.
- Use lucide icons for navigation and clear action buttons.
- Keep text sizes appropriate for operational pages.

