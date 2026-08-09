# HRMS — Shift Advanced, Leave Advanced, Assign Leave Rules, Cron Master, Holiday Calendar

Captured: 2026-08-09 · batch 12

This batch closes the attendance and leave **rules layer**. Everything here was
Tier-1 blocking.

---

## 1. Work Hours & Shifts → `General Shift` → **Advanced Settings**

### 1.1 ATTENDANCE — capture channels

| Field | Value | Control |
|---|---|---|
| Enable Clock In/Out | **`Mobile`** | chip/pill — implies a multi-select of channels |
| Enable IP Restriction ⓘ | Off | toggle |
| Enable Geo Fencing | Off | toggle |
| Enable Geo Tagging | Off | toggle |
| Enable FRS | Off | toggle |
| Enable Attendance with Selfie | Off | toggle |

### 1.2 WEEK OFF CONFIGURATION

| Field | Value |
|---|---|
| Working Days Per Week | `5 Days` |
| Weekoff Days | `Sunday, Saturday` |
| Saturday Pattern | `All Saturdays Off` |

### 1.3 EXTRA HOURS

| Field | Value |
|---|---|
| Extra Hours Calculation | `Overtime` |
| Extra Hours Threshold | `00:00` |

---

### 1.4 The penalty rules are on **General Settings**, in edit mode

`08-masters.md §3` expected them on Advanced Settings. They are not — they are on
the *General Settings* tab, hidden behind **conditional rendering plus view mode**:
the read-only panel renders `Penalty Rules: No`, and the fields only exist once you
click ✏ and switch the toggle on. Captured in full at **§8** below.

> **Design note for ours:** conditional config must still be *stored* when toggled
> off, not discarded. Turning penalties off for a month and back on should not wipe
> the rules.

⬜ Still worth one screenshot: `Enable IP Restriction` and `Enable Geo Fencing`
toggled on, to see whether an allowlist / a centre+radius appears.

---

### 1.5 ✅ Week-off belongs to the shift — this changes the attendance model

The working week is defined **per shift**, not per organisation. For a staffing
and facility-services business that is correct and necessary: office staff on
5 days, site staff on 6, security on rotating patterns.

**Consequence:** whether a given date is a week-off **cannot** be read from a
global setting. It resolves through the same chain as expected times
(`09-org-settings.md §1`):

```
roster entry for (employee, date) → employee default shift → shift week-off config
```

`Saturday Pattern` proves it needs a pattern enum, not a boolean — `All Saturdays
Off` implies siblings like *1st & 3rd*, *2nd & 4th*, *Alternate*, *None*. And
`Working Days Per Week` is **derived** from the weekoff days plus the Saturday
pattern, not independently stored — otherwise `5 Days` can contradict a weekoff
list of three days.

```sql
-- extends the shifts table from 08-masters.md §3.2
shifts
  ...
  weekoff_days      int[],        -- ISO day numbers, e.g. {6,7}
  saturday_pattern  text,         -- 'all' | 'none' | 'first_third' | 'second_fourth' | 'alternate'
  -- working_days_per_week is DERIVED, never stored

  -- capture channels
  clock_channels    text[],       -- {'mobile','web','biometric','kiosk'}
  ip_restriction_enabled bool,
  allowed_ip_ranges cidr[],
  geo_fencing_enabled bool,
  geo_tagging_enabled bool,
  frs_enabled       bool,
  selfie_required   bool,

  -- extra hours
  extra_hours_mode  text,         -- 'overtime' | ⬜ others (likely 'comp_off' | 'none')
  extra_hours_threshold_minutes int
```

---

### 1.6 ✅ `Extra Hours Calculation: Overtime` — a second HRMS→Payroll link

Overtime is computed **inside the attendance engine, per shift**, and its output
is a payroll earning. That is the same two-way boundary already proven by
`Payroll cycle` living in HRMS settings (`09-org-settings.md §2.1`).

The alternative value of this field is almost certainly **Comp Off** — which
would credit `leave_ledger_entries` instead of a payroll line. That is what makes
`Set Comp Off Expiry` (§2.1) meaningful.

So one shift setting decides whether extra hours become **money or leave**:

```
extra hours ──┬── 'overtime'  → payroll earning line
              └── 'comp_off'  → leave_ledger_entries (+credit, reason 'accrual')
```

Both paths must write through `entity_links` so an OT payment or a comp-off credit
traces back to the attendance days that produced it.

---

### 1.7 The capture channels explain three loose ends

| Setting | Explains |
|---|---|
| `Enable FRS` | the **`FRS Admin` role** in Permission Management (`07-settings.md §4.1`) and the **`Face Identity Vault`** settings page — face templates are biometric data |
| `Enable Geo Fencing` | why `Branch` / `work_location` need **lat / lng / radius**, not just a name |
| `Enable Clock In/Out: Mobile` | `attendance_punches.source` (`09-org-settings.md §2.4`) is a real requirement, not a nicety |

