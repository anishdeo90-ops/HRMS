# Phase 5 Context: Payroll, Salary, Tax, and Benefits

## Goal

Upgrade HireRabbits from ATS/HR operations into payroll-grade salary operations without weakening existing candidate CTC and offer workflows.

## User Outcome

Payroll managers and HR can define salary components, assign employee salary structures, prepare payroll periods, review payroll entries, generate salary slips, and track employee tax and benefit declarations. Employees can view their own salary slips and declarations only.

## Scope

### In Scope

- Salary components and salary structures.
- Salary structure assignments to employees.
- Payroll periods and payroll entries.
- Salary slips and salary slip lines.
- Additional salaries, incentives, and withholdings.
- Income tax slabs and employee tax exemption declarations.
- Employee benefit applications and claims.
- Gratuity rules.
- Payroll navigation enabled only after routes exist and tests pass.
- Metadata lineage for every new payroll route, permission, form, workflow state, approval rule, and report.
- Tests for metadata, SQL/RLS contracts, helpers, APIs, route access, and UI source contracts.

### Out of Scope

- Bank file generation.
- Accounting/ERP journal posting.
- Statutory filing submission.
- Payment gateway or payroll disbursement.
- Replacing ATS candidate CTC/offer workflows.

## Existing Patterns to Follow

- Metadata source YAML lives under `metadata/` and is generated with `npm.cmd run metadata:generate`.
- SQL migrations include RLS and helper functions in the same migration.
- HRMS helpers live under `lib/hrms/`.
- HRMS API routes live under `app/api/hrms/...`.
- Sidebar visibility is centralized in `lib/nav/config.ts`.
- Settings role options must render from central `ROLES` in `lib/types.ts`.
- Use `agent-browser.cmd` for local browser verification before adding Playwright.

## Roles and Scopes

- Admin and HR manager: full payroll access.
- Payroll manager: payroll operations, salary slips, tax and benefits, payroll reports.
- HR user: limited people/time/finance access; no broad payroll management unless explicitly granted in metadata.
- Employee: own salary slips, own tax declarations, own benefit claims only.
- Recruiter, HOD, leave approver, expense approver, interviewer: no payroll navigation by default.

## Data Model

Required Phase 5 tables:

- `salary_components`
- `salary_structures`
- `salary_structure_details`
- `salary_structure_assignments`
- `payroll_periods`
- `payroll_entries`
- `salary_slips`
- `salary_slip_lines`
- `additional_salaries`
- `employee_incentives`
- `salary_withholdings`
- `income_tax_slabs`
- `employee_tax_exemption_declarations`
- `employee_benefit_applications`
- `employee_benefit_claims`
- `gratuity_rules`

## Verification Targets

- `npm.cmd run test:metadata`
- `npm.cmd run test:payroll`
- `npm.cmd run test:nav`
- `npm.cmd run build`
- Browser check with `agent-browser.cmd` for `/payroll`, `/payroll/salary-structures`, `/payroll/runs`, `/payroll/salary-slips`, and `/payroll/tax-benefits`.

