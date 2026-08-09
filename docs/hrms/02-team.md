# HRMS — Team module

Captured: 2026-08-08 · batches 1–3
Tab strip: `Employee Directory` · `Employee-In-Out` · `Separation` · `Reports` ·
`Tickets` · `Admin Approvals` · `Pending Tasks` · `Admin-Regularization`

Team is the **manager/HR counterpart to `Me`** — same domains, but scoped to
other people rather than yourself.

---

## 1. Pages

| Page | Captured | Purpose |
|---|---|---|
| Employee Directory | ✅ list + Add form + **detail view** → `05-employee-record.md` | Employee master |
| Employee-In-Out | ✅ **§9** | Attendance register for the team |
| Separation | ✅ list → `05-employee-record.md §7` | Resignation / exit workflow |
| Reports | ✅ | Report launcher (§3) |
| Tickets | ✅ 3 views → `05-employee-record.md §8` | HR helpdesk |
| Admin Approvals | ✅ 7 sub-tabs, live data → `06-approvals.md` | Approval queue |
| Pending Tasks | ✅ → `06-approvals.md §4` | Aggregate task counter |
| Admin-Regularization | ✅ → `06-approvals.md §5` | Admin-side attendance correction |

---

## 2. Employee Directory

### Header actions
`Employee Ranking` · `Ex Employee` · `Team Ranking` · **`+ Add Employee`**

> `Ex Employee` is a **separate view**, not a filter chip. Implies employees are
> soft-archived on exit and excluded from the default list — `status` column plus
> a default filter, never a hard delete.

### Toolbar
`Search` · `Filter` · `Reset` · `Import ▾` · `Export ▾` · `Bulk actions ▾` ·
`Send Exit Formalities Email` · `Send Password Change Email` · `Delete`

The last three are **disabled until rows are checkbox-selected** — bulk operations.

> **`Send Password Change Email` confirms HR provisions employee logins from here.**
> Account creation is an HR action against an employee record, not self-signup.

### Table

| Column | Notes |
|---|---|
| ☐ | bulk-select checkbox |
| Name | |
| EMP Code | |
| Joining Date | `DD-MM-YYYY` |
| Reporting manager | `-` when unset |
| Designation | |
| Department | |
| Type | employment type — only populated for one row (`Probation`) |
| Actions | `⋮` overflow menu ⬜ contents not captured |

### Live data (6 rows)

| Name | EMP Code | Joining | Designation | Department | Type |
|---|---|---|---|---|---|
| Sanjay Gupta | `EMP6` | 23-07-2026 | Financial Analyst | Finance | – |
| Anjali Singh | `EMP5` | 23-07-2026 | HR Specialist | HR | – |
| Vikram Patel | `EMP4` | 23-07-2026 | Sales Executive | Sales | – |
| Priya Sharma | `EMP3` | 23-07-2026 | Marketing Manager | Marketing | – |
| Rajesh Kumar | `EMP2` | 23-07-2026 | Software Engineer | Engineering | – |
| Anish Trivedi | `791` | 23-07-2026 | – | – | Probation |

Departments seen: Finance, HR, Sales, Marketing, Engineering.

> **Two employee-code formats coexist** — `EMP2…EMP6` (auto-generated, prefix +
> sequence) and `791` (manually entered). The Add form confirms this:
> *"Leave blank to auto-generate."* So the code is a nullable-on-input,
> always-populated-on-save, **per-org unique** string. Not an integer.

---

## 3. Reports page

Three cards of report links. None of the report screens captured yet.

**Employee Reports** — Employee Left Reports · Employee Joining Reports
**Leave Reports** — Leave Approval · Leave Balance
**Attendance Reports** — Attendance Register · Monthly Register · In - Out Register ·
Attendance Regularization · Penalty Violation Report · Penalty Summary Report ·
Punch Rejection Report

> Three separate penalty/rejection reports imply an attendance **penalty engine** —
> rules flagging late marks, short hours and invalid punches, each with a
> consequence. Confirmed by the Penalty Violations panel on the Add Leave form
> (`04-me.md §3`). This is the attendance → Payroll bridge.

---

## 4. Team Ranking

Route: `/{orgId}/team-ranking`. Title `Team Rank`.
Actions: `+ Add Team Rank` · `Back`
Toolbar: `Filter` · `Export ▾` · `Chart` · `Delete` (bulk, checkbox column present)