> ⚠ **FRS and selfie capture are biometric personal data.** Under DPDP Act 2023
> this is a distinct category: purpose limitation, explicit consent, retention
> limits, and deletion on exit. Face templates must live in their own table with
> its own encryption key and read logging — never as a column on `employees`.
> That is what `Face Identity Vault` is, and ours needs the same separation
> (`10-foundation-spec.md §7`).

---

## 2. Leave Settings → rule → **Advanced Settings** (red ⓘ)

### 2.1 Leaves Count (Advanced)

| Field | Value |
|---|---|
| Max. Leaves Allowed in a Month | `31` |
| Continuous Leaves Allowed | `31` |
| Set Comp Off Expiry | `No` |

### 2.2 Miscellaneous

| Field | Value | Field | Value |
|---|---|---|---|
| Enable Pro-rate Allocation | `No` | Negative Leaves Allowed | `No` |
| Future-dated Leaves Allowed | `Yes` | Future-dated Leaves Allowed After | `9999 Days` |
| Backdated Leaves Allowed | `Yes` | Backdated Leaves Allowed up to | `9999 Days` |
| Apply Leaves for Next Year Till | `February` | Leave Year Cycle | `Calendar Year (Jan - Dec)` |
| Encashable | *(value below fold ⬜)* | | |

Every field carries a ⓘ tooltip; the tab label itself carries a **red** ⓘ.

---

### 2.3 ✅ Four things this settles

**1. `Negative Leaves Allowed` confirms the ledger.** A balance that may go below
zero cannot be a counter with a floor — `leave_ledger_entries`
(`09-org-settings.md §3.3`) is required, not preferred.

**2. `Leave Year Cycle` is per leave type.** `Calendar Year (Jan - Dec)` implies
`Financial Year (Apr - Mar)` as the sibling — the Indian default, and the one
Payroll uses. Different types genuinely do run on different cycles (earned leave
on the financial year, maternity on a rolling window), so per-type is right, but
it needs an **org-level default** so nobody configures twelve types by hand.

```sql
leave_types
  ...
  year_cycle text,                    -- 'calendar' | 'financial' | 'joining_anniversary'
  max_per_month int,
  max_continuous_days int,
  pro_rate_allocation bool,           -- mid-year joiners get a partial entitlement
  negative_balance_allowed bool,
  min_negative_balance numeric,       -- ⬜ is there a floor? probably appears when Yes
  future_dated_allowed bool,
  future_dated_limit_days int,        -- NULL = unlimited
  backdated_allowed bool,
  backdated_limit_days int,           -- NULL = unlimited
  next_year_apply_until_month int,    -- "Apply Leaves for Next Year Till"
  is_encashable bool,
  comp_off_expiry_days int            -- NULL = never expires
```

**3. `Enable Pro-rate Allocation` answers the mid-year joiner question.** A
January joiner and an October joiner cannot both get 12 days. Off in this tenant,
which is a configuration gap rather than a design choice — ours defaults it **on**.

**4. `Encashable` is a third HRMS→Payroll flow.** Encashment converts a leave
balance into a payroll earning. `leave_ledger_entries.reason = 'encashment'`
already exists in our model and now has a confirmed trigger.

---

### 2.4 ⚠ Defect — `9999 Days` as a sentinel for "no limit"

`Future-dated Leaves Allowed After: 9999 Days` and `Backdated Leaves Allowed up
to: 9999 Days` are magic numbers standing in for *unlimited*. The same idea is
expressed as an empty field on the regularization limits screen
(`09-org-settings.md §2.1`) and as `--` elsewhere.

**Ours: `NULL` means no limit, everywhere, one convention.** A sentinel eventually
gets compared with `<` and silently becomes a real 27-year limit. Add to the
do-not-reproduce list (`10-foundation-spec.md §8`).

Also note `Future-dated Leaves Allowed After` reads as a *minimum notice period*
("you may apply only more than N days ahead") while `Backdated Leaves Allowed up
to` is a *maximum look-back*. Two opposite meanings, near-identical labels.
⬜ Worth hovering the two ⓘ tooltips to confirm which is which before we copy the
semantics.

---

## 3. Leave Settings → Rules → **Assign Leave Rules**

Layout: employee list with checkboxes + `Assign Rules` button + a count badge.

| Column | |
|---|---|
| ☑ · ID | `EMP6`, `EMP5`, … |
| Employee Name | |
| Department | `Finance`, `HR` |
| Designation | `Financial Analyst`, `HR Specialist` |
| Location | `--` (empty for all) |
| Manager | `--` |

**`Assign Leave Rules` modal:** `Select Rule` ✱ → dropdown listing
`Loss Of Pay` · `Maternity Leave` · `Paternity Leave` → `Cancel` / `Apply`.

