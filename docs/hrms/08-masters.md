# HRMS — Email Master, Document Master, Work Hours & Shifts

Captured: 2026-08-08 · batch 8

---

## 1. Email Master — the notification catalogue

| Column | |
|---|---|
| Module | grouping — `Leave Application`, `Separation`, … |
| Name | the event |
| CC | `N/A` on all rows |
| BCC | `N/A` on all rows |
| Send Email | toggle, **all ON** |
| Actions | ✏ edit (presumably the template body) |

### Rows observed
| Module | Name |
|---|---|
| Leave Application | Apply For Leave Application |
| Leave Application | Approval Or Rejection Of Leave Application |
| Leave Application | Approval Or Rejection Of Leave Application By Admin |
| Leave Application | Pending Tasks Mail |
| Separation | Apply For Separation |
| Separation | Separation Rejected |
| Separation | Separation Accepted |
| Separation | Separation Cancelled |

*(more below fold ⬜)*

### Reading

**This is not a free-form template library — it's a fixed catalogue of system
events**, seeded by the product, one row per thing that can trigger an email. HR
can toggle each on/off and set CC/BCC recipients, but cannot invent a new event.

```sql
notification_events                -- seeded, not user-created
  key text pk,                     -- 'leave.applied', 'separation.accepted'
  module text, name text,
  default_subject, default_body

org_notification_settings
  org_id fk, event_key fk,
  is_enabled bool default true,
  cc  text[],  bcc text[],
  subject text, body text,         -- org override; NULL = use default
  primary key (org_id, event_key)
```

**Two design points:**

1. **Every approval transition has a matching event.** Applied / approved /
   rejected / cancelled, for each request type. That maps one-to-one onto the
   approval engine's state changes (`10-foundation-spec.md §5`), so notifications
   should be **driven off `entity_events`**, not fired ad hoc from controllers.
   One dispatcher reading the event stream; no email logic scattered through
   request handlers.
2. `Pending Tasks Mail` is a **digest**, not a per-event mail — it needs a schedule.
   That's what `Settings → Cron Master` is for.

`CC`/`BCC` reading `N/A` rather than empty is the same null-rendering inconsistency
noted elsewhere. Ours: `—`.

---

## 2. Document Master — ⚠ correction to an earlier note

Buttons: `Add Fields for Document` · `+ Add Document`

Their own empty-state text is explicit:

> *"No document templates configured yet. … These templates will be used during
> employee onboarding and can be generated from the employee documents section."*

| Column |
|---|
| Document Name · **Dynamic Variables** · Actions |

### ⚠ Correction

`05-employee-record.md §5A` previously stated that the employee document
**checklist** (Aadhar Card, Pan Card, Electricity Bill, …) is seeded from
Document Master. **That is wrong.**

Document Master holds **document templates for generation** — the source for the
`Generate Documents` button (offer letters, appointment letters), with merge
fields. It is the *output* side, not the *collection* side.

So there are **two separate concerns**, and we need both:

```sql
-- OUTPUT: generated documents (Document Master)
document_templates
  id, org_id, name, body_html,
  variables jsonb          -- merge fields; "Add Fields for Document"
document_template_fields   -- the catalogue of available variables
  key text, label text, source_path text   -- e.g. employee.designation.name

-- INPUT: the required-documents checklist  (source ⬜ UNKNOWN)
document_types
  id, org_id, name, is_mandatory, has_expiry, sort_order
employee_documents
  employee_id, document_type_id, file_url, status, expiry_date, comments
```

✅ **RESOLVED 2026-08-10 — it is the Onboarding Form Master.** Each document is a
predefined field on the onboarding form with its own toggle, and the toggle is what
makes it required. See `14-onboarding.md §2.2`, which also flags that
experienced-only applicability is encoded in the field *label* (`(exp. only)`)
rather than as data.

**`Dynamic Variables` is the important half.** A template referencing
`{{employee.designation.name}}` resolved at generation time is exactly the
anti-hardcoding rule applied to documents — the letter can't drift from the record.

