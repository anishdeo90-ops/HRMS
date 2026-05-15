# Phase 4 Context: Expenses, Advances, and Travel

## Goal

Add employee expense workflows without introducing payroll posting or weakening existing ATS behavior.

## User Outcome

Employees can submit expenses, advances, travel requests, and vehicle expenses. HR, finance, managers, and department approvers can review the right records through scoped permissions. Admins can configure claim types and view audit-friendly finance records.

## Scope

### In Scope

- Expense claim types.
- Expense claims and line items.
- Private expense attachments.
- Employee advances and settlement state.
- Travel requests and itinerary rows.
- Vehicle logs and vehicle service expenses.
- Approval workflow for submitted expense, advance, and travel records.
- Finance/Expenses sidebar section for authorized roles.
- Metadata lineage for every new Phase 4 route, permission, form, workflow state, approval rule, and report.
- Tests for metadata, SQL/RLS contracts, helpers, APIs, route access, and UI source contracts.

### Out of Scope

- Payroll posting, salary slip impact, or accounting journal creation.
- Payment gateway or bank file generation.
- Multi-currency settlement.
- OCR receipt extraction.
- Native mobile receipt capture.

## Existing Patterns to Follow

- Metadata source YAML lives under `metadata/` and is generated with `npm.cmd run metadata:generate`.
- SQL migrations include RLS and helper functions in the same file.
- HRMS pure helpers live under `lib/hrms/`.
- HRMS API routes live under `app/api/hrms/...`.
- Route visibility is centralized in `lib/hrms/route-access.ts` and `components/sidebar.tsx`.
- Existing operational UI style uses compact tables, inline forms, tab-like controls, and restrained Tailwind styling.

## Roles and Scopes

- Employee: create and view own claims, advances, travel requests, and vehicle logs.
- Reporting manager: review submitted records for direct reports.
- Department approver: review scoped department records for `expense_claim`, `employee_advance`, and `travel_request`.
- HR manager: manage HRMS finance records when HR policy requires it.
- Finance manager or admin: manage expense configuration, view all finance records, and make final decisions.
- Recruiter/HOD without scoped approval: no new finance navigation.

## Data Model

Required tables:

- `expense_claim_types`
- `expense_claims`
- `expense_claim_items`
- `employee_advances`
- `travel_requests`
- `travel_itineraries`
- `vehicle_logs`
- `vehicle_services`

Attachment handling:

- Use a private Supabase storage bucket such as `expense-attachments`.
- Store sanitized paths with employee and record IDs.
- API returns signed URLs only after access checks.

## Verification Targets

- `npm.cmd run test:metadata`
- `npm.cmd run test:expenses`
- `npm.cmd run build`
- Browser check with `agent-browser.cmd` after frontend implementation.

## Open Questions Deferred to Execution

- Whether to name the sidebar group `Finance` or `Expenses`; default plan uses `Finance`.
- Whether vehicle services should live under `/vehicles` or `/expenses/vehicles`; default plan uses `/vehicles` to match the build plan.