### 3.1 Assignment is per-employee and manual only

Select employees → pick **one** rule → Apply. There is no department, designation,
location, or employment-type scope, despite those columns being *displayed* (they
are filter/search aids, not assignment targets).

For six employees that is fine. For six hundred it is not — and this is a staffing
company, where headcount is the whole point.

**Ours keeps the scoped model** from `09-org-settings.md §3.3` and treats
employee-level as the finest grain, not the only one:

```sql
leave_rule_assignments
  id, org_id, leave_type_id,
  scope text,            -- 'org' | 'business_unit' | 'department' | 'designation'
                         -- | 'employment_type' | 'location' | 'employee'
  scope_id uuid,
  effective_from date, effective_to date,
  priority int           -- narrower scope wins; employee overrides department
```

Resolution: collect every assignment matching the employee, order by scope
narrowness, take the winner. A new hire in Finance then inherits the Finance
policy automatically — no HR action, which is the entire anti-hardcoding rule
applied to policy.

### 3.2 ✅ Resolves the CL / SL / EL discrepancy — as a defect

`09-org-settings.md §3.1` flagged that Admin Approvals showed live leave records
of type `Casual Leave`, `Sick Leave` and `Earned Leave`, none of which appear in
Leave Rules. The assign dropdown now shows **exactly the same three rules** as the
rules list — Loss Of Pay, Maternity, Paternity.

So CL/SL/EL are **not** configured leave types in this tenant. There are approved
leave applications referencing types that have no rule, no entitlement, and no
balance. The reference lets an application reference a leave type that does not
exist as a rule.

**Ours: `leave_applications.leave_type_id` is a hard FK, and an application is
rejected at validation if no assignment resolves for that employee on that date.**
An approved leave with no entitlement is an unpriceable payroll input.

---

## 4. Settings → **Cron Master**

Toolbar: search · **`Run with Date`** · `Filter` · `Reset`
Columns: `Cron Name` · `Current Status` · `Enabled` · `Actions` (✏ edit, ▶ run now)

| # | Cron Name | Status | Enabled | ✏ |
|---|---|---|---|---|
| 1 | Schedule In-Out | Idle | Active | — |
| 2 | Bio-Matric Synchronise Cron | Idle | Active | — |
| 3 | Get Attendence Data *(sic)* | Idle | Active | — |
| 4 | De-Allocate Device | Idle | Active | ✏ |
| 5 | Send Leave Balance Mail To HR | **Failed** | Active | ✏ |
| 6 | Probation Reminder | Idle | Active | ✏ |
| 7 | Probation Complete | Idle | Active | ✏ |
| 8 | Probation Extend | Idle | Active | ✏ |
| 9 | Feedback Mail | Idle | Active | ✏ |
| 10 | Work Anniversary And Birthday Mails | **Failed** | Active | ✏ |
| 11 | New Employee Feedback | Idle | Active | ✏ |
| 12 | Update Surveys Status | Idle | Active | ✏ |
| 13 | Attendance Register List | Idle | Active | — |
| 14 | Master Inout Cron | Idle | Active | ✏ |
| 15 | Leave Settings V2 — Accrual Reconciliation | Idle | Active | ✏ |
| 16 | Leave Settings V2 — Year-End Carry Forward | Idle | Active | ✏ |
| 17 | Shift Attendance Digest | Idle | Active | — |

`1-17 of 17` · `25 / Page`

---

### 4.1 ✅ Confirms the attendance day-register is generated, not derived

**`Attendance Register List`** is a scheduled job. `10-foundation-spec.md` designed
the day-register as pre-generated rows per employee per date rather than a view
computed on read. That is now confirmed rather than assumed.

The five jobs **without** an ✏ are the ones the product refuses to let you
reschedule — and they are exactly the attendance pipeline, in order:

```
Bio-Matric Synchronise  →  pull raw punches from devices
Get Attendence Data     →  normalise into attendance_punches
Master Inout Cron       →  roll punches into per-day in/out per Punch Calculation Mode
Attendance Register List→  materialise the day register (present/absent/leave/weekoff)
Shift Attendance Digest →  email the result
Schedule In-Out         →  seed expected in/out from roster + shift
```

**These have dependencies, not independent schedules.** Running the register
before punches are normalised produces a day of false absences. Our runner needs
**ordered execution with a barrier between stages**, not six unrelated cron
expressions — the reason the reference hides the schedule on these five is almost
certainly that they cannot safely be reordered.

### 4.2 ✅ `Probation Extend` — probation is a lifecycle, not a date

Three separate probation jobs: Reminder, Complete, **Extend**. Extension is a
first-class action, so `date_of_confirmation` + `Confirmation Status` on the
employee record are not sufficient — an extension has its own date, reason, and
approver, and an employee can be extended more than once.

