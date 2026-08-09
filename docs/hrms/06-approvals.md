# HRMS — Approvals, Pending Tasks & Regularization

Captured: 2026-08-08 · batch 5
Pages: `Team → Admin Approvals` · `Team → Pending Tasks` · `Team → Admin-Regularization`

**First screens captured with real data.** Value shapes below are observed, not inferred.

---

## 1. Admin Approvals

Title: `Admin Approvals` · action `+ Add Manual Leave`

### 1.1 Sub-tabs — the complete request-type list

| # | Sub-tab | Request side seen? |
|---|---|---|
| 1 | Leave Approval | ✅ `Me → Leaves → Add Leave` |
| 2 | Leave Cancellation | ✅ button on `Me → Leaves` |
| 3 | On-duty Approval | ✅ `On-duty Regularization` button |
| 4 | C-OFF Approval | ✅ `C-OFF Application` button |
| 5 | WFH Approval | ✅ `WFH Application` button |
| 6 | WeekOff Approval | ✅ `Week-off Application` button |
| 7 | **Early In/Out Approval** | ❌ **no request-side button on `Me → Leaves`** |

> **Seven request types, not six.** `Early In/Out` has no counterpart button on the
> Me → Leaves toolbar, so it must be raised from somewhere else — most likely the
> attendance/in-out screen. ⬜ Find its request form.

### 1.2 Toolbar
`Search` · `Filter` · `Reset` · `Import ▾` · `Export XLS` · `Approve` · `Reject`

- Checkbox column present; `Approve` / `Reject` disabled until rows are selected
  → **bulk state transitions**, not one-at-a-time.
- **`Import` on an approvals screen** is unusual — bulk-loading historical leave
  records. Almost certainly for migration/backfill from a previous system. Worth
  having; worth keeping admin-only.

### 1.3 Columns
`☐` · `Employee code` · `Employee name` · `Manager` · `Application Date` ·
`Approval Date` · `Leave` · `From Date` · `Period` · `Leave Reason` ·
`Attachments` · `Status` · *(horizontal scroll — more columns beyond)*

### 1.4 Live data — 5 rows

| Emp code | Name | Application Date | Approval Date | Leave | From Date | Period | Reason | Status |
|---|---|---|---|---|---|---|---|---|
| EMP6 | Sanjay Gupta | 23-07-2026 | `-----` | Casual Leave | 08-07-2026 | 3 Days | Bank Work | 🟢 Accepted |
| EMP5 | Anjali Singh | 23-07-2026 | `-----` | Sick Leave | 11-07-2026 | 1 Days | Bank Work | 🟢 Accepted |
| EMP4 | Vikram Patel | 23-07-2026 | `-----` | Earned Leave | 19-06-2026 | 1 Days | Vehicle Servicing | 🟠 Pending |
| EMP3 | Priya Sharma | 23-07-2026 | `-----` | Casual Leave | 15-07-2026 | 3 Days | Bank Work | 🟢 Accepted |
| EMP2 | Rajesh Kumar | 23-07-2026 | `-----` | Sick Leave | 22-06-2026 | 3 Days | Family Function | 🔴 Rejected |

---

## 2. ✅ RESOLVED — `Leave` vs `Leave Type`

Open question from `04-me.md §3`. Settled by this screen's live data.

The `Leave` column contains **`Casual Leave` / `Sick Leave` / `Earned Leave`**.

Therefore:
- **`Leave`** = the leave **category** master (CL / SL / EL / …) → configured under
  `Settings → Leave Settings`
- **`Leave Type`** = the **duration granularity** (Full Day / First Half / Second Half)

Confirmed independently by `Admin-Regularization`, which has a distinct
**`Half/Full Day`** column for exactly this axis.

```
leave_types          -- "Leave"      : Casual, Sick, Earned, Comp-off, …
                     -- accrual rules, carry-forward, max balance, paid/unpaid
leave_applications.day_portion  -- "Leave Type": full | first_half | second_half
```

Modelling these the wrong way round would have inverted two tables. Closed.

---

## 3. Observed value shapes

| Thing | Observed values |
|---|---|
| Status enum | `Pending` · `Accepted` · `Rejected` |
| Status colour | amber · green · red |
| Leave categories | `Casual Leave` · `Sick Leave` · `Earned Leave` |
| Period format | `3 Days`, `1 Days` |
| Date format | `DD-MM-YYYY` |
| Null renderings | `-` , `-----` , blank — **three different ones** |

### Defects to not reproduce
1. **`1 Days`** — no pluralisation. Ours: `1 day` / `3 days`.
2. **`Approval Date` shows `-----` on rows whose status is `Accepted`.** An approved
   request with no approval date means the transition wasn't recorded. Ours writes
   the timestamp and actor as part of the state change — that's what `entity_events` is for.
