# Phase 10 UI Spec: Recruitment Unification

## Routes

- `/recruitment`
  - HRMS recruitment overview that summarizes job openings/requisitions, applicants, interviews, offers, and onboarding handoffs.
  - Link through to existing ATS screens for detailed work: `/jobs`, `/candidates`, `/hod-portal`, and `/jds`.
  - Use HRMS terminology beside familiar ATS labels where helpful, for example "Applicants / Candidates" and "Openings / Jobs".
- `/recruitment/appointments`
  - Appointment letter templates and issued appointment-letter status.
  - Link records back to existing candidate offer details where available.

## Navigation

- Keep the existing Recruiting section.
- Existing ATS links stay enabled and reachable.
- Add Phase 10 recruitment entries only after route files and tests exist:
  - `Recruitment` -> `/recruitment`
  - `Appointments` -> `/recruitment/appointments`
- Keep Recruiting visible to `admin`, `hr_manager`, `hr_user`, and `recruiter`; keep HOD access limited to HOD-relevant request/opening surfaces.
- Do not add one-off sidebar JSX links.

## Page Behavior

- Use `/api/hrms/recruitment` for overview data.
- Use `/api/hrms/recruitment/appointments` for appointment templates and issued letters.
- Use `/api/hrms/recruitment/handoffs` for candidate-to-employee handoff tracking.
- Empty states must render cleanly without seed data.
- Avoid marketing copy; this is an operational HR/recruiting surface.

## Access

- Admin and HR manager can manage recruitment unification metadata-backed workflows.
- HR users and recruiters can view/manage recruitment work according to recruitment permissions.
- HOD users can see requisition/staffing-plan context when explicitly allowed.
- Employee, payroll, finance, leave, expense, and interviewer roles should not gain broad recruitment access unless already allowed by existing ATS behavior.