```sql
employee_probation_events
  employee_id, event 'started'|'reminder_sent'|'extended'|'confirmed'|'terminated',
  effective_date date, new_end_date date,
  reason text, actioned_by, created_at
```

`employees.is_confirmed` and `probation_end_date` become **derived from the latest
event** — same append-only pattern as the leave ledger and `entity_events`. This
also makes `10-foundation-spec.md §3.3`'s "probation is not an employment type"
concrete: it is a state machine, and the reference models it as a dropdown value.

### 4.3 ✅ `De-Allocate Device` — device assignment has a lifecycle

Biometric devices are allocated to employees and reclaimed. `10-foundation-spec.md
§4.1` deliberately dropped the device columns from `employees`; this is the table
they belong in.

```sql
employee_devices
  employee_id, device_id, allocated_at, deallocated_at, deallocated_by, reason
```

Auto de-allocation on exit is why it is a cron and not a button.

### 4.4 ⚠ Two jobs are `Failed`, still `Active`, and nothing surfaces it

`Send Leave Balance Mail To HR` and `Work Anniversary And Birthday Mails` are both
red. The screen shows **no last-run time, no next-run time, no error message, no
run history, and no alert.** Someone finds out when a birthday is missed.

**Ours needs a run log as a first-class table**, not a status column:

```sql
job_definitions
  key text pk, name, module, schedule_cron, is_enabled,
  is_system bool,          -- system jobs cannot be rescheduled (the pipeline five)
  depends_on text[]        -- ordering barrier

job_runs
  id, job_key, org_id,
  business_date date,      -- what "Run with Date" targets, distinct from run time
  started_at, finished_at,
  status 'running'|'succeeded'|'failed'|'skipped',
  rows_affected int, error text, triggered_by 'schedule'|'manual'|'backfill',
  unique (job_key, org_id, business_date, triggered_by)   -- idempotency
```

Plus: a failed run must raise a notification through the same
`notification_events` catalogue as everything else (`08-masters.md §1`).

### 4.5 ✅ `Run with Date` — jobs must be idempotent per business date

A backfill/replay control, and non-negotiable for attendance: a device goes
offline for a day, and the register for that date has to be rebuilt.

This forces two rules our jobs must obey:

1. **Every job takes a business date as a parameter**, and never reads "today"
   from the clock internally.
2. **Re-running for the same date is safe** — upsert on `(employee, work_date)`,
   never blind insert. Otherwise a replay doubles everyone's attendance.

### 4.6 `Leave Settings V2` names leak a migration

Two jobs are prefixed `Leave Settings V2`, which means a V1 existed and both may
still run. Ours ships one leave model, and the accrual/carry-forward jobs are
`leave.accrual_reconciliation` and `leave.year_end_carry_forward` — no version in
the name.

Note these two are the engine behind `Creditable On Accrual Basis` and
`Carry Forward Enabled` from `09-org-settings.md §3.2`, and both write
`leave_ledger_entries` (`reason = 'accrual'` / `'carry_forward'` / `'lapse'`).

### 4.7 ⚠ `Edit Cron` — the schedule is a **daily run time only**

Modal: `Edit Cron - De-Allocate Device`

| Field | Value |
|---|---|
| Run Time ✱ | `04:15` — time picker |
| Enabled | toggle, on |

That is the entire schedule. **No frequency, no day-of-week, no day-of-month, no
cron expression, and no timezone.** Every editable job is "daily at HH:MM".

**Which means the frequency is hardcoded inside the job.** `Leave Settings V2 —
Year-End Carry Forward` is an annual job and `Accrual Reconciliation` is very
likely monthly, yet both are configured with nothing but a clock time. The only
way that works is if the job wakes daily and asks itself *"is today the 1st?"* /
*"is today 31 December?"* in code.

That is the anti-hardcoding rule violated in the scheduler itself: the calendar
policy lives in a function body where nobody can see or change it, while the UI
implies the schedule is configurable.

**Ours stores a real cron expression** — `job_definitions.schedule_cron` — so
"monthly on the 1st at 04:15" is data. The UI can still show a friendly time
picker for the daily jobs; it just writes `15 4 * * *` underneath.

> **And it needs a timezone.** `04:15` in a multi-tenant product is meaningless
> without one. Ours resolves it from `organization_settings.timezone`, so a
> Bengaluru tenant's attendance pipeline runs at 04:15 IST and each org's
> business date rolls over correctly. Store `job_runs.business_date` in the org's
> zone, never UTC-truncated.

⬜ Still not captured: whether the jobs that send mail (`Send Leave Balance Mail
To HR`) let you configure recipients. Low value — ours reads them from
`org_notification_settings` (`08-masters.md §1`) rather than per-job config.

---

## 5. Settings → **Holiday Calendar**

Buttons: ⚙ `Settings` · `Download Sample CSV` · `Import CSV` · `+ Add Holiday`

