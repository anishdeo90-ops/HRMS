# Phase 6 Context: Performance Management

## Goal

Add governed performance management for goals, KRAs, appraisal cycles, appraisals, and feedback without disrupting existing ATS, employee core, payroll, leave, attendance, or finance workflows.

## User Outcome

HR and managers can define performance goals and KRAs, configure appraisal templates, run appraisal cycles, collect employee and manager feedback, and review appraisal outcomes. Employees can view and update their own assigned goals and submit self-feedback where allowed.

## Scope

### In Scope

- Goals and KRAs.
- Appraisal templates and template goal weighting.
- Appraisal cycles.
- Employee appraisals and appraisal goal scores.
- Employee performance feedback.
- Feedback criteria and feedback ratings.
- Performance navigation enabled only after routes exist and tests pass.
- Metadata lineage for every new performance route, permission, form, workflow state, approval rule, and report.
- Tests for metadata, SQL/RLS contracts, helpers, APIs, route access, and UI source contracts.

### Out of Scope

- Compensation revisions from appraisal outcomes.
- Payroll bonus posting.
- Training recommendations and lifecycle actions.
- Anonymous 360-degree feedback.
- External performance integrations.
- Replacing ATS interview feedback workflows.

## Existing Patterns to Follow

- Metadata source YAML lives under `metadata/` and is generated with `npm.cmd run metadata:generate`.
- SQL migrations include RLS and helper functions in the same migration.
- HRMS helpers live under `lib/hrms/`.
- HRMS API routes live under `app/api/hrms/...`.
- Sidebar visibility is centralized in `lib/nav/config.ts`.
- Future routes stay disabled until route, tests, and browser verification pass.
- Use `agent-browser.cmd` for local browser verification before adding Playwright.

## Roles and Scopes

- Admin and HR manager: full performance setup, cycle, appraisal, and feedback access.
- HR user: operational performance setup and review access where metadata grants it.
- HOD: team goal and appraisal review access for assigned/reporting employees.
- Employee: own goals, own appraisals, and own feedback only.
- Recruiter, payroll manager, leave approver, expense approver, and interviewer: no performance navigation by default unless explicitly granted later.

## Data Model

Required Phase 6 tables:

- `performance_goals`
- `performance_kras`
- `appraisal_templates`
- `appraisal_template_goals`
- `appraisal_cycles`
- `appraisals`
- `appraisal_goals`
- `employee_performance_feedback`
- `employee_feedback_criteria`
- `employee_feedback_ratings`

## Verification Targets

- `npm.cmd run test:metadata`
- `npm.cmd run test:performance`
- `npm.cmd run test:nav`
- `npm.cmd run build`
- Browser check with `agent-browser.cmd` for `/performance`, `/performance/goals`, `/performance/appraisals`, and `/performance/feedback`.
