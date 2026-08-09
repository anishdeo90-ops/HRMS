# HRMS — Performance Review module

Captured: 2026-08-10 · batch 13
Left rail → `Performance Review`

Module tabs: **Dashboard · Goals · KRA · Appraisals · Reports · Performance
Cycles ⬜ · Appraisal Templates ⬜**

Every screen is empty in this tenant (`0` everywhere), so this is a **structural**
capture — column sets and forms, no live data.

---

## 1. Dashboard

| KPI tile | Value |
|---|---|
| Total Review Instances | `0` |
| Finalized | `0` |
| Ongoing Cycles | `0` |
| **Avg. Performance Score** | **`—`** |

Panels: `APPRAISALS BY PHASE` *(no appraisal data available)* ·
`RATING DISTRIBUTION (FINALIZED)` · `RECENT PERFORMANCE ACTIVITIES`

> ✅ **`Avg. Performance Score` renders `—`, not `0`.** This is the empty-aggregate
> rule (`10-foundation-spec.md §8`) done **correctly** — and the HRMS Dashboard
> renders `Average Age: 0` for the same situation (`01-dashboard.md`). Two modules,
> two behaviours. Same pattern as the `NULL` vs `9999` split: the product contains
> its own counter-example, so our convention is not a preference, it is the half of
> the reference that is right.

`APPRAISALS BY PHASE` implies phase is a first-class field — confirmed in §5.

---

## 2. Goals — `Goals Management`

Sub-tabs: **My Goals · Team Goals · Goal Approvals** · button `+ Add Goal`

**Team Goals**
`Goal Title · Owner · Assigned to · Category · Period · Weightage · Progress ·
Status · Action`

**Goal Approvals**
`Goal Title · Employee · Category · Weightage · Approval Status`

### 2.1 `Owner` ≠ `Assigned to` — goals cascade

Two distinct people on one goal. That is the standard cascading-goal model: a
manager owns a goal and assigns it down, or an employee's goal rolls up to their
manager's. It also implies a goal may need a **parent goal** to express the
roll-up, which this list does not show.

```sql
goals
  id, org_id, title, description,
  owner_employee_id     fk,   -- who the goal belongs to
  assigned_to_employee_id fk, -- who must deliver it
  parent_goal_id        fk NULL,   -- cascade / roll-up
  category_id           fk,
  performance_cycle_id  fk,        -- "Period"
  weightage numeric,
  progress_percent numeric,        -- see §2.3
  status text
```

### 2.2 ⚠ Goal approval is a **ninth request type** — built separately

`Goal Approvals` is its own tab with its own column named `Approval Status`, and
it does **not** appear among the seven Admin Approvals sub-tabs
(`06-approvals.md §8`).

So the reference has two approval systems: one for HR requests, one for goals.
Different screens, different vocabulary, different status column names — and
neither can show a manager a single list of everything awaiting them. That is
exactly what `Pending Tasks` (`06-approvals.md §4`) was trying to do and could not.

**Ours routes goals through the same `approval_requests` engine**
(`10-foundation-spec.md §5`) as the other eight. A goal approval becomes a row
with `request_type = 'goal'`, and it lands in the same queue, with the same bulk
approve/reject, the same timeline, and the same notification events.

### 2.3 `Progress` needs a source

A progress percentage that HR types in by hand goes stale immediately. Either it
is self-reported through periodic check-ins — which need their own table and their
own history — or it is derived from linked KPI actuals.

```sql
goal_checkins
  goal_id, employee_id, checkin_date,
  progress_percent numeric, note text, created_by
```

Progress on the goal row is then **the latest check-in**, derived — same
append-only pattern as the leave ledger and probation events. ⬜ Which of the two
the reference intends is not visible from an empty list; the `+ Add Goal` form
would settle it.

---

## 3. KRA — `KRA Management`

Sub-tabs: **My KRAs · KRA Master** · button `+ Add KRA`

**My KRAs** — search placeholder *"Search my KPIs…"*
`KPI Code · KPI Name · Score · Measurement · Weightage · Assigned Date · Actions`

