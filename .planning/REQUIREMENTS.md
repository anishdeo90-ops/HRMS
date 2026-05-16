# Requirements: HireRabbits ATS to HRMS Upgrade

**Defined:** 2026-05-13
**Core Value:** HireRabbits must become a governed HRMS without breaking ATS workflows that already run the business.

## v1 Requirements

### Brownfield Preservation

- [x] **ATS-01**: Existing candidate, job, JD/form, dashboard, settings, user, sync, and HOD workflows remain reachable.
- [x] **ATS-02**: Existing candidate-to-offer and CTC behavior remains isolated from new payroll-grade operations.
- [ ] **ATS-03**: Recruitment terminology can later align to HRMS terms without removing current ATS UX.

### Metadata Governance

- [x] **META-01**: Governed metadata registry exists for roles, permissions, routes, forms, reports, workflows, imports, and salary/expense concepts.
- [x] **META-02**: Metadata generation produces TypeScript constants and Supabase seed SQL.
- [x] **META-03**: Metadata hardcoding scanner and lineage report tests are present and passing.
- [x] **META-04**: Every new Phase 4 expense/advance/travel route, permission, form, workflow state, approval rule, and report is registered with lineage.
- [x] **NAV-01**: Sidebar navigation is driven by typed role-aware config with disabled future-phase routes hidden until built.
- [x] **NAV-02**: Settings user invite/edit role controls and user APIs use the central typed role list, so assigned roles follow sidebar visibility rules.

### Employee Core

- [x] **EMP-01**: HR users can manage employee master records.
- [x] **EMP-02**: HR users can manage companies, branches, departments, grades, employment types, and department approvers.
- [x] **EMP-03**: Joined candidates can be converted to employees without mutating candidate status unexpectedly.
- [x] **EMP-04**: Employee documents use private storage paths and signed access.

### Attendance and Shifts

- [x] **TIME-01**: Employees can check in and check out through append-only events.
- [x] **TIME-02**: Attendance days can be viewed and corrected through governed requests.
- [x] **TIME-03**: HR can configure shifts, locations, assignments, rosters, and shift requests.
- [x] **TIME-04**: Overtime requests exist without payroll calculations.

### Leave Management

- [x] **LEAVE-01**: HR can configure leave types, periods, policies, assignments, allocations, holiday lists, and block lists.
- [x] **LEAVE-02**: Employees can submit leave applications, compensatory leave requests, and encashment requests.
- [x] **LEAVE-03**: Managers, department approvers, and HR can approve/reject leave within scoped permissions.
- [x] **LEAVE-04**: Leave balances and ledger entries are queryable and protected by RLS.

### Expenses, Advances, and Travel

- [x] **EXP-01**: Employees can create expense claims with governed claim types, items, amounts, dates, notes, and attachments.
- [x] **EXP-02**: Managers, department approvers, finance, HR, and admins can approve/reject/cancel expense claims within scoped permissions.
- [x] **EXP-03**: Employees can request advances and record settlement state without payroll posting.
- [x] **EXP-04**: Employees can submit travel requests with itinerary rows and approval status.
- [x] **EXP-05**: Vehicle logs and vehicle services can be tracked with finance/HR visibility.
- [x] **EXP-06**: Expense pages appear under a Finance/Expenses navigation group only for authorized roles.

### Future HRMS Domains

- [x] **PAY-01**: Payroll salary components, structures, assignments, runs, salary slips, tax, and benefits are implemented with RLS.
- [x] **PERF-01**: Goals, KRAs, appraisal cycles, templates, feedback, and ratings are implemented.
- [x] **LIFE-01**: Onboarding, separation, promotion, transfer, grievances, training, and daily work summaries are implemented.
- [x] **SELF-01**: Employee self-service routes expose profile, attendance, leave, expenses, salary slips, and notifications.
- [x] **REPORT-01**: HRMS reports, dashboards, notifications, and scheduled automations are implemented.

## v2 Requirements

- **MOBILE-01**: Native mobile app for employee self-service.
- **ACCOUNTING-01**: Direct accounting/ERP journal posting from payroll or expenses.
- **BIOMETRIC-01**: Biometric attendance device ingestion.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Copying Frappe code | Reference repo is not compatible with the Next.js/Supabase architecture. |
| Rebuilding ATS from scratch | Brownfield safety requires preserving existing business workflows. |
| Payroll effects in Phase 4 | Expenses/advances/travel must not post payroll or salary slips. |
| Public unauthenticated HRMS APIs | HRMS data must remain authenticated and RLS-protected. |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ATS-01 | Phase 0 | Complete |
| ATS-02 | Phase 0 | Complete |
| ATS-03 | Phase 10 | Pending |
| META-01 | Phase 0 | Complete |
| META-02 | Phase 0 | Complete |
| META-03 | Phase 0 | Complete |
| META-04 | Phase 4 | Complete |
| NAV-01 | Pre-Phase 5 | Complete |
| NAV-02 | Pre-Phase 5 | Complete |
| EMP-01 | Phase 1 | Complete |
| EMP-02 | Phase 1 | Complete |
| EMP-03 | Phase 1 | Complete |
| EMP-04 | Phase 1 | Complete |
| TIME-01 | Phase 2 | Complete |
| TIME-02 | Phase 2 | Complete |
| TIME-03 | Phase 2 | Complete |
| TIME-04 | Phase 2 | Complete |
| LEAVE-01 | Phase 3 | Complete |
| LEAVE-02 | Phase 3 | Complete |
| LEAVE-03 | Phase 3 | Complete |
| LEAVE-04 | Phase 3 | Complete |
| EXP-01 | Phase 4 | Complete |
| EXP-02 | Phase 4 | Complete |
| EXP-03 | Phase 4 | Complete |
| EXP-04 | Phase 4 | Complete |
| EXP-05 | Phase 4 | Complete |
| EXP-06 | Phase 4 | Complete |
| PAY-01 | Phase 5 | Complete |
| PERF-01 | Phase 6 | Complete |
| LIFE-01 | Phase 7 | Complete |
| SELF-01 | Phase 8 | Complete |
| REPORT-01 | Phase 9 | Complete |

**Coverage:**
- v1 requirements: 32 total
- Mapped to phases: 32
- Unmapped: 0

---
*Requirements defined: 2026-05-13*
*Last updated: 2026-05-15 after Phase 9 live migration*