3. **Three different null renderings** across the app (`-`, `-----`, blank). Pick one.
4. **`Accepted` here vs an `Approved` column on Admin-Regularization** — the same
   concept under two names. Ours uses one vocabulary throughout: `approved`.

---

## 4. Pending Tasks

Title: `Pending Tasks`. Search box. Pagination: `< 1 >` · `25 / Page`.

| Column | |
|---|---|
| Title | `Leave Requests` |
| Count | `1` |

`Total Records Count is 1`

> **This is an aggregate counter, not a task list.** One row per task *type* with a
> count, presumably drilling through to the queue. The `1` reconciles exactly with
> the single `Pending` row (EMP4 Vikram Patel) in Admin Approvals — so it's a live
> rollup over the approval queues, not a separate tasks table.
>
> Ours: a `SELECT type, count(*) FROM approval_requests WHERE status='pending' AND
> approver = me GROUP BY type`. No new table. If we later add non-approval tasks
> (onboarding checklist items, document renewals), they join the same rollup.

---

## 5. Admin Regularization

Title: `Admin Regularization`
Toolbar: `Search` · `Filter` · `Reset` · `Approve` · `Reject` (both bulk, checkbox column)

### Columns
`☐` · `Employee code` · `Employee Name` · `Date` · `Application Date` ·
`In Time` · `Out Time` · **`Expected In Time`** · **`Expected Out Time`** ·
`Reporting Manager` · `Reason` · `Half/Full Day` · `Status` · `Approved`

`Total Records Count is 0`