**KRA Master** — search placeholder *"Search KPIs…"*
`KRA Code · KRA Name · Measurement · Weightage · Status · Actions`

### 3.1 ⚠ `KRA` and `KPI` are used interchangeably — and they are not the same thing

The master calls them KRAs. The assigned view calls them KPIs. **Both search boxes
say KPI.** The product cannot decide, because it has collapsed two concepts into
one table:

| | Meaning | Cardinality |
|---|---|---|
| **KRA** — Key Result Area | an area of responsibility — *"Client Retention"* | 1 |
| **KPI** — Key Performance Indicator | a metric that measures it — *"Renewal rate ≥ 85%"* | many per KRA |

One KRA normally carries several KPIs. Flattening them means every KRA can have
exactly one measurement, and an area of responsibility that needs three metrics
has to be entered as three fake KRAs whose weightages must be hand-split.

**Ours separates them**, which costs one table and removes the naming confusion
entirely:

```sql
kras                      -- areas of responsibility
  id, org_id, code, name, description,
  performance_cycle_id fk, default_weightage numeric, is_active

kpis                      -- the metrics under a KRA
  id, kra_id fk, code, name,
  measurement_type text,        -- 'percentage' | ⬜ others
  target_value numeric, default_weightage numeric, is_active
```

### 3.2 `Create KRA` form

| Field | Req | Value / control |
|---|---|---|
| KRA Name | ✱ | text |
| **KRA Code** | | **`Auto-generated`** — disabled |
| Year | ✱ | text, placeholder `Enter Year (e.g. 2024)` |
| Time Period | ✱ | select — `Select Period` |
| Description | | textarea |
| Measurement Type | ✱ | select — **`Percentage`** |
| Default Weightage (%) | | number |
| Target Assignment | ✱ | select — **`All Employees`** |
| Active Status | | toggle, on |

### 3.3 ✅ The first auto-generated code in the product

`KRA Code` is `Auto-generated` and disabled — the only master in the entire
capture that generates its own code. Compare `Shift Code` (required, manual, and
**empty** on a live shift, `12-… §8.10`) and `Employee code` (free text — `791`
sits beside `EMP2`–`EMP6`, `02-team.md §9`).

**Ours generates codes everywhere**, with a per-entity prefix and sequence, and
allows an override only where a legacy system's identifier must be preserved —
in which case it belongs in `employee_external_ids`
(`10-foundation-spec.md §4.3`), not in the primary code field.

### 3.4 ⚠ `Year` + `Time Period` duplicate `Performance Cycles`

A free-text year and a period dropdown — while `Performance Cycles` exists as its
own module tab. So a KRA's period is entered as two loose values instead of
pointing at the cycle object that already models exactly that.

Consequences: `2024` / `2024-25` / `FY24` will all be typed; a KRA cannot be
re-used across cycles; and "show me everything in the FY25 cycle" has to string-match.

**Ours: `kras.performance_cycle_id` — a FK, no year field.** The cycle owns the
dates, and `Leave Year Cycle` (`12-… §2.3`) already establishes that
calendar-vs-financial year is a real distinction we must model once.

### 3.5 `Target Assignment: All Employees` — the third population selector

The same problem as `Assign Leave Rules` (`12-… §3.1`) and `Role-wise Limits`
(`09-org-settings.md §2.1`): pick a policy, choose who it applies to. Three
modules, three bespoke implementations.

**Ours uses one resolver** for all of them:

```sql
policy_assignments
  policy_type text,     -- 'leave_rule' | 'regularization_limit' | 'kra' | 'goal_template'
  policy_id uuid,
  scope text,           -- 'org'|'business_unit'|'department'|'designation'
                        -- |'employment_type'|'location'|'employee'
  scope_id uuid,
  effective_from date, effective_to date, priority int
```

Narrowest scope wins. Write it once, and every future module that needs "who does
this apply to" gets it free — which is the anti-hardcoding rule at the policy layer.

### 3.6 Master default vs assigned instance