---

## 3. Work Hours & Shifts — the attendance engine config

Master-detail layout. Left: searchable shift list + `Create New Shift`.
Right: selected shift, tabs **`General Settings`** (captured) · `Advanced Settings` ⬜

### Shifts defined in this tenant
| Shift | Timing |
|---|---|
| General Shift | 09:00 — 18:00 |
| Morning Shift | 08:00 — 17:00 |
| Evening Shift | 10:00 — 19:00 |

`Morning Shift` is the one assigned to Sanjay Gupta (`05-employee-record.md §5`).

### General Settings — `General Shift`

| Section | Field | Value |
|---|---|---|
| | Rule Name | `General Shift` |
| | Description | `--` |
| | Shift Code | `--` |
| **Shift Timings** | Start → End | `09:00 → 18:00` |
| | Half Day Working Hours | `--` |
| | Required Working Hours | `--` |
| | **Attendance Mode** | **`Strict Shift Timing`** |
| **Check-In / Out Windows** | Check-In Start | `--` |
| | Check-In End | `--` |
| | Check-Out Start | `--` |
| | Check-Out End | `--` |
| **Attendance Digest Email** | Enabled | `No` |
| **Strict In Time Mode** | Enabled | `No` |
| **Penalty Rules** | Enabled | `No` |
| **Breaks** | Number of Breaks | `0` |

### 3.1 This answers three earlier inferences

**Penalty rules are configured per shift, not globally.** The `Penalty Rules`
toggle sits inside a shift definition. So the engine behind `Penalty Violation
Report` / `Penalty Summary Report` (`02-team.md §3`) is parameterised by which
shift the employee is on — night shift can carry different grace than general shift.

**Check-in/out windows explain `Punch Rejection Report`.** A punch outside the
valid window is *rejected*, not merely late. That's a distinct outcome from a
penalty, which is why it has its own report.

**`Attendance Mode: Strict Shift Timing` implies other modes.** Almost certainly a
flexible/total-hours mode where only `Required Working Hours` matters and start
time is free. ⬜ Open the dropdown to get the full set — it changes whether the
day-register computation branches.

### 3.2 Model

```sql
shifts
  id, org_id, name, code, description,
  start_time, end_time,
  required_working_minutes, half_day_working_minutes,
  attendance_mode text,            -- 'strict_shift_timing' | ⬜ others
  checkin_start, checkin_end, checkout_start, checkout_end,
  strict_in_time bool,
  digest_email_enabled bool,
  penalty_rules_enabled bool,
  is_active bool

shift_breaks
  shift_id fk, seq int, start_time, end_time, is_paid bool

shift_penalty_rules              -- ⬜ shape from Advanced Settings
  shift_id fk, trigger text,     -- 'late_in' | 'early_out' | 'short_hours'
  threshold_minutes int, occurrences int, period text,
  consequence text,              -- 'warning' | 'half_day_lop' | 'full_day_lop'
  is_active bool
```

**Shift timings must be versioned or effective-dated.** If HR changes General
Shift from 09:00 to 09:30, every historical attendance day silently re-derives
its expected time and past penalties change retroactively. Either version the
shift row or snapshot the resolved expectation onto the attendance day at close of day.

> This slightly qualifies `06-approvals.md §5.1`, which said expected times must
> never be stored. Precisely: they are **derived while the day is open**, then
> **frozen when the day closes**. Live derivation keeps a mid-day shift correction
> honest; freezing keeps history stable.

---

## 4. Not yet captured

- ⬜ Email Master rows below the fold; the ✏ template editor
- ⬜ `Add Document` form and `Add Fields for Document`
- ⬜ Shift → `Advanced Settings` tab — **the penalty rule definitions**
- ⬜ `Attendance Mode` dropdown options
- ⬜ `Create New Shift` form
- ⬜ Where the required-documents checklist is configured
