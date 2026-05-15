# Phase 4 Metadata Spec: Expenses, Advances, and Travel

## Required Metadata Families

### Roles

Add if absent:

- `role.expense_approver`
- `role.finance_manager`

`role.expense_approver` already exists in current metadata. If `role.finance_manager` is not present, add it with finance domain lineage.

### Permissions

Add governed keys:

- `permission.expenses.view_self`
- `permission.expenses.view_team`
- `permission.expenses.manage`
- `permission.expenses.approve`
- `permission.expense_claim_types.manage`
- `permission.employee_advances.view_self`
- `permission.employee_advances.manage`
- `permission.employee_advances.approve`
- `permission.travel_requests.view_self`
- `permission.travel_requests.manage`
- `permission.travel_requests.approve`
- `permission.vehicles.view_self`
- `permission.vehicles.manage`

### Routes

Add governed route keys:

- `route.finance.expenses`
- `route.finance.expense_claims`
- `route.finance.advances`
- `route.finance.travel`
- `route.finance.vehicles`
- `route.finance.approvals`

### Forms

Add or complete governed form schemas:

- `form.expense_claim.request`
- `form.employee_advance.request`
- `form.travel_request.request`
- `form.vehicle_log.entry`
- `form.vehicle_service.entry`

### Workflows

Add workflow states and transitions for:

- Expense claim: `draft`, `submitted`, `approved`, `rejected`, `cancelled`, `paid`
- Employee advance: `draft`, `submitted`, `approved`, `rejected`, `cancelled`, `settled`
- Travel request: `draft`, `submitted`, `approved`, `rejected`, `cancelled`, `completed`
- Vehicle service: `draft`, `submitted`, `approved`, `rejected`, `cancelled`

### Approval Rules

Add approval rules:

- `approval_rule.expense.department_head`
- `approval_rule.expense.finance_final`
- `approval_rule.advance.department_head`
- `approval_rule.advance.finance_final`
- `approval_rule.travel.department_head`
- `approval_rule.travel.finance_final`

### Reports

Add report definitions:

- `report.expenses.unpaid_claims`
- `report.expenses.advance_summary`
- `report.expenses.travel_summary`
- `report.expenses.vehicle_costs`

## Generation and Validation

Run after metadata edits:

```text
npm.cmd run metadata:validate
npm.cmd run metadata:generate
npm.cmd run metadata:lineage
npm.cmd run metadata:check-hardcoding
npm.cmd run test:metadata
```

## Lineage Requirement

Every Phase 4 metadata item must include:

- Frappe HRMS or HireRabbits HRMS source reference.
- `db_table`.
- `ts_export`.
- API route references.
- UI surface references.
- Test references.
