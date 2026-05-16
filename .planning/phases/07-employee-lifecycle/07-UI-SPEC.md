# Phase 7 UI Spec: Employee Lifecycle

## Navigation

Enable only verified Phase 7 routes:

- `/lifecycle`
- `/lifecycle/onboarding`
- `/lifecycle/separation`
- `/lifecycle/promotions`
- `/lifecycle/transfers`
- `/grievances`
- `/training`

Role guidance:

- Admin and HR managers can see all Phase 7 routes.
- HR users can see operational lifecycle and training routes.
- HODs can see team lifecycle review, grievances, and training routes where scoped by authorization.
- Employees can see own onboarding/separation status, own grievances, training, and daily work summary surfaces.
- Recruiter-only, payroll-only, leave-only, expense-only, and interviewer-only roles should not receive broad lifecycle access.

## Page Contracts

### `/lifecycle`

- Lifecycle overview KPIs.
- Onboarding/separation queue.
- Promotion and transfer activity.
- Daily work summary snapshot.
- Links to all Phase 7 subroutes the current role can access.

### `/lifecycle/onboarding`

- Onboarding template list.
- Employee onboarding checklist.
- Activity status table.
- Create/update form for HR users.
- Employee-safe own onboarding state.

### `/lifecycle/separation`

- Separation template list.
- Separation request/table.
- Exit checklist and exit interview status.
- HR approval controls.
- Employee-safe own separation state.

### `/lifecycle/promotions`

- Promotion record table.
- Current/new role, department, grade, salary-reference fields.
- Approval/status controls.

### `/lifecycle/transfers`

- Transfer record table.
- From/to company, branch, department, reporting manager, effective date.
- Approval/status controls.

### `/grievances`

- Grievance type list.
- Employee grievance form/table.
- Assignment, status, resolution summary.
- Employee-safe own grievance view.

### `/training`

- Training program list.
- Training event calendar/table.
- Feedback/rating capture.
- Employee training participation view.

## Visual Rules

- Reuse the existing HRMS page pattern: compact header, refresh/action controls, KPI cards, table/form split layouts.
- Keep page sections dense and operational.
- No marketing hero or decorative section cards.
- Use `lucide-react` icons in buttons where actions need icons.
- Ensure text fits in all buttons and tables on desktop and mobile.