`Default Weightage (%)` on the master, plain `Weightage` on `My KRAs`, plus
`Score` and `Assigned Date` that exist only on the instance. So assignment
**copies** the default and lets it be tuned per employee — the correct pattern,
and the same one `leave_types` → `leave_rule_assignments` uses.

```sql
employee_kpis
  employee_id, kpi_id, performance_cycle_id,
  weightage numeric,        -- copied from default, overridable
  target_value numeric, actual_value numeric, score numeric,
  assigned_date date, assigned_by
  unique (employee_id, kpi_id, performance_cycle_id)
```

⚠ Weightages must **sum to 100 per employee per cycle**. Nothing in the reference
enforces it, and an appraisal whose weights sum to 87 produces a meaningless score.
Ours validates on finalise.

⬜ `Measurement Type` options (only `Percentage` seen) — likely Number, Currency,
Rating, Yes/No. It decides how `Score` is entered and validated.

---

## 4. Appraisals — `Appraisal`

Sub-tabs: **My Appraisal · Team Appraisal · HR Appraisal**

| Sub-tab | Columns |
|---|---|
| My Appraisal | `Cycle · Template · Status · Action` |
| Team Appraisal | `Employee · Cycle · Template · Status · Action` |
| HR Appraisal | `Employee · Cycle · Template · Status · Actions` |

**One record, three lenses.** The only difference between the three is whether
`Employee` is shown — self, manager, HR. Not three tables and not three
workflows: one `appraisals` row filtered by the viewer's relationship to it,
which is precisely the subject-based RLS in `10-foundation-spec.md §7`.

*(`Action` vs `Actions` — the same header, singular on two tabs and plural on the
third.)*

---

## 5. ⭐ Reports — the appraisal state machine, revealed

Sub-tabs: **Performance Reports · Appraisal Summary** ⬜

| Tile | Value |
|---|---|
| Total Appraisals | `0` |
| Self Appraisal | `0` |
| Manager Pending | `0` |
| Manager Completed | `0` |
| HR Pending | `0` |
| Finalized | `0` |

Section heading: **`Reviews: Completed (HR approved)`**
`Employee · Email · Cycle · Template · Status · Final Rating · Completed At`
Toolbar: `Filter` · `Reset` · `Export`

### 5.1 The five phases

These tiles are not arbitrary metrics — **they are the workflow**, which is why
the Dashboard has an `APPRAISALS BY PHASE` panel:

```
self_appraisal → manager_pending → manager_completed → hr_pending → finalized
```

⚠ **But the sequence is not fixed** — §8.3 shows self-review and manager-review are
per-cycle toggles, so these five are the *maximum* set. The model is in §8.3, not
a flat enum on `appraisals`.

**HR is the final gate**, per *"Completed (HR approved)"* — a manager finishing a
review does not finalise it. That matters for `10-foundation-spec.md §7.1`
(appraisal transparency, decided in favour of the employee seeing everything):
the employee should see the outcome **at finalisation**, not when the manager
submits, or they will see a rating HR later changes.

Every phase transition writes `entity_events`, so the timeline answers "who sat on
this for three weeks" without a bespoke audit table.

⚠ `Email` as a column on a report is a derived value from the employee record —
never stored on the appraisal.

---

## 6. ⭐ Resolves the open question in `02-team.md §4` — there are **two** appraisal systems

`02-team.md §4` recorded `Team Ranking` and `Me → Ranking` and left "whether the
two are linked" as ⬜ unknown. With Performance Review captured, the answer is:
**they are not linked, and they are not the same system.**

| | Ranking (`Team` / `Me`) | Performance Review (this module) |
|---|---|---|
| Criteria | **seven fixed, hardcoded** — Quantity of Work, Quality of Work, Consistency, Mentoring Peers, Team Player, Pro-activeness, Conduct | **configurable** KRAs / KPIs with weightage |
| Period | `Quarter` | `Performance Cycle` |
| Output | `Credit Score`, `Overall Percentage`, `Overall Score` | `Final Rating` |
| Narrative | Employee Feedback, Appraisers Remarks, Areas of improvement, Next Level up scope | ⬜ presumably in the template |
| Workflow | none visible | five phases, HR-gated |
| Configurable? | **no** | yes — templates + cycles |

