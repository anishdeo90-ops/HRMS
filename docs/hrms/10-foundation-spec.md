# HRMS — Foundation Specification

Status: **draft for review**
Version: **v2** — 2026-08-10
Written: 2026-08-08
Derived from: `00-navigation-map.md` … `15-more-module.md`

This spec defines the layer every HRMS module sits on, and the seams to the ATS
and Payroll. Nothing else gets built until it is agreed, because everything else
has a foreign key into it.

**Out of scope here:** module internals (leave rules, attendance penalties,
appraisal instruments, onboarding, survey, learning). Each gets its own spec
written *against* this one.

---

## 0. Changelog

### v2 — 2026-08-10 — commercial-readiness amendments

Target buyer set: **Indian mid-market, software-first but industry-agnostic**,
competing with Keka, greytHR and Zoho People. Payroll is deferred to a later
product; v2's job is to make that deferral additive rather than a rewrite.

Everything below is either a **new table with no dependents** (as cheap to add
today as later, but needed by build-order steps 1–8 regardless) or a **change to
`hrms.employees`** (cheap today, expensive once the record is built out).

| § | Change | Reason |
|---|---|---|
| 3.1 | **amend** — `organizations.timezone`, `fiscal_year_start_month`; `branches.timezone`; `organization_products.plan_key` + `limits` | §9a resolves cron "in the ORG's timezone", which had no column. Entitlement limits make the commercial layer additive |
| 3.5 | **new** — `custom_field_definitions` + `custom_fields jsonb` on entities | Without it, every tenant that wants three extra fields is a schema migration |
| 3.6 | **new** — `form_definitions` / `form_sections` / `form_fields` | Gives Principle 6 ("required-ness belongs to forms") somewhere to live. **Absorbs and deletes `profile_completion_rules`.** Answers the eye-icon open question |
| 3.7 | **new** — `attachments` | Retires six scattered `*_url` columns; gives §7 read-logging coverage of sensitive *files*, not only sensitive *fields* |
| 3.8 | **new** — `sequences` | Employee code, ticket, asset, letter, requisition, claim — one allocator, per-tenant format, financial-year reset |
| 4.1 | **amend** — employment columns move out to §4.5; media columns move to §3.7 | See §4.5 |
| 4.2 | **amend** — `employee_statutory` becomes key-value; Aadhaar/PAN move here from Banking | India ships as ~7 seed rows instead of a schema. Removes the multi-country wall at near-zero cost |
| 4.4 | **amend** — completion and shift-as-of-date re-sourced | Follows from §3.6 and §4.5 |
| 4.5 | **new** — `employee_assignments`, effective-dated | The single most expensive change to retrofit. Without it no point-in-time question is answerable |
| 5.2 | **new** — `approval_delegations`, escalation, reminders | "My manager is on leave" is the most common real-world HRMS complaint. Also finally gives `asst_manager` a rule that invokes it |
| 6.4 | **new** — notification infrastructure | §9a referenced `notification_events`; it was never defined |
| 10 | **new** — payroll seams reserved | Makes the deferred payroll product additive |
| 9 | **amend** — build order updated | |

**Deliberately excluded from v2**, as additive later or belonging to their own
spec: full multi-country packs, SSO/SCIM, subscription and billing tables, the
report engine, generic saved views, generic comments/mentions, async export jobs,
custom *objects* (tenant-defined entities), and conditional form-field logic.

---

## 1. Principles

These are the rules the whole build is measured against. They come from the
"no hardcoding, everything linked" requirement.

1. **One canonical record per fact.** An employee's department lives in exactly
   one column. No module copies a name, code, or label it can join for.
2. **Lookups are foreign keys, never strings.** If the reference product stores a
   name (`Recruiter Name`, `Source of Hire`, `Referred By`), ours stores an id.
3. **Cross-product relationships go through `entity_links`.** Never a
   `payroll_employee_id` column on an HRMS table, or vice versa.
4. **State changes are events.** Every transition writes to `entity_events` with
   actor and timestamp. Status columns hold *current* state only.
5. **Derived values are derived.** Expected shift times, leave balances, ESI
   applicability, profile completion — computed on read, not stored and stale.
6. **Required-ness belongs to forms, not columns.** The reference proves this: the
   create form has ~30 fields, the record has ~55. *(v2: implemented as
   `form_fields.is_required` — §3.6.)*
7. **One vocabulary.** One status enum, one date format, one null rendering,
   across all four products.
8. **History is a period, not an edit — added v2.** Anything a report may need to
   ask *"as of when"* is stored as a dated range, never overwritten in place.
   Employment (§4.5) is the first case; compensation will be the second.
9. **Configuration is data, not code — added v2.** Field layout, required-ness,
   custom fields, number formats and notification templates are rows a tenant
   admin can change. If changing it needs a deploy, it is in the wrong place.

---

## 2. Architecture decisions

### 2.1 Tenancy — **multi-tenant, org resolved from session**

Every table carries `org_id`. RLS enforces isolation. A person may belong to more
than one org via `org_members`.

**We do not adopt the reference's `/{orgId}/page` URL scheme.** Org comes from the
session, with an org switcher in the UI for multi-org users. Reasons: the org id
in a URL is an information leak, it makes every bookmark brittle, and it forces
every route and API handler to validate that the path org matches the session org
— a check that will eventually be forgotten somewhere.

> ✅ **Decided 2026-08-08 (Anish): multi-tenant SaaS.** `org_id` is mandatory on
> every table in every schema, RLS isolates by it, and no query may omit it.
> Org is resolved from the session; the URL stays clean.

### 2.2 Database layout — schema per product

| Schema | Owns |
|---|---|
| `public` | shared core: identity, org structure, masters, links, events |
| `hrms` | employees and all HR module tables |
| `payroll` | compensation, pay runs, statutory |
| `crm` | clients, deals |
| *(ATS stays in `public` for now)* | existing tables, unmoved |

Rationale: ownership is unambiguous and a product can be extracted later without
untangling a shared namespace. Cost: each schema must be exposed in Supabase API
settings, RLS written per schema, and clients call `.schema('hrms')`. Accepted.

**The existing ATS tables are not moved.** That migration is optional, separate,
and not required for HRMS to ship.

### 2.3 Identity — one `profiles`, many `employees`

```
auth.users            (Supabase)
  └─ public.profiles          one login = one profile, shared across all 4 products
       └─ hrms.employees      HR record; profile_id NULLABLE
```

**`profiles` and `employees` stay separate.** An employee can exist before they
have a login (data migration, pre-joiners), and a login can exist without an
employee record — your external recruiters already do exactly this
(`profiles.is_external_recruiter` in the ATS).

One profile across products is what makes the waffle switcher work: switching
from ATS to HRMS must not re-authenticate.

---

## 3. Shared core (`public`)

### 3.1 Organisation & membership