| Column |
|---|
| Holidays · Date · **Optional Holiday** · **Branch** · Actions |

`Total Records Count is 0` — **empty.**

### 5.1 ✅ Holidays are per branch

The `Branch` column confirms `10-foundation-spec.md §3.3`. In India this is not
optional: Pongal, Bihu, Gudi Padwa and state formation days differ by location,
and a national-only calendar mis-computes leave day counts for every regional
office.

```sql
holidays
  id, org_id, name, holiday_date date,
  branch_id fk NULL,            -- NULL = all branches
  is_optional bool,
  created_at
```

`branch_id NULL = applies everywhere` avoids duplicating Republic Day across
fifteen branches.

### 5.2 `Optional Holiday` — ⚙ Settings confirms the quota

Modal: **`Optional Holiday Settings`**

| Field | |
|---|---|
| Maximum Optional Holidays Per Employee (Per Year) | number, placeholder `e.g. 3`, empty |
| Help text | *"Leave empty for no limit. **Saving will auto-assign this balance to all active employees.**"* |

So optional holidays work as predicted: a pool of dates flagged `is_optional`, and
a per-year cap on how many an employee may take.

**Note the help text quietly proves §2.4's point.** Here "no limit" is expressed
as **empty → NULL**, correctly. Two screens away, the same idea is `9999 Days`.
Same product, two conventions — which confirms the sentinel is a defect, not a
deliberate choice. Our `NULL = no limit` rule (`10-foundation-spec.md §8`) matches
the half of the reference that got it right.

### 5.3 ⚠ "auto-assign this balance to all active employees" — the wrong shape

Saving **materialises a balance onto every active employee at that moment**. Three
things break:

1. **New joiners get nothing.** They weren't active when it was saved, so they
   have no optional-holiday balance until someone re-saves the setting.
2. **Re-saving overwrites.** Changing 3 → 4 re-assigns everyone, presumably
   including people who have already elected two days. Whether their elections
   survive is unknowable from the UI, and "unknowable" is the answer nobody wants
   about a balance.
3. **It's a second, parallel balance mechanism** — separate from the leave ledger,
   with its own accrual, its own expiry story, and its own bugs.

**Ours makes optional holidays a leave type.** They already behave like one: a
yearly entitlement, drawn down by taking a day, capped, resetting each leave year.
So they flow through the machinery that already exists —

```
optional holiday quota  →  leave_types (is_optional_holiday = true, max_per_year)
"assign to all active"  →  leave_rule_assignments (scope = 'org')   -- §3.1
an employee elects a day→  leave_ledger_entries (−1, reason 'application')
                           + employee_holiday_elections (which date)
```

New joiners inherit the org-scope assignment automatically, changing the cap is an
`effective_from` row rather than a destructive overwrite, and the balance is a
ledger sum like every other balance. One mechanism instead of two.

```sql
employee_holiday_elections
  employee_id, holiday_id, leave_year, elected_at,
  ledger_entry_id fk,            -- the debit it produced
  unique (employee_id, holiday_id)
```

> ⬜ One mismatch to keep in view: **holidays are per branch, but the quota is
> org-wide.** A Chennai and a Mumbai employee choose from different optional lists
> against the same cap. That is probably intended and fine — but if a branch's
> optional list is shorter than the cap, the cap is unreachable there. Ours allows
> a per-branch override on the assignment (`scope = 'location'`), which the scoped
> model gives us for free.

⬜ Still needed: the `+ Add Holiday` form and the `Download Sample CSV` columns.

### 5.4 ⚠ The holiday layer is completely empty

Zero holidays exist, while leave rules already reference
`Holidays Between Leave: Not Considered` (`09-org-settings.md §3.2`) and the
attendance register must mark holidays as non-working. **Every day-count in this
tenant is currently computed against an empty calendar.**

For us this is a **seeding requirement**, not a nicety: a new org must be created
with a default national holiday set for its country, or the first leave
application computes the wrong duration. Add to `10-foundation-spec.md §9` build
order.

`Import CSV` + `Download Sample CSV` — bulk load is the expected entry path.
⬜ The sample CSV columns would give us the exact import contract.

---

## 6. *(superseded — see §8)*

---

## 8. Shift → General Settings, **edit mode** — the attendance rules engine

Captured 2026-08-10. Reached via ✏ on the shift panel. Footer: `Cancel` /
`Save Changes`. Left rail: `General Shift 09:00—18:00` · `Morning Shift 08:00—17:00` ·
`Evening Shift 10:00—19:00`, each with a `⋯` menu · `⊕ Create New Shift`.

### 8.1 Identity & timings

