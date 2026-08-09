# HRMS — Roster, General Settings, Leave Settings

Captured: 2026-08-08 · batch 9
Menu: ⚙ → `ORGANIZATION STRUCTURE` → Roster / General Settings; `GENERAL` → Leave Settings

---

## 1. Roster

`+ Import Roster Sheet` · search · `Filter` · `Reset`

| Column | |
|---|---|
| Employee Code | `791`, `EMP2`…`EMP6` |
| Full Name | |
| Roster Shift | `📅 View Roster` button |

`1-6 of 6 items` · `25 / Page`

> **Roster is date-based shift assignment, separate from the employee's default
> shift.** `employees.shift_id` holds the standing shift (`Morning Shift` for Sanjay);
> the roster assigns a shift **per employee per date**. Both are needed — a
> rotating-shift workforce can't be expressed by one column, and a fixed-shift
> employee shouldn't need 365 roster rows a year.

```sql
roster_entries
  org_id, employee_id, work_date, shift_id,
  is_week_off bool,
  source text,        -- 'default' | 'roster' | 'import' | 'manual'
  unique (employee_id, work_date)
```

**Shift resolution order for any date:** roster entry → employee default shift →
nothing (employee is not attendance-tracked). This is what
`Expected In/Out Time` on Admin-Regularization (`06-approvals.md §5.1`) resolves through.

`Import Roster Sheet` — bulk spreadsheet upload. For a staffing/facility-services
business with rotating field staff this is the primary entry path, not the
exception. ⬜ Template format not captured.

⬜ `View Roster` (the per-employee calendar) not captured.

---

## 2. ORGANIZATION STRUCTURE → General Settings

**This is the page that was missing.** It holds the global attendance and
lifecycle rules that everything else has been referencing.

### 2.1 Attendance Regularization Limits

| Field | Value |
|---|---|
| Payroll cycle | `Monthly` (dropdown) |

**Role-wise Limits** — *"Monthly Limit = max requests an employee of that role can
submit per month. Prior Days = how far back they can apply. Empty = no limit."*

| Role | Monthly Limit | Prior Days Limit |
|---|---|---|
| Account Team · Admin · Assistance Reporting Manager · Auditor · FRS Admin · HR · Intern · Network Team · Recruiter · Reporting Manager · SuperAdmin · User | *No limit* | *No limit* |

The same 12 roles as Permission Management (`07-settings.md §4.1`).

> **`Payroll cycle` lives in HRMS settings, not Payroll.** Because regularization
> must be cut off once a pay run closes — you cannot retroactively fix attendance
> for a month already paid. Concrete proof that the HRMS↔Payroll boundary is a
> two-way dependency, not a one-way feed.
>
> Role-wise quotas mean regularization limits are **per role**, so the approval
> engine needs a quota check before accepting a request, not just an approver.

```sql
regularization_limits
  org_id, monthly_limit int NULL, prior_days_limit int NULL,   -- NULL = no limit
  scope text,      -- 'org'|'business_unit'|'department'|'designation'
                   -- |'employment_type'|'location'|'employee'|'role'
  scope_id uuid,
  priority int     -- narrowest wins, same resolver as leave_rule_assignments
```

> ⚠ **Re-verified 2026-08-10 at full resolution — all values confirmed.** Two
> additions:
>
> **1. "No limit" is placeholder text in an empty input**, on all 24 role fields
> and both On-Duty fields. That is `NULL = unlimited` done correctly, and it is now
> the **third** screen to do so (with Optional Holiday Settings,
> `12-advanced-settings-cron-holiday.md §5.2`). Only the leave Advanced tab uses
> `9999 Days`. The sentinel is definitively the outlier, not the convention.
>
> **2. The quota is keyed to *roles*, and the role list includes `Intern` and
> `User`.** Those are not access roles — `Intern` is an employment type. The
> reference has conflated permission-roles with employment categories in order to
> get a per-population quota, which is exactly what
> `10-foundation-spec.md §3.2` forbids ("roles grant screens, never scope").
>
> Hence the `scope` column above: regularization limits resolve through the **same
> resolver as leave rule assignments** (`12-… §3.1`). Then "interns may submit 2 per
> month" is `scope = 'employment_type'`, and `Intern` never has to exist as a role.

### 2.2 Lifecycle Settings

| Field | Value |
|---|---|
| Notice Period (Days) | `60` |
| Probation Period (Days) | `90` |
| Probation Confirmation Reminder (Days Before) | `7` |

> **This is the source of `Last Date As Per Notice Period`** on the Separation
> screen (`05-employee-record.md §7`). Resignation date + 60 days = contractual
> last date; the gap to the agreed last date is notice shortfall → a payroll
> deduction.
>
> `Probation Period` + `Probation Confirmation Reminder` drive
> `Date Of Confirmation` / `Confirmation Status` on the employee record, and the
> reminder is a **scheduled job** — another `Cron Master` entry.

These are org **defaults**. An individual contract may override them, so
`employees` needs nullable `notice_period_days` / `probation_period_days` that
fall back to the org setting. The reference has no such override; ours should.

### 2.3 On-Duty Regularization

| Field | Value |
|---|---|
| Backdate Allow (Days) | *No limit* |
| Future Date Allow (Days) | *No limit* |

On-duty can be applied for **prospectively** — you know next Tuesday is a client
visit. Distinct from attendance regularization, which is always retrospective.

### 2.4 Punch Calculation Mode — ✅ resolves an open question

*"Control how attendance worked time is calculated from daily punch records."*