```sql
organizations
  id uuid pk,                      -- internal; NEVER appears in a URL
  slug text unique,                -- user-editable, [a-z0-9-]; the public handle
  code text,                       -- short org code, distinct from slug
  name text, legal_name text,
  logo_url text, favicon_url text, -- per-tenant white-labelling
  country_code text, currency_code text default 'INR',
  date_format text default 'DD-MM-YYYY',
  timezone text not null default 'Asia/Kolkata',   -- v2; see note
  fiscal_year_start_month int not null default 4,  -- v2; 4 = April
  is_active bool, created_at, updated_at

organization_settings              -- key/value org config
  org_id fk, key text, value jsonb,
  primary key (org_id, key)
  -- smtp.*, upload.max_file_mb, upload.allowed_types, upload.max_files

org_members
  id uuid pk, org_id fk, profile_id fk,
  role text,                      -- see 3.2
  is_default bool,
  unique (org_id, profile_id)

organization_products             -- entitlements; drives the waffle switcher
  org_id fk, product text,        -- 'ats' | 'hrms' | 'payroll' | 'crm'
  is_enabled bool, valid_until date,
  plan_key text,                  -- v2; 'trial' | 'starter' | 'growth' | 'enterprise'
  limits jsonb,                   -- v2; {max_employees, max_storage_gb, max_custom_fields}
  primary key (org_id, product)
```

`organization_products` is what `components/product-switcher.tsx:34` is waiting
for — the `TODO` there filters the waffle by entitlement.

**⏱ Timezone — added v2.** `§9a` states that `schedule_cron` is "resolved in the
ORG's timezone", but no such column existed. Two rules:

- `organizations.timezone` is the default for scheduled jobs and org-wide reporting.
- `branches.timezone` (nullable, inherits the org) is what **attendance day
  boundaries** resolve against. An org with a Mumbai and a Dubai branch has two,
  and a punch at 23:50 belongs to a different `work_date` in each.

**📅 `fiscal_year_start_month` — added v2.** Leave accrual cycles, appraisal
cycles, the `financial_year` reset in `§3.8`, and eventually Form 16 all need to
know where the year starts. India is April, but MNC subsidiaries commonly run
January — so it is a column, not a constant.

**💳 `plan_key` / `limits` — added v2.** The entitlement hook. `is_enabled` answers
*"can this org open HRMS"*; `limits` answers *"how much of it"*. Enforced at the
point of creation (employee #251 on a 250-seat plan, custom field #21 on a
20-field plan). Everything else about subscriptions — pricing, invoicing, dunning,
proration — stays out of the foundation and lands as its own spec, which is only
possible *because* this hook exists now.

### 3.2 Roles & permissions

The reference has `Settings → Permission Management`, so roles are configurable,
not a hardcoded enum.

Confirmed by `07-settings.md §4`: 12 seeded roles per tenant, editable, with a
`Superadmin` predating the tenant — so system roles exist alongside org roles.

```sql
roles
  id uuid pk, org_id fk NULL,     -- NULL org_id = global system role
  key text, name text,
  is_system bool,                 -- system roles cannot be renamed or deleted
  unique (org_id, key)

permissions
  id uuid pk,
  group_key text,                 -- 'employee_management', 'attendance', …
  key text unique,                -- '<group>.<module>.<action>'
  description text
  -- e.g. employee_management.banking_tab.read
  --      attendance.regularization.update

role_permissions
  role_id fk, permission_id fk, primary key (role_id, permission_id)
```

**Action set:** `read` · `create` · `update` · `delete`. The reference's `All`
column is a UI convenience — expand it to the four on save, never store it.

**Granularity:** the reference permissions individual *tabs* of the employee record
(`Employee Banking Tab`, `Employee Additional Info Tab`). Ours goes one level finer
to *fields* (§7), which is a strict superset.

**Two of their 16 groups we deliberately drop:**
- `RECRUITMENT` — that's the ATS, a separate product governed by
  `organization_products` and its own permissions. Duplicating it here creates two
  places to grant the same access.
- `PERFORMANCE & GOALS` vs `PERFORMANCE MODULE` — legacy duplication in the
  reference. One performance group.

**Roles grant screens, never scope.** `Reporting Manager` exists both as a role and
as `employee_assignments.manager_id` (§4.5). The relationship is the source of truth for *whose rows
you can see*; the role only decides *which screens you can open*. Conflating them
is how people end up seeing the wrong team's data.

**⚠ Required change to the existing ATS.** `lib/types.ts:1` currently reads:

```ts
export type Role = "admin" | "hr_manager" | "recruiter" | "hod" | "candidate";
```

There is no `employee`. The entire `Me` module assumes every employee logs in.
Minimum change: add `"employee"` and `"manager"`. Better: treat that enum as the
*ATS's* coarse role and let HRMS authorise through `role_permissions`.

### 3.3 Org structure masters

All from `Settings → Organization Structure`. All carry
`org_id, name, code, sort_order, is_active, created_at, updated_at`.

| Table | Notes |
|---|---|
| `branches` | physical office/location |
| `business_units` | **`head_employee_id` FK** — the source of `Business Head` on the employee record, and how `approver_source = 'business_head'` resolves (§5). Owns departments; not a tree level (`11-org-structure-masters.md §0`) |
| `departments` | **`parent_id` self-FK** — covers "Sub-Department" as one table. Confirmed necessary: the reference's Department list has no parent field (`11-org-structure-masters.md §1a`) |
| `designations` | job title. **`function_role_id` + `salary_grade_id` FKs** so setting a title fills in two more fields |
| `function_roles` | job family — survives promotion, designation doesn't. **v2:** `employee_assignments.function_role_id` defaults from designation (§4.5) |
| `employment_types` | contract nature only: Permanent / Contract / Intern / Consultant / Part-time. **Not `Probation`** — see below |
| `salary_grades` | ⚠ **not in the reference's Settings menu but used on the employee form** |
| `experience_grades` | ⚠ same |
| `work_locations` | distinct from branch (employee record has both) |
| `shifts` | name, start, end, break, grace minutes |
| `holidays` | `branch_id NULL = all branches`, `is_optional`. Optional holidays need `employee_holiday_elections` + a quota (`12-advanced-settings-cron-holiday.md §5`) |
| `branches` ⟵ | **need `latitude` / `longitude` / `radius_m`** — geo-fencing is a shift setting that resolves against a location (`12-… §1.7`) — **and `timezone` (v2, nullable, inherits org)**, because the attendance day boundary is per-branch (§3.1) |
| `announcement_categories` | |
| `document_types` | name, is_mandatory, has_expiry — **seeds the doc checklist** |

> `departments.parent_id` replaces a separate `sub_departments` table. Two tables
> for one hierarchy is the classic mistake — it breaks the moment someone needs a
> third level. The reference does exactly this, now confirmed by observation.

**Probation is not an employment type.** The reference lists `Probation` alongside
contract types, which forces an edit-on-confirmation and loses the history. Ours
derives it: `date_of_joining + probation_period_days` vs `date_of_confirmation`,
with `is_confirmed` as the flag. Employment type stays orthogonal.

**Masters are soft-deleted, never removed.** `is_active = false` hides a value from
dropdowns; historical records holding it must stay resolvable forever. The
reference offers a bare 🗑 with no visible guard.

### 3.4 Generic lookups

The ATS already has a `masters` table (`type`, `name`, `code`, `metadata`,
`sort_order`, `is_active`). **Reuse it** for flat dropdowns with no structure:
gender, marital status, blood group, nationality, relationship, expense type,
leave reason, ticket priority, source of hire.

Rule: **structure → real table; flat list → `masters`.** A generic bag cannot
express hierarchy or typed relationships, and hierarchy is what every HR report
depends on.

> This also fixes the reference's creatable-combobox defect on `Expense Type`
> (`04-me.md §5`). Adding a type becomes an admin action, not a side effect of
> typing.