| Field | Req | Value | Help text |
|---|---|---|---|
| Rule Name | ✱ | `General Shift` | |
| Description | | *empty* | |
| **Shift Code** | ✱ | *empty* | |
| In Time | ✱ | `09:00` | |
| Out Time | ✱ | `18:00` | |
| Half Day Working Hours | | *empty* | *"minimum duration for counting attendance as a half day, if your attendance policy supports it"* |
| **Attendance Mode** | ✱ | `Strict Shift Timing` | see §8.2 |
| Required Working Hours | | *empty* | *"total time an employee must complete in a day to satisfy the shift's attendance requirement"* |

### 8.2 ✅ `Attendance Mode` — resolved, two modes

The field's own help text gives both options:

> *"**Working Hours Only** checks total hours completed. **Strict Shift Timing**
> also enforces the punch-in and punch-out windows configured for the shift."*

| Mode | Satisfied when | Punch windows |
|---|---|---|
| `Working Hours Only` | `worked_minutes ≥ required_working_minutes` | ignored — punch any time |
| `Strict Shift Timing` | the above **and** punches fall inside the configured windows | enforced |

This confirms the prediction in `08-masters.md §3.1`: the day-register computation
**branches on mode**. `Working Hours Only` is the flexi/field-staff mode where start
time is irrelevant; `Strict Shift Timing` is the office mode that produces
lateness, penalties and punch rejections.

`attendance_mode text -- 'working_hours_only' | 'strict_shift_timing'`

### 8.3 Check-in / out windows

> *"Employees can mark attendance only inside these windows when Strict Shift
> Timing is enabled."*

`Check-In Start Time` ✱ · `Check-In End Time` ✱ · `Check-Out Start Time` ✱ ·
`Check-Out End Time` ✱ — **all four required, all four empty.**

This is the mechanism behind `Punch Rejection Report` (`08-masters.md §3.1`) and
`attendance_punches.is_rejected` (`09-org-settings.md §2.4`), now confirmed.

### 8.4 Attendance Digest Email — per shift, with its own send time

Toggle ON. Field `Digest Mail Time` ✱ (empty).

> *"Send a daily email listing who arrived, who was late, and who hasn't punched in
> yet for this shift. The mail time must be after Check-In End Time and no later
> than the shift's Out Time."*

**This changes a requirement for the job runner.** The `Shift Attendance Digest`
cron (§4) has **no edit pencil** in Cron Master — because its schedule is not one
time, it is *one time per shift*, configured here. An evening shift's digest cannot
go out at the morning shift's hour.

So `job_definitions.schedule_cron` is not always sufficient: some jobs **fan out
over rows and take their time from the row**.

```sql
job_definitions
  ...
  schedule_source text,   -- 'fixed' | 'per_row'
  schedule_row_table text, schedule_row_time_column text
  -- digest: per_row over shifts.digest_mail_time
```

Note the constraint is cross-field: `check_in_end ≤ digest_time ≤ out_time`. That
belongs in a validation layer shared by form and API, not in the form alone.

---

### 8.5 ⭐ Strict In Time Mode — the grace engine

Toggle ON. **This is the best-designed thing in the reference product** and worth
copying closely.

> *"Grace band (Allowed From–Until) uses Days Allowed per month. A separate cutoff
> time below applies its own deduction when employees arrive later."*

| Field | Req | Value |
|---|---|---|
| Allowed From ⓘ | ✱ | *empty* |
| Allowed Until ⓘ | ✱ | *empty* — placeholder `End of grace band` |
| Days Allowed ⓘ | | `0` |
| Deduction (grace band) | | **`Half Day (Attendance)`** — dropdown |
| — *Late check-in after cutoff* — | | |
| Apply Deduction After ⓘ | ✱ | *empty* — placeholder `e.g. 10:20` |
| Deduction (after cutoff) | | **`Half Day (Attendance)`** — dropdown |

Callouts: *"Late check-ins between **Allowed From** and **Allowed Until** can use
monthly **Days Allowed** before the grace-band deduction applies."* ·
*"Any check-in **after** the time below gets this deduction immediately — no
monthly grace."*

**It is a three-tier lateness ladder with a monthly forgiveness quota:**

```
punch-in time
  │
  ├─ before Allowed From ......... on time, nothing
  │
  ├─ Allowed From … Allowed Until . late, but consumes 1 of Days Allowed/month
  │                                 quota exhausted → Deduction (grace band)
  │
  └─ after Apply Deduction After .. Deduction (after cutoff), immediately,
                                    no grace regardless of quota
```

That is genuinely good policy modelling: it distinguishes *"traffic was bad twice
this month"* from *"you turn up at 11"*, which a flat grace-minutes field cannot.

**The quota is stateful and order-dependent.** Whether today's late arrival is
forgiven depends on how many late days already occurred **this month** — so the
Nth late day is the one that gets deducted, and it is only deterministic if
evaluated in date order.

```sql
-- DERIVED, not stored: count of prior grace-band days in the same period,
-- ordered by work_date. Recomputed whenever an earlier day changes.
```