Two parallel appraisal systems, two vocabularies, two scores, neither aware of the
other. Almost certainly a V1 that was never retired when V2 arrived — the same
tell as `Leave Settings V2` in Cron Master (`12-… §4.6`).

### Our decision — one system

The seven Ranking criteria are simply a **competency template**: fixed-name,
equally-weighted, rating-scale items. That is a special case of an appraisal
template, not a separate product.

```
Ranking  →  appraisal_templates row: 'Quarterly Competency Review'
             ├─ 7 template items (competency type, rating scale, equal weight)
             └─ cycle type: quarterly

Performance Review → appraisal_templates row: 'Annual KRA Review'
             ├─ N template items (kpi type, weighted)
             └─ cycle type: annual
```

One `appraisals` table, one `final_rating`, one phase machine, one history. The
narrative fields already on Ranking — *Areas of improvement*, *Next Level up
scope* — become template items of type `text`, which is what the Performance
Review templates almost certainly already support.

That collapses two modules into one and means an employee has **one** performance
history rather than two that can disagree.

---

## 8. Performance Cycles — ✅ the object everything should FK to

List: `Cycle Name · Cycle Code · Type · Start Date · End Date · Status · Actions`
· `+ Add Cycle` · empty in this tenant.

### 8.1 `Create Performance Cycle`

| Field | Req | Control |
|---|---|---|
| Cycle Name | ✱ | text |
| **Cycle Code** | | **`Auto-generated`** — disabled |
| Cycle Type | ✱ | select — `Select Type` |
| **Review Template** | ✱ | select — `Select Template` |
| Start Date | ✱ | date |
| End Date | ✱ | date |
| **Applicable To** | ✱ | select — `All Employees` |
| — **Review Workflow & Settings** — | | |
| Self Review | | toggle **on** |
| Manager Review | | toggle **on** |
| **Skip Manager Review** | | toggle off |
| Self Review Start | ✱ | date |
| Self Review End | ✱ | date |
| Manager Review Start | ✱ | date |
| Manager Review End | ✱ | date |

*(An HR review window presumably sits below the fold — `HR Pending` is a phase in
§5.1. ⬜)*

### 8.2 ✅ Confirms §3.4 — the KRA `Year` field is redundant

The cycle carries `Cycle Type`, `Start Date` and `End Date` as first-class fields.
So `Create KRA`'s free-text `Year (e.g. 2024)` plus a separate `Time Period`
dropdown is duplicating an object that already exists two tabs away.

`kras.performance_cycle_id` stands, and the year field is dropped.

Second auto-generated code (`Cycle Code`), reinforcing §3.3.

### 8.3 ⭐ The phase machine is **configurable per cycle**, not fixed

`Self Review` and `Manager Review` are toggles. So the five phases in §5.1 are not
a hardcoded sequence — they are the **enabled stages of a particular cycle**. A
cycle with self-review off starts at manager review.

That changes the model materially: `appraisals.phase` cannot be an enum marching
through a fixed list. The stages belong to the cycle, and an appraisal points at
which one it is in.

```sql
performance_cycles
  id, org_id, name, code, cycle_type,
  start_date, end_date,
  appraisal_template_id fk,
  status text

performance_cycle_stages          -- ordered, per cycle
  id, cycle_id fk, sequence int,
  stage text,        -- 'self' | 'manager' | 'hr'
  is_enabled bool,
  opens_on date, closes_on date

appraisals
  ...
  current_stage_id fk → performance_cycle_stages,
  final_rating, completed_at
```

### 8.4 ⭐ Stages have **date windows** — phase transitions are time-driven

`Self Review Start/End` and `Manager Review Start/End` mean each stage opens and
closes on a schedule. So an appraisal advances for two reasons: *someone submitted*
**or** *the window closed*.

Two consequences:

1. **Another scheduled job** — `performance.advance_stage`, daily, closing expired
   windows and moving appraisals on. It belongs in `job_definitions`
   (`10-foundation-spec.md §9a`) with the same business-date idempotency rule.