### 5.1 Expected vs actual — the penalty engine's input
The row carries **four times**: actual in/out (from the punch) and expected in/out
(from the employee's assigned shift). The delta between them is the entire basis for:

- late-mark detection → `Penalty Violation Report`
- short-hours detection → `Penalty Summary Report`
- and the regularization request itself, which is the employee contesting the delta

So `Expected In/Out Time` is **not stored on the attendance row** — it's resolved
from `employees.shift_id` → the shift definition for that date. Storing it would
mean every shift change silently rewrites history.

> This confirms the model sketched in `04-me.md §1`: an `attendance_days` register
> holding actuals, joined to shift definitions for expectations, with penalties
> computed from the comparison.

### 5.2 ⚠ `Status` and `Approved` are separate columns
Both present on the same table. Either `Approved` is the approver's name/date
(mislabelled), or it duplicates status. ⬜ Needs a populated row to disambiguate.

---

## 6. What this settles for the approval engine

Seven request types share one screen, one toolbar, one status enum, one bulk
approve/reject, and one pending-count rollup. That is a single engine wearing seven
hats — exactly as argued in `04-me.md §2`.

```
approval_requests
  id, org_id
  request_type   'leave' | 'leave_cancellation' | 'on_duty' | 'c_off'
                 | 'wfh' | 'week_off' | 'early_in_out'
  employee_id    → employees.id
  payload        jsonb          -- type-specific fields
  status         'pending' | 'approved' | 'rejected' | 'cancelled'
  current_step   int
  created_at
approval_steps
  request_id, step_no, approver_id, decision, decided_at, remarks
```

- `Manager` column → resolved from the requester's reporting line, not stored.
- Bulk approve = one transaction over many `approval_requests` ids.
- Every transition writes an `entity_events` row — which is what their missing
  `Approval Date` proves you need.

---

## 8. All seven sub-tabs — captured 2026-08-10

### 8.1 Column sets

**Leave Approval** *(§1.3)*
`Employee code · Employee name · Manager · Application Date · Approval Date ·
Leave · From Date · Period · Leave Reason · Attachments · Status`

**Leave Cancellation** — 0 rows
`Employee code · Employee name · Manager · Leave · Leave Date · Comment ·
Status · Cancel Application Date · Cancel Approval Date`

**On-duty Approval**
`Employee code · Employee name · Application Date · Manager · Date ·
On-duty Time · Reason · Status`

**C-OFF Approval**
`Employee code · Employee name · Branch · Extra Work Date · Extra Work Hours ·
Type · Leave Type · Reason · Comp-Off Status`

**WFH Approval**
`Employee code · Employee name · Application Date · Approval Date · Manager ·
From Date · No of Days · Reason · Status`

**WeekOff Approval** — 0 rows
`… same as WFH … · Reason · Approved · Status`

**Early In/Out Approval** — 0 rows
`Employee code · Employee name · Application Date · Approval Date · Date ·
Manager · Expected In Time Range · Expected Out Time Range · Reason · Status`

---

### 8.2 ✅ `C-OFF Approval` resolves the attendance→leave bridge

`Extra Work Date` · `Extra Work Hours` · `Type` · **`Leave Type`**

This is the mechanism predicted in `12-advanced-settings-cron-holiday.md §1.6`,
confirmed: a comp-off request **names the attendance day that earned it**, carries
the hours worked, and **specifies which leave type receives the credit**.

```
attendance day (week-off / holiday worked)
   → C-OFF request  (extra_work_date, extra_work_hours, type)
   → approved
   → leave_ledger_entries  (+credit, leave_type_id, reason 'accrual', source_ref)
```

Two things follow:

1. **Comp-off is requested, not automatic.** Working a week-off does not silently
   credit leave; the employee raises it and a manager approves. That is the safer
   design and we should keep it — with the shift's `Extra Hours Calculation =
   comp_off` deciding whether the button is even *offered*.
2. **`Leave Type` on the request is the field the deduction dropdown was missing.**
   Comp-off says which leave type it credits; `Deduct Leave Balance`
   (`12-… §8.8a`) never says which it debits. The product already knows the field
   is necessary — it just omitted it on the other side. Our
   `deduction_types.leave_type_id` is the same field, applied consistently.

⬜ `Type` — presumably Half Day / Full Day comp-off earned. Worth one glance.
⚠ `Branch` appears **only** on this tab, and `Comp-Off Status` is a third distinct
status column name.

### 8.3 ✅ `Early In/Out Approval` — the open question, answered

`06-approvals.md §1.1` flagged that Early In/Out has no request button on
`Me → Leaves`. Its columns explain why: **`Expected In Time Range` /
`Expected Out Time Range`**.

It is not a leave-type request at all — it is a **per-day override of the shift's
check-in/out windows** (`12-… §8.3`). The employee asks to shift their punch
window for one date, which is why it is raised from the attendance screen rather
than the leave toolbar.

The word *Range* confirms the windows are start/end pairs, matching the four
window fields on the shift.

```sql
attendance_window_overrides        -- what an approved Early In/Out produces
  employee_id, work_date,
  checkin_start, checkin_end, checkout_start, checkout_end,
  source_request_id fk
```

Resolution order for a day's expected window becomes:
`approved override → roster shift → default shift`.

### 8.4 ⭐ Eight request types, three targets

Every request in the product resolves to a write against one of three stores.
This is the taxonomy the approval engine must implement:

| Request | On approval, writes to |
|---|---|
| Leave | leave ledger — **debit** |
| Leave Cancellation | leave ledger — **reversal** of a specific prior debit |
| C-OFF | leave ledger — **credit** (§8.2) |
| On-duty | attendance day — present without punches |
| WFH | attendance day — present, location override |
| Early In/Out | attendance day — expected-window override (§8.3) |
| Regularization | attendance day — corrected punches (§5) |
| WeekOff | **roster entry** — `is_week_off` swap |

> `WeekOff Approval` writing to `roster_entries` is the confirmation that roster
> (`09-org-settings.md §1`) is the right home for date-level shift assignment —
> an approved week-off swap has to land somewhere date-specific, and the shift
> definition is org-level.

**Leave Cancellation is a child request**, not a status change. It has its own
application and approval dates *alongside* the original leave's date, so the
original request stays intact and the cancellation is separately approvable.

```sql
approval_requests
  ...
  parent_request_id fk NULL      -- cancellation → the leave it cancels
```

Critically: **the ledger reversal is written when the cancellation is *approved*,
not when it is raised.** Until then the leave is still consumed. A status flag on
the original request could not express that intermediate state.

### 8.5 ⚠ What the seven tabs share — and the defect they prove

Strip the type-specific columns and every request has the same core:

```
employee · application date · approval date · manager · reason · status
```

The differences are only in the **subject** — which dates, which hours, which
window. That is exactly the generic engine in `10-foundation-spec.md §5`, now
confirmed across all seven rather than inferred from one.

But the reference implements them as seven separate screens, and it shows:

- **Three different status column names**: `Status`, `Approved` + `Status`
  (WeekOff, and Admin-Regularization §5.2 — the same duplication defect twice),
  and `Comp-Off Status`.
- **`Approval Date` is missing** on On-duty and C-OFF, present on the other five.
  The same fact, dropped from two screens.
- **`Branch`** appears on exactly one tab.
- `Approve` / `Reject` bulk buttons are consistent — the one thing that is.

**Ours: one `approval_requests` table, one status enum, one timeline, one
approval UI parameterised by request type.** A new request type becomes a row in
a type registry plus a payload shape — not a new screen with its own vocabulary.

---

## 7. Not yet captured

- ⬜ `+ Add Manual Leave` form
- ⬜ `Filter` panel contents · `Import ▾` template
- ⬜ Columns beyond `Status` on Leave Approval (horizontal scroll)
- ⬜ A populated Admin-Regularization row
- ⬜ C-OFF `Type` options (§8.2)
- ✅ ~~6 other sub-tabs~~ — captured, §8
- ✅ ~~`Early In/Out` — where raised?~~ — resolved, §8.3