| Mode | Selected |
|---|---|
| **Standard (IN-OUT Pairs)** | ⦿ |
| First In / Last Out | ○ |

> **This answers `04-me.md §1`'s open question about the `Multiple Punches` sub-tab.**
> Multiple punches per day are real, and this setting decides how they roll up
> into one duration:
>
> - **IN-OUT Pairs** — sum each in→out pair. Breaks and step-outs are excluded, so
>   worked time is genuinely worked time.
> - **First In / Last Out** — one span from first punch to last. Simpler, more
>   generous, and it counts a two-hour lunch as work.
>
> Org-level, so it applies uniformly. Consequence: `attendance_punches` must be a
> real child table storing every punch, with the day-register's `duration` derived
> per this mode. Store only a single in/out pair and you can never switch modes or
> recompute history.

```sql
attendance_punches
  id, org_id, employee_id, work_date,
  punched_at timestamptz, direction 'in'|'out',
  source 'biometric'|'web'|'mobile'|'manual',
  device_id, is_rejected bool, rejection_reason
```

`is_rejected` carries punches falling outside the shift's check-in/out windows
(`08-masters.md §3.1`) → the `Punch Rejection Report`.

### 2.5 ✅ Open question #6 — resolved by elimination

`Salary Grade` and `Experience Grade` are **not** configurable anywhere in Settings.
This was the last candidate page. Both render as `A` on the employee record, so
they're hardcoded bands in the reference product.

**Ours creates real masters** (`salary_grades`, `experience_grades`) — a grade
that can't be edited is a grade HR will end up tracking in a spreadsheet.

---

## 3. Leave Settings

Tabs: **`Rules`** · `Leave Balance` ⬜
Sub-tabs: **`Leave Rules`** · `Assign Leave Rules` ⬜

### 3.1 Rules list

| Rule | Employees |
|---|---|
| Loss Of Pay | 0 |
| Maternity Leave | 0 |
| Paternity Leave | 0 |

> ⚠ **Discrepancy.** Admin Approvals showed live leave records of type
> `Casual Leave`, `Sick Leave` and `Earned Leave` (`06-approvals.md §1.4`) — none
> of which appear in this list. Either the list scrolls beyond the capture, or
> CL/SL/EL are seeded system types configured elsewhere. ⬜ Worth confirming; it
> decides whether leave types are fully user-defined or partly system-seeded.

### 3.2 `Loss Of Pay` — General Settings

Tabs: `General Settings` · `Advanced Settings` (carries a red ⓘ warning marker)

| Group | Field | Value |
|---|---|---|
| | Name | `Loss Of Pay` |
| | Description | `--` |
| | Leave Short Name | `LOP` |
| **Leaves Count** | Leaves Allowed in a Year | `365` |
| | Weekends Between Leave | `Not Considered` |
| | Holidays Between Leave | `Not Considered` |
| **Applicability** | Allowed under Probation | `Yes` |
| | Allowed under Notice Period | `Yes` |
| **Accrual** | Creditable On Accrual Basis | `No` |
| | Creditable On Present Day Basis | `No` |
| **Carry Forward** | Carry Forward Enabled | `No` |
| | Monthly Carry Forward | `No` |

### 3.3 Model

```sql
leave_types
  id, org_id, name, short_name, description,
  max_per_year int,
  count_weekends_between bool,      -- "Weekends Between Leave"
  count_holidays_between bool,      -- "Holidays Between Leave"
  allowed_in_probation bool,
  allowed_in_notice_period bool,
  accrual_basis bool,               -- credited periodically
  present_day_basis bool,           -- credited per day present
  carry_forward_enabled bool,
  monthly_carry_forward bool,
  is_paid bool,                     -- ⬜ not seen; LOP is unpaid by definition
  sort_order, is_active

leave_rule_assignments              -- "Assign Leave Rules"
  leave_type_id, scope 'org'|'department'|'employment_type'|'employee',
  scope_id, effective_from
```

**Three things this settles:**

1. **`Weekends/Holidays Between Leave` is the `Include Weekends` toggle** on the
   Add Leave form (`04-me.md §3`) — but configured **per leave type**, with the
   form's radio as the per-application override. So the derived `To Date`
   calculation reads: leave type default → application override → holiday calendar.
2. **`Allowed under Probation` / `Notice Period` are eligibility gates**, checked
   at application time against the employee's status. Another reason the approval
   engine needs a pre-acceptance validation step, not just routing.
3. **Two accrual models coexist** — periodic accrual and present-day accrual.
   The latter credits leave based on days actually worked, which is common for
   contract and field staff. The balance query cannot be a simple
   `allocated − taken`; it's a ledger.

```sql
leave_ledger_entries              -- append-only; balance = SUM(amount)
  employee_id, leave_type_id, entry_date,
  amount numeric,                 -- +credit / −debit
  reason 'accrual'|'opening'|'application'|'cancellation'|'encashment'|'lapse'|'carry_forward',
  source_ref uuid                 -- the leave application, if any
```

A ledger, not a counter. It's the only structure that survives back-dated
applications, cancellations, and mid-year policy changes — and it's what makes the
"Leave Balance" panel on the application form honest.

---

## 4. Not yet captured

- ⬜ `View Roster` per-employee calendar; `Import Roster Sheet` template
- ⬜ `Payroll cycle` dropdown options
- ⬜ Leave `Advanced Settings` (red ⓘ marker suggests required config)
- ⬜ `Leave Balance` tab · `Assign Leave Rules` tab
- ⬜ Whether CL / SL / EL are user-defined or system-seeded
- ⬜ Maternity / Paternity rule details
