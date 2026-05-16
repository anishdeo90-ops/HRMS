# Phase 8 UI Spec: Employee Self-Service Portal

## Routes

- `/self-service`
  - Employee-focused overview with compact status cards.
  - Links to profile, attendance, leave, expense claims, salary slips, tax/benefits, performance, lifecycle, grievances, training, and notifications.
  - Uses existing domain routes for detailed actions.
- `/self-service/notifications`
  - Employee notification inbox with unread/read/archive actions.

## Navigation

- Add a `Self Service` sidebar item for `employee`.
- Add a `Notifications` sidebar item for `employee`.
- Do not remove existing employee-visible domain routes in Phase 8.

## Page Behavior

- Load `/api/hrms/self-service/summary` for overview counts and target links.
- Load `/api/hrms/self-service/notifications` for notification rows.
- Empty states must be usable without seed data.
- Avoid marketing copy and keep the surface operational.

## Access

- Employee can only see their own self-service summary and own notifications.
- Admin/HR can manage notification records through API permissions where needed, but the UI route is employee-oriented.