### 3.5 Custom fields — added v2

Selling one product to many companies means every tenant wants three to eight
fields nobody anticipated. Without a mechanism, each one is a schema migration
against a live multi-tenant database — which is how a product stops shipping.

```sql
public.custom_field_definitions
  id uuid pk, org_id fk
  entity      text,     -- 'hrms.employees' | 'ats.candidates' | 'hrms.assets' | …
  key         text,     -- snake_case; the jsonb key
  label       text,
  data_type   text,     -- text|number|date|boolean|select|multiselect
                        -- |employee|file|currency
  options     jsonb,    -- select/multiselect choices, when not using a master
  master_type text,     -- alternative: point at the existing `masters` table (§3.4)
  validation  jsonb,    -- {required, min, max, regex, max_len}
  is_sensitive bool,    -- inherits §7 wholesale: encrypted, masked, read-logged
  section_key text,     -- which §3.6 section it renders in
  sort_order  int, is_active bool,
  created_at, updated_at,
  unique (org_id, entity, key)
```

**Values live in a `custom_fields jsonb` column on the entity table itself**,
GIN-indexed — not in a separate values table.

The alternative — a `custom_field_values` EAV table — is more uniform and lets you
attach fields to an entity with no migration at all. It was rejected because it
costs a join and N extra rows on every employee read, and because Principle 1 says
a fact about a record belongs *on* the record. `ALTER TABLE … ADD COLUMN
custom_fields jsonb` is a one-line migration, done once per entity.

**The honest cost:** no database-level `FOREIGN KEY` or `UNIQUE` constraint is
possible on a custom field. Validation is enforced in the API against
`validation`. Accepted.

**Rules:**

- A definition is **soft-deleted** (`is_active = false`), never dropped — same
  reasoning as masters in §3.3. Historical values must stay readable.
- `key` is immutable once created. Renaming is a `label` change; renaming the key
  would orphan every stored value.
- Custom fields are **first-class**: importable by the bulk importer, filterable in
  lists, and readable by the future report engine. A custom field that can't be
  reported on is a text box, not a feature.
- Count is capped by `organization_products.limits->>'max_custom_fields'` (§3.1).

**Not in v2:** custom *objects* — tenant-defined entities with their own tables and
screens. That is a product in its own right, not a foundation feature.

### 3.6 Form definitions — added v2

Principle 6 says required-ness belongs to forms, not columns. Until now nothing
held it, so it would have ended up hardcoded in React — which is the same defect
one layer up.

```sql
public.form_definitions            -- org_id NULL = system default template
  id uuid pk, org_id fk NULL,
  entity   text,                   -- 'hrms.employees'
  form_key text,                   -- 'employee_create'|'employee_edit'|'employee_view'
  name text, is_active bool,
  unique (org_id, entity, form_key)

public.form_sections
  id uuid pk, form_id fk,
  key text, label text, sort_order int,
  is_collapsible bool,
  visible_to_roles uuid[]          -- NULL = everyone

public.form_fields
  id uuid pk, section_id fk,
  field_source text,               -- 'column' | 'custom'
  column_name   text,              -- when 'column'
  definition_id fk NULL,           -- when 'custom' → custom_field_definitions
  label_override text, help_text text,
  is_visible bool, is_required bool, is_readonly bool,
  sort_order int,
  visible_to_roles  uuid[],        -- NULL = everyone
  editable_by_roles uuid[],
  completion_weight numeric        -- replaces profile_completion_rules
```

**Four loose ends across the docs close here:**

1. **Principle 6 has a home.** `is_required` lives on the form row, so the same
   column can be mandatory on create and optional on import.
2. **The eye icon** beside the edit pencil on Employment Information
   (`05-employee-record.md §5`, open question) is `visible_to_roles`. Resolved.
3. **~30 fields on the Add form vs ~55 on the detail view** (`05-employee-record.md
   §6`) is two `form_key` rows over one entity. No branching in code.
4. **`profile_completion_rules` is deleted.** §4.4 defined a separate
   `(section, field, weight)` table; that is structurally identical to
   `form_sections` + `form_fields`. Two tables for one concept is the
   `sub_departments` mistake in §3.3, and completion falls out for free —
   per-section *and* rolled up, which is exactly the three-figure behaviour
   observed (`05-employee-record.md §3`).

Orgs clone the system-default forms (`org_id IS NULL`) at provisioning, so a new
tenant is never looking at a blank record layout.

