# Phase 6 UI Spec: Performance Management

## Product Frame

Performance management is an internal HRMS workflow for repeated review cycles. The UI should be operational, compact, and consistent with the existing HRMS pages. Do not build a landing page.

## Navigation

Enable performance entries in `lib/nav/config.ts` only after the corresponding routes exist:

- `/performance` - performance overview
- `/performance/goals` - goals and KRAs
- `/performance/appraisals` - appraisal templates, cycles, and appraisals
- `/performance/feedback` - feedback criteria and ratings

Do not show performance routes to recruiter, payroll manager, leave approver, expense approver, or interviewer roles by default. Employee access must stay scoped to own goals, own appraisals, and own feedback surfaces.

## Page Contracts

### `/performance`

Purpose: Performance overview and cycle readiness.

Required sections:

- Compact KPI strip: active goals, open cycles, pending appraisals, feedback due.
- Current appraisal cycle table.
- Pending performance actions.
- Quick links to goals, appraisals, and feedback.

### `/performance/goals`

Purpose: Manage goals and KRAs.

Required controls:

- Goal list with owner, period, status, progress, and weight.
- Goal form with title, dates, owner, status, and measurable target fields.
- KRA table with category, description, expected outcome, and weight.
- Employee-safe own-goal view state.

### `/performance/appraisals`

Purpose: Configure templates and run appraisal cycles.

Required controls:

- Appraisal template list with scoring scale and active state.
- Template goal-weight table.
- Appraisal cycle form with period and review dates.
- Appraisal table with employee, cycle, status, total score, and reviewer.

### `/performance/feedback`

Purpose: Collect and review feedback.

Required controls:

- Feedback criteria table.
- Feedback rating table with employee, reviewer, criteria, rating, and comments.
- Self-feedback and manager-feedback sections.
- Review controls for authorized HR/manager roles.

## Visual Rules

- Use compact headers, KPI strips, tables, inline forms, tabs, and restrained Tailwind styling.
- Cards are acceptable for repeated summaries or form panels only; do not nest cards.
- Use lucide icons where actions need icons.
- Keep tables readable at desktop and avoid text overlap on small screens.
