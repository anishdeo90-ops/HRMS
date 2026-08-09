# HRMS — Team Calendar

Captured: 2026-08-08 · batch 1
Reached from: Dashboard → action row → `📅 Team Calendar`

---

## 1. Reference behaviour (as observed)

Plain month grid. No events present in the captured tenant.

| Control | Observed |
|---|---|
| Year | dropdown, `2026` |
| Month | dropdown, `Aug` |
| View | toggle `Month` \| `Year` — `Month` active |

Grid:
- Week starts **Sunday** (`Su Mo Tu We Th Fr Sa`)
- Leading/trailing days from adjacent months shown greyed and non-interactive-looking
- **Today** (`08`) highlighted with a pale blue cell fill
- Hovering a cell shows a tooltip with the **ISO date** (`2026-07-26`)
- An empty grey bar sits above the filter row — purpose unclear, possibly a
  legend or title that is blank in this tenant ⬜

> **Inconsistency to fix in ours:** the tooltip uses `YYYY-MM-DD` while every
> other screen renders `DD-MM-YYYY`. Pick one display format and hold it.

---

## 2. Planned deviation — unified organisation calendar

**Decision (Anish, 2026-08-08):** we do not copy the reference's bare month grid.
The calendar becomes the single scheduling surface for the whole organisation —
HR meetings, manager 1:1s, interviews, and every dated HR event in one place,
with filters so each role sees a useful slice.

This turns a display widget into a real subsystem, so it needs a proper model.

---

## 3. The modelling rule that matters

Calendar events fall into two kinds, and **conflating them is the classic
calendar mistake** — it produces duplicated rows that drift out of sync with
their source.

### Derived events — never stored in the calendar
Computed on read from the table that owns them. The calendar is a *view*, not a copy.

| Event | Owning source |
|---|---|
| Public holidays | Holiday Calendar master |
| Birthdays | `employees.date_of_birth` |
| Work anniversaries | `employees.date_of_joining` |
| Approved leave | leave applications |
| Shift / roster assignments | roster |
| Probation end, contract end | employee record |
| Performance cycle milestones | performance cycles |
| Onboarding / offboarding task due dates | onboarding tasks |
| **Interviews** | **ATS** — cross-product read |

If an employee's leave is cancelled, it must vanish from the calendar with no
calendar-side write. That only holds if it was never written there.

### First-class events — stored, because nothing else owns them
A meeting a person schedules has no other home. This is the only thing the
calendar module actually owns:

```
calendar_events
  id, org_id
  title, description
  starts_at, ends_at, all_day
  location, meeting_url
  visibility        'public' | 'department' | 'private'
  created_by        → employees.id
  branch_id, department_id      -- optional scoping for filters
  recurrence_rule   -- RFC 5545 RRULE, nullable

calendar_event_attendees
  event_id → calendar_events.id
  employee_id → employees.id
  response  'pending' | 'accepted' | 'declined'
```

Read path: `UNION` the derived sources with `calendar_events`, normalised to a
common shape (`date`, `type`, `title`, `subject_employee_id`, `source_ref`).
Best served by a single Postgres view or one API endpoint that composes them.

---

## 4. Filters required

Driven by the "so all can schedule on one calendar" goal — without filters a
shared calendar becomes unreadable at any real headcount.

| Filter | Values |
|---|---|
| Scope | My events · My team · Department · Branch · Whole org |
| Event type | Meeting · Interview · Leave · Holiday · Birthday · Anniversary · Onboarding · Review · Shift |
| Branch | FK → Branch master |
| Department | FK → Department master |
| Employee | typeahead → employees |

Event type should be colour-coded in the grid, and the type filter should be a
multi-select chip row rather than a dropdown — users toggle two or three types on.

---

## 5. Visibility rules — decide before building

A shared calendar leaks personal information if it is naive. Minimum ruleset:

| Event type | Who can see it |
|---|---|
| Holidays, birthdays, anniversaries | Everyone |
| Approved leave | Manager chain + HR; peers see "Away", not the leave type |
| Interviews | Panel members + HR + hiring manager only |
| Meetings marked `private` | Creator + attendees only |
| Shifts / roster | Employee + their manager chain + HR |

**Leave type must never be visible org-wide.** Sick leave is health information.
Peers see availability; they do not see the reason.

---

## 6. Cross-product linkage

The calendar is the **second** confirmed cross-product read surface after the
dashboard:

| Source | Product | Direction |
|---|---|---|
| Interview schedules | **ATS** | HRMS reads ATS |
| Candidate joining dates | **ATS** | HRMS reads ATS |
| Payroll cut-off / payday markers | **Payroll** | HRMS reads Payroll |

All three resolve through the `entity_links` layer rather than direct FKs across
product boundaries.

---

## 7. Open questions

1. **Year view** — what does it render? Heatmap of event density, or 12 mini-months? ⬜ not captured
2. Can a non-manager create an event, or is scheduling restricted to HR/managers?
3. Do we need external calendar sync (Google Calendar) — given the ATS already
   holds Google integration credentials, this is cheaper here than it would be elsewhere.
4. Room / resource booking — in scope or not?

---

## 8. Not yet captured

- ⬜ Year view
- ⬜ A populated month with real events
- ⬜ Day/event detail popover
- ⬜ Create-event form (if one exists in the reference)