> ⚠ **A regularization approval rewrites history.** Approving a regularization for
> the 3rd un-lates that day, which frees a grace slot, which may un-deduct the
> 19th. The recompute must cascade forward across the whole period — it cannot be
> a single-row update. This is why the grace counter must be derived and why
> `Attendance Register List` must be re-runnable for a date range (§4.5).

**Reset period.** `Days Allowed` is described as *per month*, while
`Payroll cycle` is separately configurable (`09-org-settings.md §2.1`). If a tenant
moves to a fortnightly cycle, a monthly grace quota straddles two pay runs.
**Ours resets grace on the payroll cycle, not the calendar month.**

### 8.6 ⚠ Two lateness engines that overlap — the real defect

`Strict In Time Mode` deducts for late arrival. `Penalty Rules → In Time`
(§8.7) *also* penalises late arrival. Both can be enabled at once — they are in
this very screenshot — and **nothing in the UI states which wins, or whether both
fire.**

A single 10:30 check-in can plausibly draw a grace-band `Half Day (Attendance)`
*and* an In Time penalty. Double deduction, silently, on a payroll input.

**This is not hypothetical — `General Shift` is currently configured with both,
and they contradict each other:**

| Engine | Free late days | Then |
|---|---|---|
| Strict In Time Mode | `Days Allowed = 0` | `Half Day (Attendance)` |
| Penalty Rules → In Time | `Late Coming Allowed = 3` | `Half Day` |

One says the first late arrival is deducted. The other says the first three are
free. Same shift, same day, same employee — and the product gives no rule for
which applies. Whatever the code does, no HR user could predict it from this
screen.

**Ours collapses them into one ordered rule set.** Grace is not a separate feature
from penalties — it is the *first two rungs* of the same ladder:

```sql
attendance_rules
  id, shift_id,
  sequence int,                  -- evaluated in order, FIRST MATCH WINS
  trigger text,                  -- 'late_in' | 'early_out' | 'short_duration'
  from_time time, to_time time,  -- the band (NULL = open-ended)
  threshold_minutes int,
  allowance_count int,           -- forgiven occurrences per period
  allowance_period text,         -- 'pay_cycle' | 'month'
  deduction_id fk → deduction_types,
  is_active bool
```

One list, one evaluation order, one deduction per trigger per day. Whether
consequences stack becomes an explicit, documented decision instead of an
emergent one.

### 8.7 Penalty Rules — three triggers

Toggle ON. *"Automatically apply deductions when late coming, early leaving, or
short working hours cross the limits below."*

| Sub-toggle | State | Help text |
|---|---|---|
| **In Time** | Off | *"Apply a penalty when employees arrive late beyond the allowed count or interval."* |
| **Out Time** | Off | *"Apply a penalty when employees leave early more often than the allowed limit."* |
| **Work Duration** | Off | *"Apply a penalty when employees repeatedly fall short of the required work duration."* |

✅ This confirms the predicted trigger enum in `08-masters.md §3.2` exactly:
`late_in` · `early_out` · `short_hours`.

#### `In Time` expanded

| Field | Value | Control |
|---|---|---|
| Late Coming Allowed ⓘ | `3` | number |
| Penalty Interval ⓘ | `1` | number |
| Penalty ⓘ | `Half Day` | dropdown |

Read as: **3 late arrivals are free; after that, every 1 further late arrival costs
a half day.** `Penalty Interval` is the repeat step — set it to `2` and the penalty
lands on every second late day beyond the allowance.

That adds a field the model was missing:

```sql
attendance_rules
  ...
  allowance_count  int,   -- "Late Coming Allowed" — free occurrences per period
  penalty_interval int,   -- "Penalty Interval"    — then apply every Nth
  deduction_id     fk
```

⬜ The reset period is not shown on this row. Presumed monthly, matching
`Days Allowed`. Ours resets on the payroll cycle (§8.5).

⚠ **Vocabulary drift:** this dropdown reads `Half Day`, while the grace-band
dropdown two sections up reads `Half Day (Attendance)`. Same concept, two option
sets, one screen apart — and it is unclear whether this one even offers
`Deduct Leave Balance`. Ours has **one** `deduction_types` catalogue referenced by
both (§8.8).

### 8.8 ✅ The `Deduction` catalogue — the HRMS→Payroll handoff, resolved

Dropdown options, both fields (grace band and after cutoff):

| Option |
|---|
| `Half Day (Attendance)` |
| `Full Day (Attendance)` |
| `Deduct Leave Balance` |

Three options, and they split on exactly the axis predicted — **attendance vs
leave** — which settles how attendance reaches payroll:

| Deduction | What it changes | Employee is paid |
|---|---|---|
| `Half Day (Attendance)` | the day's payable fraction → `0.5` | half day |
| `Full Day (Attendance)` | the day's payable fraction → `0` | nothing for that day |
| `Deduct Leave Balance` | the **leave ledger**, day stays payable | in full; balance drops |