2. **A non-submission must be an explicit outcome.** When a self-review window
   closes with nothing entered, the appraisal has to record *"self review skipped —
   window expired"* rather than silently advancing, or a manager reviews against a
   blank form with no explanation. That is an `entity_events` entry, not a null.

### 8.5 ⚠ `Manager Review` and `Skip Manager Review` are two flags for one decision

Both toggles exist, with no help text. `Manager Review = on` **and**
`Skip Manager Review = on` is a state the form permits and no one can interpret —
two booleans encoding what is at most a three-way choice.

**Ours: one field.** `performance_cycle_stages.is_enabled` per stage. If the intent
of "skip" is conditional — *skip when the employee has no reporting manager* —
then it is a rule on the stage, named as such:

```sql
performance_cycle_stages
  ...
  skip_when text NULL       -- 'no_approver' | NULL
```

Either way, one field cannot contradict itself.

### 8.6 ⚠ One template per cycle — engineers and sales get the same form

`Review Template` is required **on the cycle**, so every employee in that cycle
gets the same template. Differentiating means creating several cycles — so "Q3
FY26" becomes three cycles with three sets of dates to keep in sync, and the
Dashboard's `Ongoing Cycles` count stops meaning anything.

**Ours resolves the template through the same scope resolver** (§3.5): a cycle has
a default template, with per-scope overrides.

```sql
cycle_template_assignments
  cycle_id fk, appraisal_template_id fk,
  scope text, scope_id uuid, priority int
```

One cycle, one set of dates, the right form per population.

`Applicable To: All Employees` is the **fourth** appearance of the population
selector (after leave rules, regularization limits and KRA target assignment) —
`policy_assignments` now earns its keep four times over.

### 8.7 `Cycle Type` — the field that decides §6

⬜ Its options are the last thing needed to confirm the one-system design. If
`Cycle Type` includes **Quarterly**, then the Ranking screens are literally just a
quarterly cycle with a competency template, and §6's unification costs nothing
beyond a template type.

---

## 9. Appraisal Templates — ✅ §6's unification is free

List: `Template Name · Type · Rating Scale · Total Weightage · Status ·
Created By · Actions` · `+ Add Template` · empty in this tenant.

### 9.1 `Create Appraisal Template`

| Field | Req | Value |
|---|---|---|
| Template Name | ✱ | text |
| Template Type | ✱ | select — `Select Type` |
| Rating Scale | | select — **`1-5`** |
| Active Status | | select — `Active` |
| Allow Manager Override | | toggle, off |

**`Sections (weightages must total 100%)`** → `Section 1: New section (0%)`, collapsible:

| Field | Req | Value |
|---|---|---|
| Section Name | ✱ | text — placeholder **`e.g. Goals`** |
| **Section Type** | | select |
| Weightage % | ✱ | `0` |
| Mandatory | | toggle |

…then `⊕ Add Question` → `Question 1: New question`:

| Field | Req |
|---|---|
| Question | ✱ |
| **Question Type** | |
| Weightage % | |
| Mandatory | toggle |

### 9.2 ✅ Template → Sections → Questions, both levels **typed**

`Section Type` and `Question Type` both exist, and the section name placeholder is
literally `e.g. Goals`. So a template is not a KPI list — it is a **generic
weighted questionnaire** whose sections can be goals, competencies, KPIs or free
text.

**That settles §6 at no cost.** The seven Ranking criteria become one section:

```
Template: 'Quarterly Competency Review'   (cycle_type: quarterly)
└─ Section 'Competencies' (type: competency, weightage 70%)
   ├─ Quantity of Work        rating 1-5
   ├─ Quality of Work         rating 1-5
   ├─ Consistency             rating 1-5
   ├─ Mentoring Peers         rating 1-5
   ├─ Team Player             rating 1-5
   ├─ Pro-activeness          rating 1-5
   └─ Conduct                 rating 1-5
└─ Section 'Development' (type: text, weightage 0%)
   ├─ Areas of improvement    text
   └─ Next Level up scope     text
```