### Columns
`Employee code` · `Employee name` · `Quarter` · `Rank` ·
`Quantity of Work` · `Quality of Work` · `Consistency` · `Mentoring Peers` ·
`Team Player` · `Pro-activeness` · `Conduct` · `Credit Score` ·
`Overall Percentage` · `Overall Score` ·
**`Employee Feedback`** · **`Appraisers Remarks`** · **`Areas of improvement`** ·
**`Next Level up scope`** · `Actions`

### Compared with `Me → Ranking`
Identical through `Overall Score`, then Team Ranking adds **four narrative fields**
the employee's own view does not show:

| Field | Likely author |
|---|---|
| Employee Feedback | the employee (self-assessment) |
| Appraisers Remarks | the appraiser |
| Areas of improvement | the appraiser |
| Next Level up scope | the appraiser |

> **⚠ Open visibility question.** Either (a) the employee genuinely cannot see
> their appraiser's remarks, or (b) `Me → Ranking` was merely truncated in the
> capture. This is a policy decision, not a UI detail — hidden appraiser remarks
> are a meaningful HR stance. **Confirm by scrolling `Me → Ranking` fully right.**

`Add Team Rank` implies rankings are **entered manually by a manager**, not
computed from KRA scores. ✅ **Resolved 2026-08-10: they are NOT linked — they are
two parallel appraisal systems.** See `13-performance-review.md §6`, which sets out
the decision to collapse both into one templated system. Original note follows.

computed from KRA scores. Whether the two are linked is ⬜ unknown — check
`Performance Review → Appraisals`.

---

## 5. Add Employee — complete form

Route: `Team → Employee Directory → + Add Employee`. Single long page, `Save` at foot.
`✱` = required as marked in the UI.

### 5.1 Personal Information

| Field | Type | Req | Notes |
|---|---|---|---|
| First Name | text | ✱ | |
| Middle Name | text | | |
| Last Name | text | ✱ | |
| Gender | select | ✱ | ⬜ options not captured |
| Date Of Birth | date | ✱ | |
| Father's Name | text | | |
| Mother's Name | text | | |
| Marital Status | select | | ⬜ options not captured |
| Personal Mail ID | email | ✱ | **distinct from work `Email`** |
| Personal Phone No | phone | ✱ | country selector, default `+91` |
| Address | textarea | | |
| Upload Video | file | | purpose unclear — intro/verification video? |

### 5.2 Qualification & Misc

| Field | Type | Req |
|---|---|---|
| Qualifications | text | |
| Hobbies | text | |

> Free text, not a repeatable sub-table. If you need "list every degree with
> institution and year", this needs to become a child table — the reference
> product can't do that.

### 5.3 Professional Details

| Field | Type | Req | Notes |
|---|---|---|---|
| Branch | select | ✱ | FK → Branch master |
| Department | select | ✱ | FK → Department master |
| Designation | select | ✱ | FK → Designation master |
| Salary Grade | select | | FK → **master not in Settings** ⚠ |
| Employee Type | select | ✱ | FK → Employment Type master |
| Experience Grade | select | | FK → **master not in Settings** ⚠ |
| Reporting Manager | select | ✱ | self-FK → employees |
| Asst. Reporting Manager | select | | self-FK → employees |
| Buddy | select | | self-FK → employees (onboarding mentor) |
| Email | text | ✱ | **work** email |
| Punching Employee Code | text | | ⓘ tooltip — biometric device identifier |
| Biomax Employee Email | text | | ⓘ tooltip — Biomax device account |
| Date of Joining | date | ✱ | |
| Experience | text | ✱ | placeholder `In Year` — numeric years |
| Referred By | text | | free text, **not** an employee picker |
| Employee Code | text | | placeholder `Leave blank to auto-generate` |
| Country | select | ✱ | |
| State | select | ✱ | greyed until Country chosen — **cascading** |
| District | text | | ⚠ free text while City is a select |
| City/Village | select | ✱ | greyed until State chosen — **cascading** |
| Pin Code | text | ✱ | |
| Appraisal | select | | FK → appraisal template/cycle |
| **Configure Payroll** | toggle | | **default `Yes` / ON** |