**There is no `LOP` option, and that is correct.** Loss of pay is not a deduction
type — it is what `Full Day (Attendance)` *becomes* once payroll reads a day with
payable fraction `0` that no approved leave covers. The reference gets this right.

So the contract between the two products is now precise, and it is two numbers:

```
HRMS → Payroll, per employee per day:
   1. attendance_days.payable_fraction   (1.0 | 0.5 | 0)
   2. leave_ledger_entries               (paid-leave debits, separate)

Payroll derives LOP itself: fraction < 1 AND not covered by paid leave.
```

That is the whole attendance→salary boundary, and it is why `payable_fraction`
must be a stored column on the day register rather than recomputed at pay time —
payroll must not re-run the penalty engine.

### 8.8a ⚠ `Deduct Leave Balance` is under-specified — two gaps

The option says *what* to charge but not **how much** and not **from which leave
type**. `Half Day` and `Full Day` are spelled out for attendance and simply absent
for leave.

**Gap 1 — amount.** Half a day or a full day off the balance? Unknowable from the
UI.

**Gap 2 — which leave type.** A tenant with Casual, Sick and Earned leave has no
way to say which one a lateness penalty debits. And it matters: Sick Leave usually
cannot be spent on being late.

**Gap 3 — insufficient balance.** If the balance is zero and `Negative Leaves
Allowed` is `No` (which it is, `§2.2`), the deduction cannot apply. The UI offers
no fallback, so it either silently does nothing or errors inside a cron — and a
lateness penalty that silently does nothing is a payroll leak.

**Ours makes all three explicit:**

```sql
deduction_types                     -- seeded catalogue, org-overridable
  id, org_id, key, label,
  amount text,           -- 'half_day' | 'full_day'
  charge_to text,        -- 'attendance' | 'leave'
  leave_type_id fk NULL, -- REQUIRED when charge_to = 'leave'
  fallback_deduction_id fk NULL,   -- applied when the balance is insufficient
  is_active bool
```

`fallback_deduction_id` is the important one: *"deduct half a day of Casual Leave;
if there is none, mark half day attendance."* That is the rule HR actually intends,
and the reference has nowhere to put it.

Seed: `Half Day (Attendance)`, `Full Day (Attendance)`, and one
`Deduct Leave Balance` row **per eligible leave type**, each with an attendance
fallback — so the dropdown reads `Deduct Casual Leave (Half Day)` rather than an
ambiguous single entry.

### 8.9 Breaks

`Number of Breaks` ✱ = `0`. A count, so entering N presumably renders N start/end
rows — confirming `shift_breaks` (`08-masters.md §3.2`) as a child table rather
than columns.

### 8.10 ⚠ Every required field on this shift is empty — and it is live

`Shift Code`, all four check-in/out windows, `Digest Mail Time`, `Allowed From`,
`Allowed Until`, `Apply Deduction After` — **all marked ✱ required, all blank**, on
a saved shift that is assigned to employees and whose mode is `Strict Shift
Timing`, which by its own help text *requires* punch windows.

So the attendance engine is running against null configuration. The form validates
on save; the existing rows predate the fields.

**Ours needs a config-completeness gate, not just form validation.** A shift with
`attendance_mode = 'strict_shift_timing'` and null windows is *invalid*, and the
pipeline must refuse to process it rather than silently produce absences:

```
job runner preflight → validate every active shift's config
                     → invalid shift = job_runs.status 'failed' with a clear error,
                       never a day of false absences
```

This is the same principle as `10-foundation-spec.md §1` ("required-ness belongs
to forms") taken one step further: forms own *entry* validation, but anything the
engine depends on needs a **runtime** guard too.

---

## 7. Still open after this batch

**Attendance — effectively closed:**
- ✅ `Attendance Mode` — two modes (§8.2)
- ✅ Grace engine + penalty rules (§8.5–8.7)
- ✅ Deduction catalogue — the HRMS→Payroll handoff (§8.8)
- ⬜ any one `Penalty Rules` sub-toggle expanded (§8.7) — *nice to have; pins the
  count/interval field names, but the shape is already known from the grace engine*
- ⬜ `Enable IP Restriction` / `Enable Geo Fencing` toggled on — *inferable*

**Leave:**
- ⬜ `Encashable` value and any fields below it
- ⬜ the two ⓘ tooltips on Future-dated / Backdated (opposite meanings, similar labels)
- ⬜ `Leave Balance` tab

**Jobs & holidays:**
- ⬜ `+ Add Holiday` form · `Download Sample CSV` columns *(low value — inferable)*

**Masters:**
- ⬜ Branch + its Add modal (needs lat/lng for geo-fencing — §1.7)
- ⬜ Announcement Category