`Appraisers Remarks` and `Employee Feedback` from the Ranking screens are text
questions answered at different stages (§9.5). **Ranking needs no separate module,
no separate table, and no separate score** — it is one template row.

```sql
appraisal_templates
  id, org_id, name, template_type,
  rating_scale_id fk, allow_manager_override bool,
  is_active bool, created_by

appraisal_template_sections
  id, template_id fk, sequence int,
  name, section_type,               -- 'goals'|'kra'|'competency'|'text'| ⬜
  weightage numeric, is_mandatory bool

appraisal_template_questions
  id, section_id fk, sequence int,
  text, question_type,              -- 'rating'|'text'|'kpi'| ⬜
  weightage numeric, is_mandatory bool,
  kpi_id fk NULL                    -- when question_type = 'kpi'
```

`sequence` is ours, not theirs — the reference orders by creation, so a question
inserted in the middle is impossible.

### 9.3 ✅ *"weightages must total 100%"* — stated in the UI

The constraint I flagged as missing for per-employee KRA weightages (§3.6) is
**declared here**, in the section header. So the product knows the rule at template
level and appears not to enforce it at assignment level.

Ours enforces it at both, and at two levels here: **sections total 100% across the
template; questions total 100% within their section.** Question weight is
relative-within-section — otherwise adding a question to one section silently
re-weights every other section.

Validated on save *and* on cycle launch, since a template can be edited after
cycles reference it.

### 9.4 `Rating Scale: 1-5` — needs anchors, not just bounds

Template-level, so every rating question shares one scale. A bare `1-5` with no
labels means one manager's 3 is another's 4, and the `RATING DISTRIBUTION` panel
on the Dashboard compares numbers that don't mean the same thing.

```sql
rating_scales
  id, org_id, name, min_value, max_value
rating_scale_points
  scale_id fk, value int,
  label text,          -- 'Exceeds Expectations'
  description text     -- what earns it
```

Cheap to build, and it is the difference between a calibrated review and a number
someone picked.

### 9.5 ⭐ `Allow Manager Override` — and the transparency decision

A manager can override the computed score. That directly engages
`10-foundation-spec.md §7.1`, where we chose **full transparency — the employee
sees everything**.

An override that the employee cannot see makes that decision hollow: they'd see a
final rating that doesn't follow from the ratings shown to them, with no
explanation. So:

> **An override requires a reason, and the employee sees the computed value, the
> overridden value, and the reason.** Recorded in `entity_events`.

This also fixes the shape of responses. Each stage answers the **same** questions
independently — that is how self and manager ratings coexist on one form:

```sql
appraisal_responses
  appraisal_id fk, question_id fk,
  stage text,                       -- 'self' | 'manager' | 'hr'
  rating numeric, text_value text,
  answered_by, answered_at,
  unique (appraisal_id, question_id, stage)

appraisal_score_overrides
  appraisal_id fk, computed_score numeric, override_score numeric,
  reason text not null, overridden_by, overridden_at
```

### 9.6 ⚠ `Active Status` is a dropdown here, a toggle on the other two forms

`Create KRA` and `Create Performance Cycle` both use a toggle for `Active Status`.
This one uses a `Active` / … select. Same field, three forms, two controls.
Do-not-reproduce list.

⬜ `Template Type`, `Section Type`, `Question Type` and `Rating Scale` option lists
are all unseen. The one that matters: **whether `Question Type` includes a
KPI-linked type** that pulls the employee's actuals from §3.6. If it does, the KRA
module and the appraisal form are one score; if not, they are two.

---

## 7. Not yet captured

- ⬜ `Cycle Type` dropdown options (§8.7) · HR review window fields (§8.1)
- ⬜ `+ Add Goal` form — settles the `Progress` source (§2.3)
- ⬜ `Appraisal Summary` sub-tab
- ⬜ `Measurement Type` / `Time Period` / `Target Assignment` dropdown options
- ⬜ An appraisal open in each of the five phases — the actual review form

> ✅ **Answered in §9.** Templates are generic weighted questionnaires with typed
> sections and typed questions, so §6's one-system design costs nothing beyond a
> seeded template. Nothing outstanding here blocks the schema.
