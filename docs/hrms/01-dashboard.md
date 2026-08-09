# HRMS — Dashboard

Captured: 2026-08-08 · batch 1
Route: `/{orgId}/dashboard` (inferred from the announcement URL pattern)

Layout: two columns. Main column (≈70%) holds the greeting banner, action row,
KPI cards and widget grid. Right rail (≈30%) holds Announcements.

---

## 1. Greeting banner

Full-width blue panel, watermark logo on the right.

| Element | Observed value | Source |
|---|---|---|
| Greeting | `Good morning, Anish Trivedi !` | time of day + `employees.first_name last_name` |
| Sub-line | `anishdeo90@gmail.com` | login email |
| 💼 icon | `N/A` | designation — unset for this user |
| 🪪 icon | `791` | employee code |
| 👤 icon | `N/A` | reporting manager — unset |
| 📅 icon | `23-07-2026` | date of joining |

Greeting varies by time of day — batch 0 showed `Good evening`, this one `Good morning`.
Date format throughout: **DD-MM-YYYY**.

---

## 2. Action row

Right-aligned, above the KPI cards.

| Button | Destination |
|---|---|
| 📅 Team Calendar | Month-grid calendar — see `03-calendar.md`. **Scope expanded**: becomes the org-wide shared calendar, not the reference's bare grid. |
| 📄 Reports | `Team → Reports` (see `02-team.md`) |
| **+ Add Employee** | `Team → Employee Directory → Add Employee` form |

---

## 3. KPI cards

Five cards, 3-up then 2-up.

| Card | Value | Sub-label | Computation |
|---|---|---|---|
| Total Employees | `6` | — | count of active employees |
| Average Experience | `0` | `Years` | avg total prior + current experience |
| Average Age | `0` | `Years` | avg from `date_of_birth` |
| Average Tenure | `0` | `Years at company` | avg from `date_of_joining` |
| Attrition Rate | `0%` | `0% vs Last quarter` | exits ÷ headcount, with QoQ delta |

> **Data-quality note:** Average Experience and Average Age both read `0`
> against a headcount of 6. Either those fields are unpopulated for all 6, or
> the aggregate ignores nulls incorrectly. Our version should return `—`, not
> `0`, when the denominator is empty. `0 Years` is a wrong answer, not a missing one.

---

## 4. Employee Statistics (chart)

| Control | Options |
|---|---|
| Chart type | `Bar` \| `Line` toggle |
| Department filter | `All Departments` ▾ |
| Period filter | `Last 12 Months` ▾ |

- X axis: rolling 12 months, `Sep … Aug`
- Y axis: `0–8`, integer
- Series: **New Hire**, **Exits** (legend below chart)
- Only one bar populated (Jul) — matches the single recent joiner

---

## 5. Widget grid

### Today's Team Insights
Sub-label: current date `08-08-2026`. Filter: `All Branch` ▾

| Metric | Value |
|---|---|
| Total Available Employees | `0` |
| Present | `0` |
| Absent | `6` |
| Leave | `0` |
| WFH | `0` |

Source: today's attendance rows per employee. `Present + Absent + Leave + WFH`
should equal headcount — here `0+6+0+0 = 6` ✅.

### Upcoming Holidays
Empty state: *"NO UPCOMING HOLIDAYS"*. Calendar icon top-right.
Source: Holiday Calendar master, filtered forward from today.

### Upcoming Birthday
Empty state illustration. Source: `date_of_birth`, month/day match forward window.

### Gender Ratio
Donut chart. Filter: `All Branch` ▾
- `Female : 2`
- `Male : 3`

> **Note:** totals 5 against a headcount of 6 — one employee has no gender set,
> despite Gender being a required field on the Add Employee form. So the column
> is nullable in practice (legacy rows predate the requirement). Our schema
> should allow null and the chart must show an `Unspecified` slice rather than
> silently dropping the row.

### Upcoming Work Anniversary
Empty state: *"NO UPCOMING WORK ANNIVERSARY'S"*. Source: `date_of_joining`.

### Upcoming New Joinees
Empty state: *"NO NEW MEMBERS !!!"*.
**Linkage:** accepted ATS offers with a future joining date.

### Job Opening
Headline value: `0`

| Sub-metric | Value |
|---|---|
| New This Week | `0` |
| Active Openings | `+0` |
| On Hold | `0` |
| Current Strength | `0` |

**Linkage:** this is ATS data surfaced in HRMS. Reads `jobs` / requisitions.

### Total Employees
Headline value: `6`

| Sub-metric | Value |
|---|---|
| Last Week | `0` |
| New Joined | `+0` |
| Resigned | `0` |
| Current Strength | `6` |

### Mood Analytics
Filter: `Today` ▾ · button `See All`
- Y axis `0% – 100%`
- X axis buckets: `SAD`, `MEH`, `OKAY`, `GOOD`, `GREAT` (5-point, each with a face icon)

Source: the Survey / mood check-in module. Links to `More → Mood Analytics`.

---

## 6. Right rail — Announcements

- Header `Announcement` + `View all →` (goes to `More → Announcements`)
- Filter pills: `All` | `Recent`
- Empty state illustration

---

## 7. Derived requirements

1. Dashboard is **entirely aggregate reads** — no writes. Good candidate for a
   single `/api/hrms/dashboard` endpoint returning one payload, the way the ATS
   dashboard already works.
2. Every widget needs an explicit **empty state**, not a zero.
3. Two filter axes recur: **Branch** and **Department**. Both must exist as real
   FK'd masters before this screen can be built.
4. Three widgets read from outside HRMS (Job Opening, Upcoming New Joinees, and
   indirectly Mood Analytics). These are the first concrete uses of the
   cross-product linkage layer.

---

## 8. Not yet captured

- ⬜ Mood Analytics → `See All`
- ⬜ Announcement populated state / Add Announcement form
- ⬜ Any dashboard variation for non-admin roles