### 5.4 Upload Section
- `+ Upload Image` — profile photo
- `+ Upload Signature` — signature image, for generated letters/documents

Actions: `Reset` (disabled until dirty) · `Save`

---

## 6. What this form settles

**1. Three distinct person-relationships.** `Reporting Manager` (required),
`Asst. Reporting Manager`, and `Buddy`. All self-FKs to employees. The assistant
manager is almost certainly the **fallback approver** when the primary is
unavailable — the approval engine must support an alternate, not just a chain walk.

**2. `Configure Payroll` sits on the employee record.** A toggle, defaulting ON.
This is the HRMS → Payroll seam, made explicit at employee-creation time. It
means payroll enrolment is a property of the employee, and creating an employee
is what triggers payroll setup. Payroll is not a loosely-coupled downstream product.

**3. Biometric hardware integration is a first-class concern.**
`Punching Employee Code` and `Biomax Employee Email` are **device-side identifiers**
stored on the employee — Biomax is a biometric attendance vendor. Combined with
`Settings → Face Identity Vault`, attendance is captured by external hardware and
matched back by these keys, not by our employee id.

> Schema consequence: external identifiers belong in a dedicated
> `employee_external_ids (employee_id, system, external_id)` table, not as columns.
> Otherwise every new device vendor adds columns to the employees table forever.

**4. Two grade masters exist that Settings doesn't list.** `Salary Grade` and
`Experience Grade` are both selects on this form, but neither appears under
`Settings → Organization Structure`. They're configured somewhere we haven't
found — or hardcoded in the reference product. Ours gets real tables either way.

**5. Geography is a cascading 3-level reference set** — Country → State →
City/Village, with District as free text and Pin Code separate. The
select/free-text inconsistency on District is theirs; we should make District a
select too, or make City free text. Mixed is the worst option.

**6. `Referred By` is free text.** For us this should point at either an employee
or an ATS candidate source — it's a real linkage point being wasted as a string.

---

## 7. Cross-product linkage from this module

| Element | Links to |
|---|---|
| `Configure Payroll` toggle | **Payroll** — enrolment flag |
| `Salary Grade` | **Payroll** — drives salary structure |
| Employee created from a hire | **ATS** — candidate → employee conversion |
| `Referred By` | **ATS** — referral source |
| `Send Exit Formalities Email` / Separation | **Payroll** — final settlement |
| Punching code / Biomax email | External biometric hardware |

---

## 9. Employees-In-Out — the attendance day register

Captured 2026-08-10. Header actions: `Delete` *(disabled until rows selected)* ·
`+ Add Manual In-out`. Toolbar: `Filter` · `Reset` · `Export CSV` · `Import ▾`.

| Column | |
|---|---|
| ☐ | row select |
| Employee code | `EMP2`–`EMP6`, `791` |
| Employee name | |
| **In Date** | `09-08-2026` |
| In Time | `-` |
| Out Time | `-` |
| Duration(hr.) | `00:00` |
| Overtime(hr.) | `00:00` |
| Break Duration (min) | `0` |
| Comments | **`Weekoff.`** |
| Actions | `⋮` |

Live rows: all six employees for `09-08-2026` (a Sunday), then `08-08-2026`
(a Saturday) — every one with no punches and `Weekoff.`

---

### 9.1 ✅ Confirms the pre-generated day register

**Rows exist for every employee on a day nobody worked.** No punches, no times,
and yet a row per employee per date. That is the day register being *materialised*
by the `Attendance Register List` cron (`12-… §4.1`), not derived on read.

This was the single largest assumption in `10-foundation-spec.md`. It is now
observed.

### 9.2 ✅ The shift's week-off config is demonstrably driving the register

`General Shift` is configured `Weekoff Days: Sunday, Saturday` with
`Saturday Pattern: All Saturdays Off` (`12-… §1.2`). Both 08-08 (Sat) and 09-08
(Sun) came through as non-working for every employee.

So the resolution chain in `12-… §1.5` — roster → default shift → shift week-off
config → day register — is confirmed end to end.

### 9.3 ⚠ The day's status is a **free-text comment**, not a column

`Weekoff.` — with a trailing full stop — sits in `Comments`. There is no status
column. Which means the single most important fact about an attendance day is
stored as prose.