**Not in v2:** conditional logic ("show Spouse Name when Marital Status =
Married"). The extension point is a `form_fields.visible_when jsonb` and it
touches nothing else in this spec.

### 3.7 `attachments` — added v2

Six columns across §4.1 and §4.2 store the same concept: `photo_url`,
`signature_url`, `intro_video_url`, `cancelled_cheque_url`, `document_url`,
`file_url`. One table replaces all of them.

```sql
public.attachments
  id uuid pk, org_id fk
  owner_product text, owner_entity text, owner_id uuid,
  purpose text,          -- 'employee.photo'|'employee.signature'|'employee.document'
                         -- |'bank.cancelled_cheque'|'education.certificate'|…
  storage_bucket text, storage_key text,
  file_name text, mime_type text, size_bytes bigint,
  checksum_sha256 text,
  scan_status text,      -- 'pending'|'clean'|'infected'|'skipped'
  is_sensitive bool,
  uploaded_by uuid, created_at,
  deleted_at timestamptz,
  index (owner_product, owner_entity, owner_id, purpose)
```

**Rules:**

- **Never store a URL.** Store the storage key; mint a short-lived signed URL on
  read. A URL column is a permanent public handle to a private document.
- **§7 extends to files.** The spec currently protects the Aadhaar *number* but not
  the Aadhaar *scan* — the same data in a different container. `is_sensitive`
  attachments are read-logged to `entity_events` exactly like sensitive fields.
- **One enforcement point** for `upload.max_file_mb` / `allowed_types` /
  `max_files` (`07-settings.md §2.2`), instead of a check per form.
- `checksum_sha256` gives dedupe and integrity — the same certificate uploaded to
  three records stores one blob.
- **Soft delete, then purge by job.** DPDP erasure has to remove the object, not
  just the row, and the purge must itself write `entity_events`.
- Singular purposes (photo, signature) get a partial unique index on
  `(owner_entity, owner_id, purpose) WHERE deleted_at IS NULL`.

### 3.8 `sequences` — added v2

§4.1 says `employee_code` is "auto-gen if blank". Tickets, assets, generated
letters, requisitions and expense claims all need the same thing, with per-tenant
formats. Write the allocator once.

```sql
public.sequences
  id uuid pk, org_id fk,
  key text,            -- 'employee_code'|'ticket'|'asset'|'letter'
                       -- |'requisition'|'claim'
  format text,         -- 'COS/EMP/{FY}/{####}'
  current_value bigint,
  reset_period text,   -- 'never'|'yearly'|'monthly'|'financial_year'
  last_reset_key text, -- '2026' | '2026-08' | 'FY2026-27'
  is_active bool,
  unique (org_id, key)
```

Tokens: `{YYYY}` `{YY}` `{FY}` `{MM}` `{BRANCH}` `{####}` (width from the `#` count).

**Allocation happens `FOR UPDATE` inside the record's own transaction.** If the
insert rolls back, the number is not consumed. This matters specifically for
generated letters (`05-employee-record.md §5A`) — a gap in a letter-number series
is a question an auditor will ask.

`financial_year` resets against `organizations.fiscal_year_start_month` (§3.1).

---

## 4. The employee spine (`hrms`)

### 4.1 `hrms.employees`

```sql
hrms.employees
  id                    uuid pk
  org_id                fk → organizations
  profile_id            fk → profiles          NULL until a login is issued
  employee_code         text                   unique per org; auto-gen if blank
  status                text                   'active'|'probation'|'notice'|'exited'|'inactive'

  -- name & personal
  first_name, middle_name, last_name
  gender_id             fk → masters('gender')     NULL — see note
  date_of_birth         date
  marital_status_id     fk → masters
  blood_group_id        fk → masters
  nationality_id        fk → masters
  father_name, mother_name, spouse_name
  personal_email, personal_phone
  hobbies, qualifications_summary, hidden_talent

  -- employment (lifecycle dates only — v2)
  --   ⚠ branch / business_unit / department / designation / function_role /
  --   employment_type / work_location / salary_grade / experience_grade /
  --   manager / asst_manager / l2_manager / shift / in_out_applicable /
  --   permanent_wfh have MOVED to hrms.employee_assignments (§4.5).
  --   Read them from hrms.employees_current, never from here.
  -- NO business_head_id: derived via business_unit.head_employee_id (§4.4)
  buddy_id              fk → employees        (onboarding buddy)
  date_of_joining       date
  date_of_confirmation  date
  is_confirmed          bool
  last_working_date     date
  prior_experience_years numeric
  last_organization, last_held_designation

  -- work contact & media
  work_email            text not null   -- real company mailbox; see note
  work_phone
  --   ⚠ photo_url / signature_url / intro_video_url REMOVED in v2 —
  --   they are attachments rows with purpose 'employee.photo' etc (§3.7)

  -- extensibility (v2)
  custom_fields         jsonb default '{}'     -- §3.5

  -- payroll seam
  payroll_enabled       bool default true      -- "Configure Payroll"

  created_at, updated_at, created_by, updated_by
```

**Notes on deliberate choices:**

- `gender_id` is **nullable** despite the form marking it required. Proven by the
  dashboard's Gender Ratio showing 5 against a headcount of 6 (`01-dashboard.md §5`).
  Charts must render an `Unspecified` slice, never drop the row.
- **No `NOT NULL` on the ~25 fields that exist only on the edit view.** Required-ness
  is enforced by `form_fields.is_required` (§3.6), per form, per tenant.
- **No `recruiter_name` / `source_of_hire` / `referred_by` text columns.** Those
  become `entity_links` rows and master FKs (§6).
- **No `punching_employee_code` / `biomax_employee_email` columns** — §4.3.
- **No salary or CTC.** Confirmed absent from all 8 tabs (`05-employee-record.md §5H`).
  Compensation lives in `payroll`.
- ✅ **`work_email` is a real company mailbox, entered by HR — decided 2026-08-08.**
  We do **not** mint `name@{orgId}.com` the way the reference does. It is the login
  identifier, notifications go to it, and password reset works. Consequence to
  handle in the Employee Directory spec: it is `NOT NULL`, so an org that doesn't
  issue email to field staff cannot create those employees until this is revisited.
  Flagging now rather than discovering it during data migration.

### 4.2 Child tables

| Table | Key columns | Source |
|---|---|---|
| `employee_addresses` | `type 'present'\|'permanent'`, line, city_id, state_id, country_id, district, pincode | two addresses on the record |
| `employee_education` | `level 'ssc'\|'hsc'\|'graduation'\|'masters'\|'doctorate'\|'diploma'`, institution, board, year, score | 4 fixed accordions → enum. **v2: `document_url` → `attachments`** |
| `employee_prior_experience` | company, designation, start_date, end_date | Experience Details table |
| `employee_certificates` | name, issued_by, **expiry_date** | renewal notifications. **v2: `file_url` → `attachments`** |
| `employee_emergency_contacts` | name, phone, relationship_id | Contact Details tab |
| `employee_bank_accounts` | `purpose 'salary'\|'personal'`, bank_name, account_no, ifsc | two accounts. **v2: `cancelled_cheque_url` → `attachments`** |
| `employee_documents` | document_type_id, status, expiry_date, comments | **seeded from `document_types`**. **v2: `file_url` → `attachments`** |
| `employee_statutory_values` | `key`, `value_encrypted`, `is_verified` | **v2 — replaces `employee_statutory`**; see below |
| `employee_external_ids` | `system`, `external_id` | §4.3 |

**`employee_documents` rows materialise on employee creation**, one per mandatory
`document_type`, at status `pending`. That's why the reference shows six `Pending`
rows before any file exists.

#### Statutory identifiers become key-value — v2

```sql
hrms.employee_statutory_values
  employee_id fk, key text,
  value_encrypted bytea,        -- §7 rule 2
  is_verified bool, verified_at, updated_at, updated_by,
  primary key (employee_id, key)

public.statutory_field_defs      -- seeded, not user-editable
  country_code text, key text, label text,
  validation jsonb, is_sensitive bool, sort_order int,
  primary key (country_code, key)
```

`employee_statutory (pf_number, uan_number, esi_number, esi_applicable_override)`
is four hardcoded India columns. India now ships as **seed rows**:
`pf_number`, `uan_number`, `esi_number`, `esi_applicable_override`,
`aadhaar_number`, `pan_number`, `pt_state`.

The point is not that a second country is planned — it is that adding one later
costs a seed instead of a migration, and the change costs nothing today.

**Aadhaar and PAN move here from Banking.** `05-employee-record.md §5C` groups
them under `Identity Proofs` on the Banking tab. They are statutory identity, not
banking: a payroll administrator needs PAN and has no business seeing an account
number. Splitting them lets `employee.statutory.read` and `employee.bank.read`
(§7 rule 1) mean different things, which is the whole point of field-level
permissions.

`esi_applicable` stays **derived** (§4.4). Only the override is stored, and it is
stored here.

### 4.3 External system identifiers

```sql
hrms.employee_external_ids
  employee_id fk, system text, external_id text,
  primary key (employee_id, system)
```

`system` ∈ `'biomax'`, `'punch_device'`, … The reference stores
`Punching Employee Code` and `Biomax Employee Email` as columns; that pattern adds
a column per vendor forever. One table instead.

### 4.4 Derived, never stored

| Value | Derived from |
|---|---|
| Profile completion % | **v2:** `form_sections` + `form_fields.completion_weight` (§3.6) evaluated on read. *(`profile_completion_rules` deleted — it was the same table twice)* |
| Reporting manager name/code | **v2:** join on `manager_id` **of the assignment covering the relevant date** (§4.5) — not of the current row, or approval history rewrites itself on every reorg |
| Expected in/out time | **v2:** the assignment covering that date → its `shift_id` → shift definition. Roster entries override per-day on top |
| Current department / designation / branch / grade | **v2:** `hrms.employees_current` (§4.5). Never read from `hrms.employees` |
| Whether a date is a week-off | roster → default shift → `shifts.weekoff_days` + `saturday_pattern`. **Per shift, never global** (`12-advanced-settings-cron-holiday.md §1.5`) |
| Working days per week | the weekoff-day set + Saturday pattern. Storing it lets it contradict them |
| Probation end / confirmed | latest `employee_probation_events` row — extension is a real action (`12-… §4.2`) |
| Late-grace slots used | count of prior grace-band days in the pay cycle, in date order. **Must cascade-recompute** — approving a regularization for the 3rd can un-deduct the 19th (`12-… §8.5`) |
| Business Head | `business_unit_id` → `business_units.head_employee_id`. Never a per-employee field — otherwise it drifts and approvals route to someone who left (`11-org-structure-masters.md §0`) |
| Leave balance | ledger sum, live at application time |
| ESI applicability | wage threshold rule, with `esi_applicable_override` winning if set |
| Average age / tenure / experience | aggregate; **returns `—` on empty, never `0`** |

### 4.5 `employee_assignments` — effective-dated employment — added v2

Everything about an employee's *position* that can change over a career leaves
`hrms.employees` and becomes a dated period row.

```sql
hrms.employee_assignments
  id uuid pk, org_id fk,
  employee_id     fk → employees,
  effective_from  date not null,
  effective_to    date,            -- NULL = open-ended
  change_reason   text not null,   -- 'hire'|'promotion'|'transfer'|'demotion'
                                   -- |'reorg'|'shift_change'|'rehire'
  branch_id, business_unit_id, department_id, designation_id,
  function_role_id, employment_type_id, work_location_id,
  salary_grade_id, experience_grade_id,
  manager_id, asst_manager_id, l2_manager_id,
  shift_id,
  in_out_applicable bool,
  permanent_wfh     bool,
  remarks text,
  created_at, created_by,

  EXCLUDE USING gist (
    employee_id WITH =,
    daterange(effective_from, effective_to, '[)') WITH &&
  )
```

The exclusion constraint (requires `btree_gist`) makes **overlapping periods
impossible in the database**, not merely discouraged in application code. It also
gives future-dating for free: a promotion effective 1 October, entered in August,
is just a row — there is no activation job to run and nothing to forget.

#### Reading it

```sql
hrms.employees_current                 -- view, security_invoker = true
  employees ⋈ employee_assignments
    ON daterange(effective_from, effective_to, '[)') @> current_date

hrms.employees_as_of(d date)           -- function, the same join at date d
```

**No cached copies on `hrms.employees`.** A denormalised `department_id` kept in
sync by trigger would violate Principle 1 and Principle 5 and would eventually
drift — and a drifted department is a misrouted approval. Every existing query in
these specs reads `employees_current` and needs no other change.

`employees_as_of()` is what answers the questions that are unanswerable today:
headcount by department at a past date, attrition against the org shape as it was,
promotion velocity, org chart as of a date, and *"who did this person report to
when that request was approved"*.

#### Two rules that keep it clean

**A correction is not a change.** Fixing a mistyped designation edits the current
row in place and writes `entity_events`. A real change closes the current row
(`effective_to = the new from-date`) and opens a new one. This is why
`'correction'` is deliberately **absent** from `change_reason` — conflating the
two is what turns an effective-dated table into an unreadable one.

**Every employee has at least one assignment.** Hire writes assignment #1 with
`effective_from = date_of_joining`. An employee with zero rows is invalid.

#### What this fixes in the existing spec

- §4.4 requires the shift definition "**for that date**". With `shift_id` on
  `employees` that is unanswerable for any past date — recomputing last month's
  attendance after a shift change would silently use the new shift.
- §5 routes approvals through four management relationships. Without dated
  assignments, an approval audit trail rewrites itself every time someone
  transfers.
- `05-employee-record.md`'s Employment Details tab gains a history timeline.
  greytHR has no equivalent; Keka charges for it.

#### Why it must be v2 and not later

This is the one change on the list that is genuinely expensive to retrofit: it
moves fourteen columns off the table that every other table in the system has a
foreign key into, and it invalidates every query written against them. Done now it
is a schema decision; done after the Employee Directory ships it is a migration
plus a rewrite.

It also gives the deferred payroll product its join partner —
`payroll.employee_compensation` uses the identical period pattern, so a mid-month
promotion splits pay correctly with no special-casing (§10).

---

## 5. Approval engine (`public`)

Seven request types share one screen, one status enum, one bulk approve/reject and
one pending-count rollup (`06-approvals.md`). One engine.

```sql
approval_requests
  id uuid pk, org_id fk
  request_type text,   -- 'leave' | 'leave_cancellation' | 'on_duty' | 'c_off'
                       -- | 'wfh' | 'week_off' | 'early_in_out' | 'resignation'
                       -- | 'expense_claim' | 'attendance_regularization'
  subject_type text, subject_id uuid,   -- the record being approved
  requested_by fk → employees
  payload jsonb,                        -- type-specific fields
  status text,         -- 'pending' | 'approved' | 'rejected' | 'cancelled'
  current_step int,
  created_at, updated_at

approval_steps
  id, request_id fk, step_no int,
  approver_id fk → employees,
  approver_source text,   -- 'manager'|'asst_manager'|'l2_manager'|'business_head'|'role'|'explicit'
  decision text, decided_at timestamptz, remarks text

approval_rules
  id, org_id fk, request_type text,
  condition jsonb,        -- e.g. {"days": {">": 5}}
  steps jsonb,            -- ordered approver_source list
  is_active bool
```

**Design points:**

- `approver_source` exists because the employee record has **four** management
  relationships. Rules must be able to name any of them, not assume "manager of".
- `asst_manager` is the **fallback** approver — the reference has no other reason
  to carry it.
- Bulk approve = one transaction over many ids. Both approval screens have
  checkbox + Approve/Reject.
- **Every decision writes `entity_events`.** The reference shows `Approval Date:
  -----` on rows marked `Accepted` — an approved request with no recorded
  transition. That defect is the argument for this table.
- Pending Tasks is a `GROUP BY` over this table. No separate tasks table.

---

### 5.1 The eight request types and what approval writes

Confirmed across all seven Admin Approvals sub-tabs (`06-approvals.md §8.4`).
Every request resolves to a write against one of **three** stores:

| Target | Requests |
|---|---|
| `leave_ledger_entries` | Leave (debit) · Leave Cancellation (reversal) · C-OFF (credit) |
| `attendance_days` | On-duty · WFH · Early In/Out · Regularization |
| `roster_entries` | WeekOff (`is_week_off` swap) |

`approval_requests.parent_request_id` carries cancellation → original. The ledger
reversal is written **on approval of the cancellation**, never when it is raised —
a status flag on the original request cannot express that intermediate state.

---

### 5.2 Delegation, escalation and reminders — added v2

The engine as specced resolves an approver and then waits indefinitely. "My
manager is on leave and my request is stuck" is the most common complaint made
about every HRMS in this market, and it is an engine problem, not a UI one.

```sql
public.approval_delegations
  id uuid pk, org_id fk,
  from_employee_id fk → employees,
  to_employee_id   fk → employees,
  valid_from date, valid_to date,
  request_types text[],        -- NULL = all types
  reason text, created_by, created_at

approval_steps  ⟵ add: delegated_from_id, substitution_reason,
                        due_at, reminded_at, escalated_at

approval_rules  ⟵ add: sla jsonb
                   -- {remind_after_h: 24, escalate_after_h: 72,
                   --  escalate_to: 'l2_manager'}
```

**Resolution order** when a step becomes active:

1. `approver_source` resolves to an employee, as today.
2. If that employee has an active delegation covering this `request_type` and
   today's date → substitute. **Both ids are recorded** — the audit trail must show
   who should have decided as well as who did.
3. Else if the resolved approver is on approved leave for the whole remaining
   window and has no delegation → fall through to `asst_manager`, recorded as
   `substitution_reason = 'approver_on_leave'`.
4. Else if nothing resolves (the manager left, the BU head seat is vacant) → route
   to the HR Admin role. **A step is never left unassigned.**

Step 3 is the first rule in the spec that actually *invokes* `asst_manager`. §5
describes it as "the fallback approver" with no mechanism that ever falls back to
it.

**Reminders and escalation are jobs** in the §9a runner, driven by `due_at`, and
they write `notification_events` (§6.4).

**Auto-approval on SLA breach is deliberately not offered.** Escalate, never
auto-approve. A system that silently approves because nobody looked is a system
that cannot be defended in an audit, and the request types here include
resignations and expense claims.

---

## 6. Linkage layer — forward & backward tracking (`public`)

This is the mechanism for "so all get linked immediately... we don't do any hardcoding".

### 6.1 `entity_links`

```sql
entity_links
  id uuid pk, org_id fk
  source_product text, source_entity text, source_id uuid
  target_product text, target_entity text, target_id uuid
  link_type text,     -- 'converted_to' | 'derived_from' | 'references' | 'sourced_from'
  metadata jsonb,
  created_at, created_by

  index (source_product, source_entity, source_id)
  index (target_product, target_entity, target_id)
```

One row is traversable in both directions. Offer-accept writes **one** row:

```
ats/candidates/<id>  --converted_to-->  hrms/employees/<id>
```

Forward: candidate → employee → salary structure → payslip.
Backward: payslip → employee → candidate → application → job → requisition.

**Why not FK columns:** adding `ats_candidate_id` to HRMS tables and
`hrms_employee_id` to payroll tables grows quadratically with products and
requires a migration every time a new relationship appears. One uniform table,
one uniform query.

### 6.2 `entity_events`

```sql
entity_events
  id bigserial pk, org_id fk
  product text, entity text, entity_id uuid,
  event_type text, actor_id uuid,
  occurred_at timestamptz default now(),
  payload jsonb
  index (product, entity, entity_id, occurred_at desc)
```

Append-only. Powers every "history of this record" view, the audit trail
(`Settings → Activity Logs`), and — with §7 — sensitive-field read logging.

### 6.2a The HRMS → Payroll attendance contract

Resolved 2026-08-10 from the shift deduction catalogue
(`12-advanced-settings-cron-holiday.md §8.8`). Payroll reads **two things**, and
never re-runs the penalty engine:

```
1. attendance_days.payable_fraction   1.0 | 0.5 | 0   -- stored, not recomputed
2. leave_ledger_entries                                -- paid-leave debits

Payroll derives LOP itself: payable_fraction < 1 AND no approved paid leave.
```

The day register itself is **materialised per employee per date**, confirmed by
observation (`02-team.md §9.1`) — rows exist on days nobody worked. Two columns the
reference lacks and we require:

- **`day_status` as an enum, not a comment.** The reference writes `Weekoff.` into
  a free-text `Comments` field (`02-team.md §9.3`). A payroll input must not be a
  string.
- **`work_date` distinct from punch timestamps**, so a night shift crossing
  midnight is one row and not two half-days (`02-team.md §9.4`).

`payable_fraction` must be **stored** on the day register. It is the output of
grace quotas, penalty rules and regularizations — all of which are stateful and
order-dependent (§8.5) — so recomputing it at pay time would have to replay the
entire month and could produce a different answer than the employee saw.

There is deliberately **no `LOP` deduction type**: loss of pay is what a
`payable_fraction` of 0 *becomes* in payroll, not something HRMS declares.

### 6.2b The ATS → HRMS seam

Confirmed 2026-08-10 (`14-onboarding.md §3.1`): **the reference has no link at
all.** A hire is typed in by hand three times — Candidate Approval, Onboarding
Initiation, and again as an employee — with nothing joining them back to the
candidate they came from.

Ours makes it one object crossing the boundary once:

```
ats.candidate ──promoted_to──▶ hrms.onboarding_cases ──became──▶ hrms.employees
                                        │
                                        └──seeded──▶ payroll.salary_structures
```

Both directions matter. Forward: an employee record answers *"which requisition,
which source, which recruiter"*. **Backward**: a declined offer writes
`entity_events` onto the ATS candidate with a reason, so recruiting learns that
nine of eleven were lost to counter-offers (`14-onboarding.md §7.1`). Backward
tracking is the half every product forgets.

Salary crosses at the offer and never lands on the employee spine (§4.1).

**The seam has three crossings, not one** (`15-more-module.md §1`):

| # | Direction | What crosses |
|---|---|---|
| 1 | ATS → HRMS | candidate → onboarding case → employee (+ salary seed) |
| 2 | HRMS → ATS | offer declined, with reason (`14-onboarding.md §7.1`) |
| 3 | **HRMS → ATS** | **`Refer Candidate`** — an employee refers someone, and the link must survive until the referral bonus is paid months later |

**HRMS gets no jobs table.** The ATS already has `jobs`, `job_creation_requests`
and `hiring_requests`; the HRMS `More → Job Opening` tab is a *view* of the ATS
requisition, not a fourth copy.

### 6.3 Confirmed linkage map

| From | To | Mechanism |
|---|---|---|
| ATS candidate | HRMS employee | `entity_links` `converted_to` |
| ATS job/requisition | HRMS Job Opening widget | direct read, ATS is source of truth |
| ATS accepted offer | HRMS Upcoming New Joinees | direct read |
| ATS interview | HRMS calendar | derived event (`03-calendar.md §3`) |
| Recruiter | HRMS employee | `employees.recruiter_id` FK *(replaces `Recruiter Name` text)* |
| Source of hire | `masters('source')` FK | *(replaces `Source of Hire` text)* |
| HRMS employee | Payroll enrolment | `payroll_enabled` + `entity_links` |
| HRMS salary grade | Payroll salary structure | FK from payroll side |
| HRMS leave / LOP | Payroll deduction | payroll reads leave ledger |
| HRMS attendance penalty | Payroll deduction | payroll reads penalty records |
| HRMS expense claim | Payroll reimbursement | `entity_links` |
| HRMS separation | Payroll final settlement | `entity_links` |
| HRMS ticket | any record | `entity_links` (`Related to` column) |
| Employee ↔ biometric device | `employee_external_ids` | |

### 6.4 Notification infrastructure — added v2

§9a already depends on `notification_events` ("a failed run raises a
`notification_events` entry") but never defines it. `08-masters.md §1` catalogues
the reference's Email Master, which is a template list, not delivery
infrastructure.

```sql
public.notification_templates      -- org_id NULL = system default
  id uuid pk, org_id fk NULL,
  key text,                        -- 'leave.approved' | 'document.expiring'
  channel text, locale text,
  subject text, body text,
  variables jsonb, is_active bool,
  unique (org_id, key, channel, locale)

public.notification_preferences
  profile_id fk, notification_key text, channel text, is_enabled bool,
  primary key (profile_id, notification_key, channel)

public.notification_events
  id bigserial pk, org_id fk,
  key text,
  recipient_profile_id, recipient_employee_id,
  channel text,          -- 'email'|'in_app'|'slack'|'whatsapp'|'sms'|'push'
  payload jsonb,
  status text,           -- 'queued'|'sent'|'delivered'|'failed'|'suppressed'
  attempts int, last_error text,
  scheduled_for timestamptz, sent_at, created_at,
  index (status, scheduled_for)
```

**Design points:**

- The Email Master catalogue seeds `notification_templates` at
  `channel = 'email'`. It is the starting content, not the design.
- **Channels are rows, not columns.** Adding Slack — which is where the software
  companies in the target market actually approve things — is a seed row and an
  adapter, not a migration.
- **`'suppressed'` is distinct from `'failed'`.** "The user opted out" and "the
  send broke" must never look identical in a support conversation. This is the
  same class of defect as `9999 Days` meaning "no limit" (§8).
- Delivery is a queue drained by the §9a runner, with backoff on `attempts`. The
  failed-job alerting §9a promises now has a real mechanism behind it.
- Per-tenant SMTP credentials (§7.0) are the transport; they are not stored here.

**Not unified in v2:** the ATS's `automation_rules` + `candidate_followups`
(`lib/automation/triggers.ts`) are the same shape and should eventually become one
cross-product engine, with `entity_events` as the trigger source. That is its own
spec — building a second notification system here and merging later is cheaper
than blocking the foundation on the merge.

---

## 7. Access control & sensitive data

The employee record holds Aadhaar, PAN, bank accounts, IFSC, PF/UAN/ESI, DOB,
home addresses, blood group and spouse details.

**Rules:**

1. **Field-level, not tab-level.** Permission keys are granular:
   `employee.read`, `employee.bank.read`, `employee.statutory.read`,
   `employee.identity.read`.
2. **Encrypt at rest**: Aadhaar, PAN, bank account numbers, PF/UAN/ESI.
3. **Log reads**, not only writes, for those fields → `entity_events` with
   `event_type = 'sensitive_field_viewed'`.
4. **Mask by default** in the UI (`XXXX XXXX 4321`); reveal is an explicit,
   logged action.
5. **RLS is subject-based, not role-based**: rows where
   `employee_id = me` ∪ `me ∈ manager chain of employee` ∪ `me has HR permission`.
6. **Biometrics are a separate category.** `Enable FRS` and `Attendance with
   Selfie` are shift settings (`12-advanced-settings-cron-holiday.md §1.1`), so
   face templates are captured routinely. Under the DPDP Act 2023 they need
   explicit consent, purpose limitation, a retention limit and **deletion on
   exit**. They live in their own table with their own encryption key and read
   logging — never a column on `employees`. This is what the reference's
   `Face Identity Vault` is, and the `FRS Admin` role exists to gate it.
7. **Files carry the same protection as fields — added v2.** Rules 1–4 above were
   written about columns, but an Aadhaar *scan* is the same data as an Aadhaar
   *number*. `attachments.is_sensitive` (§3.7) triggers identical treatment:
   permission-gated, signed URLs only, read-logged to `entity_events`, never a
   public storage URL. This covers the cancelled cheque, the bank statement, the
   PAN copy and the education certificates.
8. **Erasure must reach storage — added v2.** DPDP deletion-on-exit is not
   satisfied by a soft-deleted row. `attachments.deleted_at` starts a purge job
   that removes the object and writes `entity_events`. Same for biometric
   templates under rule 6.

### 7.0 Stored third-party secrets

Per-tenant SMTP credentials are stored (`07-settings.md §2.1`), including a Gmail
**App Password** — which grants send-as rights over that mailbox.

- Encrypted at rest, in `organization_settings` or a dedicated secrets table.
- **Write-only over the API.** Reads return `••••`, never the value. The reference
  has a reveal toggle, meaning the secret round-trips to the browser; ours must not.
- Never logged, never in error messages, never in `entity_events` payloads.
- Verified against the live server before saving — storing credentials that don't
  work means every notification fails silently.

The same rule covers biometric-device credentials (`System Settings → Biometric
Device`) and any future integration keys.

Leave *type* is health information — visible to the manager chain and HR only.
Peers see availability, never the reason (`03-calendar.md §5`).

### 7.1 Appraisal transparency — decided 2026-08-08

✅ **Employees see everything about themselves**, including `Appraisers Remarks`,
`Areas of improvement` and `Next Level up scope`. We do not replicate the
reference's split where `Team Ranking` shows four narrative fields that
`Me → Ranking` hides.

Consequences for the Performance spec:
- `Me → Ranking` renders the same columns as `Team Ranking`; no field-level
  filtering on appraisal tables for the subject employee.
- Appraisers must be told their remarks are visible to the employee — surface it
  in the appraisal form, not in a policy document nobody reads. Hidden-then-leaked
  is worse than transparent by design.
- Peer/multi-rater feedback, if ever added, is a **different** instrument and this
  rule does not automatically extend to it.

---

## 8. Conventions

| Concern | Decision |
|---|---|
| Table names | `snake_case`, plural |
| FKs | `<singular>_id` |
| Timestamps | `created_at`, `updated_at`, `created_by`, `updated_by` |
| Soft delete | `status` / `is_active`. Never hard-delete an employee. |
| Date display | `DD-MM-YYYY` everywhere — including tooltips |
| Null display | `—` (em dash). **One** rendering, not `-` / `-----` / blank |
| Empty aggregates | `—`, never `0` |
| Pluralisation | `1 day` / `3 days`, never `1 Days` |
| Status vocabulary | `pending` · `approved` · `rejected` · `cancelled`. Not "Accepted". |
| Currency | `INR`, symbol `₹`, minor units stored as integer paise |
| "No limit" | **`NULL`.** Never a sentinel — the reference uses `9999 Days`, empty string and `--` for the same idea (`12-advanced-settings-cron-holiday.md §2.4`) |
| Scheduled jobs | Take a **business date** parameter; never read the clock internally. Re-running the same date must be idempotent (§9a) |
| API routes | `/api/hrms/<resource>`; aggregates get one endpoint (`/api/hrms/dashboard`) |

---

## 9. Build order

*Revised v2.*

1. `organizations` (+`timezone`, `fiscal_year_start_month`, `plan_key`, `limits`),
   `org_members`, `organization_products`, roles/permissions
2. Org structure masters + `document_types` + **`sequences`** (§3.8) +
   **`attachments`** (§3.7)
3. **`custom_field_definitions`** (§3.5) + **`form_definitions` / `form_sections` /
   `form_fields`** (§3.6)
4. `hrms.employees` + **`employee_assignments`** (§4.5) + child tables +
   `employee_statutory_values` (§4.2)
5. `entity_links`, `entity_events`
6. Approval engine + **`approval_delegations`** (§5.2)
7. **Notification infrastructure** (§6.4)
8. `job_definitions` / `job_runs` + the ordered runner (§9a)
9. Employee Directory UI (list, create, 8-tab detail)
10. ATS → HRMS conversion: candidate → onboarding case → employee, writing
    `entity_links` (§6.2b)
11. Modules, each against this foundation

Steps 1–8 are schema and have no UI. Step 9 is the first visible screen.

**Ordering note.** Step 3 precedes step 4 deliberately: the employee record's
layout, required-ness and completion weights are data (§3.6), so the Employee
Directory UI in step 9 has nothing hardcoded to unpick later.

**Org seeding.** Creating an organisation must seed a **default national holiday
calendar** for its country. The reference ships an empty one, so every leave
day-count in that tenant is computed against no holidays
(`12-advanced-settings-cron-holiday.md §5.3`).

### 9a. The job runner

Attendance is a **pipeline with ordering barriers**, not a set of independent cron
expressions — running the register before punches are normalised produces a day of
false absences (`12-advanced-settings-cron-holiday.md §4.1`).

```sql
job_definitions
  key text pk, name, module, schedule_cron, is_enabled,
  is_system bool,          -- pipeline jobs: not user-reschedulable
  depends_on text[]        -- ordering barrier
  -- schedule_cron is a real expression, resolved in the ORG's timezone.
  -- The reference offers only a daily "Run Time", which forces annual and
  -- monthly jobs to decide the calendar inside their own code (§12 doc, §4.7).

job_runs
  id, job_key, org_id,
  business_date date,      -- the date being processed, ≠ the time it ran
  started_at, finished_at,
  status 'running'|'succeeded'|'failed'|'skipped',
  rows_affected int, error text,
  triggered_by 'schedule'|'manual'|'backfill',
  unique (job_key, org_id, business_date, triggered_by)
```

A failed run raises a `notification_events` entry. The reference leaves two jobs
red and `Active` with no last-run time, no error and no alert (§4.4) — the failure
is invisible until a user complains.

---

## 10. Payroll seams reserved — added v2

**Decision: HRMS ships first, Payroll follows as a separate product.** That is only
safe if the HRMS produces everything Payroll will need in a shape Payroll can read
without HRMS being reopened. Four seams, three of which already exist and are
merely named here so nothing erodes them.

| # | Seam | Status |
|---|---|---|
| 1 | **`leave_ledger_entries`** — accrual, consumption, encashment and lapse as signed rows with an `effective_date`. Balance is a sum (§4.4); Payroll queries paid-leave debits for a pay period without recomputing anything | already required by §5.1 and §6.2a |
| 2 | **`attendance_days.payable_fraction`** — `1.0 \| 0.5 \| 0`, **stored**, plus `day_status` as an enum and `work_date` distinct from punch timestamps | settled in §6.2a. Payroll derives LOP itself and never re-runs the penalty engine |
| 3 | **`period_locks`** — new in v2, below | **new** |
| 4 | **Separation → FnF trigger** — `entity_events` `separation.finalised` carrying last working date, notice shortfall days and leave balance at exit | the three-date notice model in `05-employee-record.md §7` already computes the shortfall; this names the event Payroll will subscribe to |

Effective-dated compensation gets its join partner from §4.5:
`payroll.employee_compensation` uses the identical `daterange` period pattern, so a
mid-month promotion splits pay correctly with no special-casing.

### 10.1 `period_locks`

```sql
hrms.period_locks
  id uuid pk, org_id fk,
  module text,              -- 'attendance' | 'leave'
  period_start date, period_end date,
  status text,              -- 'open' | 'locked'
  locked_at, locked_by, unlocked_at, unlocked_by, unlock_reason text,
  unique (org_id, module, period_start)
```

§6.2a establishes that `payable_fraction` must be **stored** rather than
recomputed, because grace quotas, penalty rules and regularizations are stateful
and order-dependent, so "recomputing it at pay time... could produce a different
answer than the employee saw."

That argument does not stop at pay time. §4.4 requires late-grace usage to
**cascade-recompute** — approving a regularization for the 3rd can un-deduct the
19th. If a regularization for August is approved after August payroll has run,
stored values that were already paid against silently change.

So: once a period is locked, writes that would alter it are refused. Reopening is
an explicit action with a reason, recorded in `entity_events`, and it raises a
notification (§6.4) because it means a payroll re-run.

This is the cheapest possible insurance against the single most expensive class of
payroll bug, and it costs one table today.

---

## 11. Open questions — blocking

*None. All blocking questions are resolved as of 2026-08-09.*

### Resolved
| # | Question | Decision | Date |
|---|---|---|---|
| 1 | Tenancy | **Multi-tenant SaaS** — `org_id` everywhere, session-resolved, clean URLs | 2026-08-08 |
| 4 | Appraiser remarks visible to employee? | **Yes — full transparency** (§7.1) | 2026-08-08 |
| 5 | Work email | **Real company mailbox, HR-entered**; no minting (§4.1) | 2026-08-08 |
| 6 | Salary Grade / Experience Grade config | **Not configurable in the reference — hardcoded.** Ours creates real `salary_grades` / `experience_grades` masters (`09-org-settings.md §2.5`) | 2026-08-08 |
| 2 | `Function Role` vs `Designation` | **Structurally identical and unused in the reference.** Ours gives Function Role a real job: job family, with `designations.function_role_id` so it defaults from the title (`11-org-structure-masters.md §3`) | 2026-08-08 |
| 3 | `Business Unit` vs `Department` | **Separate axes, not tree levels.** BU owns departments (`departments.business_unit_id`); `departments.parent_id` covers Sub-Department. BU carries `head_employee_id`, which is where `Business Head` and `approver_source='business_head'` resolve from (`11-org-structure-masters.md §0`) | 2026-08-09 |

| 7 | The eye icon on Employment Information | **Field visibility.** Ours implements it as `form_fields.visible_to_roles` / `editable_by_roles` (§3.6), which is a superset of whatever the reference does | 2026-08-10 |
| 8 | Where does required-ness live? | **`form_fields.is_required`** (§3.6). Principle 6 now has a table behind it | 2026-08-10 |
| 9 | Payroll boundary, given payroll is deferred | **Four named seams** (§10), three of which already existed. Payroll becomes additive | 2026-08-10 |

## 12. Open questions — non-blocking

- Year view on the calendar; Google Calendar sync
- `Early In/Out` request form — where is it raised?
- `Status` vs `Approved` as separate columns on Admin-Regularization
- `Upload Video` on an employee record — purpose? *(storage is settled — it is an
  `attachments` row with `purpose = 'employee.intro_video'` (§3.7); the open
  question is what it is **for**)*

## 13. Deferred by decision — v2

Not gaps, and not oversights. Each is genuinely additive against this foundation,
and each has a hook in it already:

| Deferred | Hook that makes it additive |
|---|---|
| Subscription, billing, invoicing, dunning | `organization_products.plan_key` + `limits` (§3.1) |
| SSO / SAML / OIDC / SCIM / MFA | `public.profiles` is the single identity (§2.3) |
| Report engine, saved views, scheduled exports | `custom_fields` are reportable by design (§3.5); `entity_events` is the history source |
| Multi-country statutory packs | `statutory_field_defs.country_code` (§4.2); `organizations.country_code`, `timezone`, `fiscal_year_start_month` (§3.1) |
| Unified ATS+HRMS automation engine | `entity_events` is already the trigger source (§6.2, §6.4) |
| Conditional form-field logic | `form_fields.visible_when jsonb` (§3.6) |
| Custom objects (tenant-defined entities) | out of scope by decision, not by omission |
| Bulk employee import | `form_definitions` gives it a field map; `sequences` gives it codes |
| Mobile app | `/api/hrms/*` is the same surface (§8) |