Consequences, all of them real:

- You cannot filter or group by it without string matching.
- `Weekoff.` / `Week Off` / `WO` will drift the moment a second code path writes it.
- Holiday, leave, on-duty and WFH days presumably land in the same field, so
  "how many days was this employee absent" becomes a `LIKE` query.
- Payroll consumes this. A payroll input that is a free-text string is a defect,
  not a convenience.

**Ours makes it a first-class enum**, with `comments` kept for humans:

```sql
attendance_days
  day_status text not null,
  -- 'present' | 'absent' | 'half_day' | 'week_off' | 'holiday'
  -- | 'on_leave' | 'on_duty' | 'wfh' | 'holiday_worked'
  comments text        -- free text, never load-bearing
```

### 9.4 ⚠ `In Date` — night shifts have no home

The column is `In Date`, not `Date`. For `Evening Shift 10:00—19:00` that is
harmless; for a night shift crossing midnight — which a facility-services company
running site security certainly has — the in-date and out-date differ, and the
register has nowhere to say which business day the row belongs to.

**Ours separates the business day from the punch timestamps:**

```sql
attendance_days
  work_date date not null,      -- the business day this row accounts for
  ...
attendance_punches
  punched_at timestamptz        -- may fall on the next calendar date
```

A 22:00→06:00 shift is then **one** row on `work_date`, with punches spanning two
calendar dates. Keying on `In Date` splits it into two half-rows and both look
like short days.

### 9.5 ✅ `Duration` and `Overtime` are stored on the day row

Confirms `12-… §1.6`: overtime is computed inside the attendance engine, per
shift, and **materialised** — payroll reads a number, it does not recompute one.

⚠ But note what is **not** here: there is no column for the penalty outcome. If a
late arrival produces `Half Day (Attendance)`, nothing on this row records it.
That is very likely why `Penalty Violation Report` and `Penalty Summary Report`
exist as separate reports rather than as a column (`02-team.md §3`).

**Ours stores it**, per `10-foundation-spec.md §6.2a`:
`attendance_days.payable_fraction` (`1.0 | 0.5 | 0`). Payroll must never re-run
the penalty engine, and a report is not a system of record.

⚠ Unit drift: `Duration(hr.)` and `Overtime(hr.)` in hours, `Break Duration (min)`
in minutes, side by side. Ours stores **minutes everywhere**, formats at render.

⚠ Null drift again: `In Time` renders `-` while `Duration` renders `00:00` on the
same non-working row. Ours: `—` for both.

### 9.6 ⚠ `Add Manual In-out` + `Delete` — a second, unapproved write path

Attendance can be created and **deleted outright** by an admin, with no approval
step and no visible trail. Meanwhile Regularization (`06-approvals.md §5`) is the
employee-requested, manager-approved path to change the same data.

Two paths to the same payroll input, one of them unaudited.

**Ours:**

1. **No hard delete.** A wrong row is voided, not removed — `is_void`, with the
   original values retained.
2. **Every manual write is attributed and reasoned** — `entity_events` with actor,
   timestamp and a required reason.
3. **The row carries its provenance**: `source = 'device' | 'web' | 'mobile' |
   'import' | 'manual_admin' | 'regularization'`. When payroll or an auditor asks
   why a day says 8 hours with no punches, the row answers.

`Import ▾` / `Export CSV` confirm bulk punch loading —
`attendance_punches.source = 'import'` (`09-org-settings.md §2.4`).

⬜ Not captured: the `⋮` row menu, the `Filter` panel, the `Add Manual In-out`
form, and the import template.

---

## 8. Not yet captured

- ⬜ Row `⋮` actions menu
- ⬜ Employee **detail / edit** view and its tabs — the read side of this record
- ⬜ `Filter` panel contents
- ⬜ `Import ▾` / `Export ▾` / `Bulk actions ▾` menus
- ⬜ Every dropdown's options (Gender, Marital Status, Employee Type, Salary Grade,
  Experience Grade, Appraisal)
- ⬜ What `Configure Payroll = Yes` reveals — does a payroll section appear?
- ⬜ `Ex Employee` view
- ✅ ~~6 other Team pages~~ — **all 8 Team tabs now captured**
- ⬜ 11 report screens *(deprioritised — read-only views over a defined schema)*
