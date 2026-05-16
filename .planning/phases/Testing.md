---
  # HRMS Full-System Integrity Audit and Repair — Multi-Agent Orchestration

  ## WHY THIS EXISTS

  HireRabbits HRMS has been built phase by phase across 10 migrations. Every domain
  has files: helpers in lib/hrms/, API routes under app/api/hrms/, UI pages under
  app/(app)/, metadata YAML under metadata/, and generated TypeScript under lib/generated/.

  The problem is that each phase was built in isolation. The result is a skeleton:
  the files exist but the data does not flow between them. Specific known problems:

  1. METADATA LINEAGE BROKEN — registry keys exist in YAML but the trace from
     DB migration → generated TypeScript → API route → UI surface → test has gaps.
     Some generated files are stale or don't match the registry.

  2. NO WORKFLOW CONNECTIVITY — workflow state transitions are defined in
     metadata/workflows.yaml but the API routes do not enforce them end to end.
     Example: approving a leave application does not trigger a leave_ledger_entries
     insert. Submitting a payroll run does not generate salary_slip rows.

  3. NO DATA BACKTRACKING — you cannot start with a candidate ID and trace them
     forward to their salary slip or appraisal. The FK chains exist in migrations
     but are not surfaced in APIs or UI.

  4. DATA COHESIVENESS MISSING — each domain treats employee_id as a string key
     but no domain queries another domain's data. The employee detail page does not
     show attendance. The payroll run page does not show which employees have no
     salary structure. The appraisal has no link back to the employee's attendance
     history.

  THE NORTH STAR — THE GOLDEN THREAD:

  Every fix in this task must serve this single end-to-end flow:

    [ATS] candidates.id
      → candidates.final_status = "joined"
      → employees.joined_candidate_id (candidate-to-employee conversion)
      → employees.id (THE PIVOT — all HRMS domains hang off this)
        → shift_assignments.employee_id → attendance.employee_id
        → leave_policy_assignments.employee_id → leave_applications.employee_id
          → leave_ledger_entries.employee_id
        → expense_claims.employee_id → employee_advances.employee_id
        → salary_structure_assignments.employee_id
          → payroll_entries → salary_slips.employee_id
        → appraisals.employee_id → employee_performance_feedback.employee_id
        → employee_onboardings.employee_id → employee_separations.employee_id

  If you can take a candidate ID, trace it to an employee ID, and then traverse
  every domain above and find real connected data, the system is working.
  That is the only definition of "working" for this task.

  ---

  ## CODEBASE FACTS (read before anything else)

  Tech stack: Next.js 14 App Router, Supabase Auth, Supabase Postgres, TypeScript, Tailwind.

  Key files and directories:
    lib/hrms/                         — domain helpers (employee-core.ts, leave.ts,
                                        payroll.ts, performance.ts, lifecycle.ts, etc.)
    lib/hrms/*-authorization.ts       — role-based access helpers per domain
    lib/generated/                    — generated from metadata: metadata.ts, roles.ts,
                                        routes.ts, workflows.ts, forms.ts, permissions.ts
    lib/nav/config.ts                 — role-filtered sidebar nav config (already correct)
    lib/types.ts                      — shared TypeScript types including Role union
    metadata/                         — YAML registry: roles.yaml, permissions.yaml,
                                        routes.yaml, workflows.yaml, approvals.yaml,
                                        lineage.yaml, forms/, leave/, payroll/, reports/
    metadata/lineage.yaml             — the lineage trace for every governed metadata key
    app/api/hrms/                     — all HRMS API route handlers, organized by domain:
                                        attendance/, employees/, expenses/, grievances/,
                                        leave/, lifecycle/, organization/, overtime/,
                                        payroll/, performance/, reports/, self-service/,
                                        shifts/, training/, travel/, vehicles/
    app/(app)/                        — all UI pages: candidates/, dashboard/, expenses/,
                                        grievances/, hod-portal/, lifecycle/, payroll/,
                                        people/, performance/, reports/, self-service/,
                                        time/, training/, travel/, vehicles/
    supabase/migrations/              — 14 migration files, Phase 0 through Phase 9
    supabase/generated/metadata_seed.sql — generated metadata seed
    tests/                            — test suites: attendance/, employee-core/,
                                        expenses/, leave/, lifecycle/, metadata/, nav/,
                                        payroll/, performance/, reports/, self-service/
    scripts/metadata/                 — validate.ts, generate.ts, check-hardcoding.ts,
                                        lineage-report.ts

  npm scripts that must pass at the end:
    npm run metadata:validate
    npm run metadata:generate
    npm run metadata:check-hardcoding
    npm run metadata:lineage
    npm run test:metadata
    npm run test:employee-core
    npm run test:attendance
    npm run test:leave
    npm run test:expenses
    npm run test:payroll
    npm run test:performance
    npm run test:nav
    npm run build

  ---

  ## AGENT ARCHITECTURE

  This task runs in four waves. Each wave depends on the previous.
  You are the orchestrator. Spawn agents as described below.
  Do not skip waves. Do not start Wave 2 until Wave 0 is complete.
  Do not start Wave 3 until Wave 2 is complete.

  Create a directory called audit/ in the project root for all agent outputs.
  This directory is ephemeral — it is used for coordination only, not shipped code.

  ---

  ## WAVE 0 — DISCOVERY (run all 6 agents in parallel, read-only, no code changes)

  These agents read the codebase and write findings. They do NOT edit any source file.

  ────────────────────────────────────────────────────────────
  AGENT 0A — Schema Archaeologist
  ────────────────────────────────────────────────────────────
  Read every file in supabase/migrations/ in timestamp order.

  For each migration, extract:
    - Every CREATE TABLE with its columns and types
    - Every FOREIGN KEY constraint (or absence of one where employee_id exists)
    - Whether ALTER TABLE ... ENABLE ROW LEVEL SECURITY appears for each table
    - Every CREATE POLICY with its role condition and using/check clause
    - Every CREATE FUNCTION or CREATE TRIGGER

  Then produce audit/0A-schema-map.md with three sections:

  Section 1: TABLE INVENTORY
    List every table. For each: does it have employee_id? Is there a FK on it?
    Is RLS enabled? How many policies?

  Section 2: MISSING FOREIGN KEYS
    List every column named *_id where no REFERENCES clause exists in any migration.
    Flag severity: CRITICAL if it is employee_id, HIGH if it is any other domain key.

  Section 3: RLS GAPS
    List every table that has ENABLE ROW LEVEL SECURITY but zero CREATE POLICY
    statements. List every table that has no ENABLE ROW LEVEL SECURITY at all.
    These are fail-open tables — data is visible to anyone with DB access.

  ────────────────────────────────────────────────────────────
  AGENT 0B — API Contract Auditor
  ────────────────────────────────────────────────────────────
  Read every route.ts file under app/api/hrms/ recursively.

  For each route handler (GET, POST, PATCH, DELETE), check:

    CHECK 1 — Authorization called?
      Does the handler call an authorization helper from lib/hrms/*-authorization.ts
      before querying the database? If not: flag as CRITICAL (data leak / privilege escalation).

    CHECK 2 — Scope enforced?
      Does every SELECT query filter by employee_id, profile_id, or department_id
      before returning results? A route that does .select('*') with no .eq() or
      .in() filter is a fail-open data leak. Flag as CRITICAL.

    CHECK 3 — Workflow transitions enforced?
      For routes that change a status field (expense_status, leave_status,
      payroll_status, appraisal_status, etc.): does the route check the CURRENT
      status before allowing the transition? Or does it allow any status to be
      written to any value? Flag missing transition enforcement as HIGH.

    CHECK 4 — Cross-domain writes missing?
      For routes that should trigger cross-domain effects:
      - leave approval → should write to leave_ledger_entries
      - expense approval → should update employee_advance balance if advance linked
      - payroll submission → should create salary_slip rows
      - candidate-to-employee conversion → should trigger onboarding creation
      If the cross-domain write is absent, flag as CRITICAL.

    CHECK 5 — Error handling?
      Does the route return a typed error response or does it silently return 200
      with empty data on DB errors? Flag silent failures as MEDIUM.

  Produce audit/0B-api-audit.md listing every finding with:
    file path, route method, check number, severity, description of the gap.

  ────────────────────────────────────────────────────────────
  AGENT 0C — Golden Thread Tracer (most important agent in Wave 0)
  ────────────────────────────────────────────────────────────
  Your sole job is to trace the golden thread end to end and report every gap.

  The golden thread has 8 links. For each link, answer three questions:
    DB: Does the FK exist in the migration? (from 0A findings or read directly)
    API: Is there an API route that joins/exposes this relationship?
    UI: Is there a UI page or component that renders this connected data?

  LINK 1: candidates → employees
    FK: employees.joined_candidate_id REFERENCES candidates(id)
    API: app/api/hrms/employees/from-candidate/[candidateId]/route.ts
    UI: Does the employee detail page show the source candidate? Does the candidates
        list show an "Employee created" badge for joined candidates?

  LINK 2: employees → attendance
    FK: attendance.employee_id REFERENCES employees(id)
    API: Does app/api/hrms/attendance/days/route.ts accept employee_id filter?
    UI: Does the employee detail page show attendance summary?

  LINK 3: employees → leave
    FK: leave_applications.employee_id REFERENCES employees(id)
         leave_policy_assignments.employee_id REFERENCES employees(id)
    API: Does app/api/hrms/leave/balances/route.ts return per-employee balance?
    UI: Does the employee detail page show leave balance and recent applications?

  LINK 4: employees → salary structure → payroll
    FK: salary_structure_assignments.employee_id REFERENCES employees(id)
        salary_slips.employee_id REFERENCES employees(id)
    API: Does app/api/hrms/payroll/runs/route.ts query
         salary_structure_assignments to find employees for the run?
         Does the payroll run actually generate salary_slip rows?
    UI: Does the payroll run page show which employees are included?
        Does the employee detail page show salary slips?

  LINK 5: leave_applications → leave_ledger_entries
    FK: leave_ledger_entries.leave_application_id REFERENCES leave_applications(id)
    API: When leave is approved via app/api/hrms/leave/applications/[id]/route.ts
         (PATCH with status=approved), does it INSERT into leave_ledger_entries?
    UI: Does the leave balance page show the ledger history?

  LINK 6: expense_claims → employee_advances (settlement)
    FK: expense_claims may link to employee_advances for settlement
    API: When an advance is settled, does it update the advance status and
         link the settlement expense claim?
    UI: Does the advances page show settlement status?

  LINK 7: employees → appraisals → performance_goals
    FK: appraisals.employee_id REFERENCES employees(id)
        appraisal_goals.appraisal_id REFERENCES appraisals(id)
    API: Does app/api/hrms/performance/ expose appraisals filtered by employee?
    UI: Does the appraisal page show the employee's goals inline?

  LINK 8: employees → onboarding → separation
    FK: employee_onboardings.employee_id REFERENCES employees(id)
        employee_separations.employee_id REFERENCES employees(id)
    API: Does lifecycle API check that onboarding is complete before allowing
         separation? Or are these fully disconnected workflows?
    UI: Does lifecycle overview show the employee's current lifecycle stage?

  For each of the 8 links, rate: CONNECTED / PARTIAL / BROKEN.
  Produce audit/0C-golden-thread.md.

  ────────────────────────────────────────────────────────────
  AGENT 0D — Metadata Lineage Auditor
  ────────────────────────────────────────────────────────────
  Read metadata/lineage.yaml. It should have an entry for every governed metadata key.

  For each entry in lineage.yaml:
    1. Does the db_table column exist in the schema (from migrations)?
    2. Does the ts_export symbol exist in lib/generated/?
    3. Do all listed api_routes exist as actual files?
    4. Do all listed ui_surfaces exist as actual page files?
    5. Do all listed tests exist as actual test files?

  Then read metadata/workflows.yaml, permissions.yaml, routes.yaml, roles.yaml.
  Check that every key in those files has a corresponding entry in lineage.yaml.
  Any key with no lineage entry is an untraced metadata item — flag as HIGH.

  Run: npm run metadata:validate
  Report what passes and what fails.

  Run: npm run metadata:lineage
  Report what the lineage report outputs.

  Produce audit/0D-lineage-gaps.md with:
    - Keys missing from lineage.yaml
    - Lineage entries with broken db/ts/api/ui/test references
    - Output of metadata:validate
    - Output of metadata:lineage

  ────────────────────────────────────────────────────────────
  AGENT 0E — Workflow Enforcement Auditor
  ────────────────────────────────────────────────────────────
  Read metadata/workflows.yaml. It defines state machines for:
    - leave application (draft → submitted → approved/rejected/cancelled)
    - expense claim (similar approval states)
    - employee advance (similar)
    - payroll entry (draft → submitted → processed)
    - appraisal (draft → in_progress → completed)
    - employee status (draft → active → inactive → exited)
    - onboarding / separation workflows

  For each workflow:

    STEP 1 — DB state column check
    Does the table have the status/state column? What is its type?
    Are there DB constraints (CHECK constraint or FK to workflow_states) that
    prevent invalid state values?

    STEP 2 — Transition enforcement check
    Read the PATCH route for this workflow's primary table.
    Does the code:
      a) Read the current status before allowing a change?
      b) Reject the request if the transition is not valid?
      c) Or does it blindly update status to whatever the caller sends?

    STEP 3 — Side effect check
    For each workflow, identify what MUST happen on state transition:
      leave: approved → insert leave_ledger_entries row
      expense: approved → notify employee, optionally link to advance
      payroll: submitted → for each employee in run, create salary_slip
      appraisal: completed → update appraisal score, optionally trigger lifecycle event
      onboarding: all activities complete → update employee status to active
      separation: approved → update employee status to exited
    Does the API route perform these side effects? Or does it just update the status column?

  Produce audit/0E-workflow-gaps.md listing every workflow, its transition enforcement
  status (ENFORCED / PARTIAL / MISSING), and its side effect status (PRESENT / MISSING).

  ────────────────────────────────────────────────────────────
  AGENT 0F — UI Data Reality Checker
  ────────────────────────────────────────────────────────────
  Read every page.tsx file under app/(app)/ recursively.

  For each page, answer:
    1. Does it fetch real data from an API route or supabase client?
       Or does it render with static/mock content only?
    2. If it fetches data, does it pass the employee_id or relevant filter
       so it shows the right employee's data?
    3. Does the employee detail page exist? If so, what data does it show?
       Does it show attendance summary? Leave balance? Salary slips? Appraisals?
    4. Does any page show cross-domain data? (e.g., payroll page showing
       attendance exceptions, or appraisal page showing leave usage)
    5. Does the self-service portal (/self-service) aggregate the employee's
       own data from all domains into one view?

  Look specifically for:
    - Pages that return empty <div> or placeholder text with no data fetch
    - Pages that have data fetching but the fetch result is not rendered (unused state)
    - Pages that render data but without the employee_id filter (showing all employees' data)

  Produce audit/0F-ui-reality.md listing every page with its data fetch status:
    REAL_DATA / PLACEHOLDER / FILTERED_CORRECTLY / DATA_LEAK

  ---

  ## WAVE 1 — TRIAGE (single agent, sequential, reads all Wave 0 outputs)

  ────────────────────────────────────────────────────────────
  AGENT 1A — Master Triage Agent
  ────────────────────────────────────────────────────────────
  Read all six audit files:
    audit/0A-schema-map.md
    audit/0B-api-audit.md
    audit/0C-golden-thread.md
    audit/0D-lineage-gaps.md
    audit/0E-workflow-gaps.md
    audit/0F-ui-reality.md

  Produce audit/1A-triage.md with this exact structure:

  SECTION 1: CRITICAL FIXES (data leaks, broken FKs, fail-open RLS, broken approval side effects)
    List each finding as:
      FIX-001: [file] — [description] — [which Wave 0 agent found it]

  SECTION 2: HIGH FIXES (missing workflow enforcement, broken golden thread links)
    List each finding as:
      FIX-0XX: [file] — [description]

  SECTION 3: MEDIUM FIXES (metadata lineage gaps, stale generated files, missing UI data)
    List each finding as:
      FIX-0XX: [file] — [description]

  SECTION 4: DEPENDENCY ORDER
    Which fixes must be done before which? (schema before API before UI)
    Write a numbered execution order for Wave 2 agents.

  SECTION 5: GOLDEN THREAD STATUS
    For each of the 8 golden thread links from Agent 0C:
    current status (CONNECTED / PARTIAL / BROKEN) and what fix numbers address it.

  SECTION 6: ESTIMATED SCOPE
    How many files need changes? How many are migrations vs API vs UI vs metadata?
    Is any fix a new migration (requires Bob to apply it)?

  ---

  ## WAVE 2 — FIX AGENTS (sequential by dependency, edit real files)

  Read audit/1A-triage.md before starting. Follow its dependency order exactly.
  Each agent works on one domain layer. Do not overlap file edits between agents.

  ────────────────────────────────────────────────────────────
  AGENT 2A — Schema Integrity Fixer
  ────────────────────────────────────────────────────────────
  Addresses: All CRITICAL findings from Agent 0A (missing FKs, missing RLS, fail-open tables).

  If any fix requires a new migration:
    - Create it as supabase/migrations/YYYYMMDDHHMMSS_integrity_fixes.sql
    - Use the next available timestamp after 20260516000000
    - Include ONLY ALTER TABLE and CREATE POLICY statements — no table creation
    - Enable RLS on any table that has it missing
    - Add FK constraints for any employee_id column missing a REFERENCES clause
    - Add CHECK constraints for status columns that have no validation
    - Add a comment at the top: -- Phase integrity repair: FK and RLS gaps
    - Do NOT drop any existing table or column

  If no migration is needed (RLS policies can be fixed without schema changes):
    - Edit the existing migration that created the table and add the missing policy
    - Note: only do this if the migration has not been applied to production.
      If it has been applied (it's in supabase/migrations/), create a new migration instead.

  After all changes: run npm run build to confirm no TypeScript errors introduced.

  ────────────────────────────────────────────────────────────
  AGENT 2B — Golden Thread Connection Fixer
  ────────────────────────────────────────────────────────────
  Addresses: All BROKEN and PARTIAL golden thread links from Agent 0C.
  Works on: lib/hrms/ helpers and app/api/hrms/ routes only.
  Does NOT touch migrations (Agent 2A owns those) or UI pages (Agent 2D owns those).

  For each broken golden thread link, implement the missing connection:

  LINK 1 — candidates → employees:
    In app/api/hrms/employees/from-candidate/[candidateId]/route.ts:
    After creating the employee row, also:
      - Create an employee_onboardings row with status=draft if the
        employee_onboarding_templates table has a default template
      - Return the new employee_id in the response
    In app/api/hrms/employees/route.ts GET:
      - Add a ?include_candidate=true query param that joins candidates
        to show the source candidate name and join date

  LINK 2 — employees → attendance:
    In app/api/hrms/employees/[id]/route.ts GET:
      - Add attendance_summary to the response: total present days this month,
        total absent, last check-in time. Query attendance table filtered by employee_id.

  LINK 3 — employees → leave:
    In app/api/hrms/employees/[id]/route.ts GET:
      - Add leave_summary: available balance per leave type, pending applications count.
      - Query leave_allocations and leave_applications filtered by employee_id.

  LINK 4 — payroll run → salary slips (THE MOST IMPORTANT):
    Read app/api/hrms/payroll/runs/route.ts carefully.
    When a payroll run is SUBMITTED (status changes to submitted or processed):
      The API must:
      1. Query salary_structure_assignments WHERE payroll_period covers the run period
         AND employee is active
      2. For each employee in the run: create a salary_slip row with:
         - employee_id
         - payroll_entry_id (the run ID)
         - period_start, period_end from the run
         - status = 'draft'
         - gross_amount computed from the salary structure components
      3. Return the count of salary slips created in the response
    If this logic already exists but is broken, fix it.
    If it does not exist at all, implement it.

  LINK 5 — leave approval → leave ledger:
    Read app/api/hrms/leave/applications/[id]/route.ts PATCH handler.
    When status is changed to 'approved':
      The API must INSERT into leave_ledger_entries:
        - employee_id from the application
        - leave_type_id from the application
        - transaction_type = 'application'
        - leaves_taken = number of days in the application
        - balance = prior balance minus leaves_taken (query leave_allocations)
        - leave_application_id = this application's id
    If this logic already exists but is broken, fix it.
    If it does not exist, implement it.

  LINK 6 — expense advance settlement:
    Read app/api/hrms/expenses/advances/route.ts and the advance [id] route.
    When an expense claim is submitted that references an employee_advance_id:
      Update the employee_advance: outstanding_amount -= claim amount.
      If outstanding_amount reaches 0: set advance status = 'settled'.
    Implement this in the expense claims PATCH/POST handler.

  LINK 7 — employees → appraisals:
    In app/api/hrms/performance/route.ts or the appraisals sub-route:
      Ensure GET returns appraisals filtered by employee_id when called
      from an employee context. Include the appraisal_goals in the response.

  LINK 8 — onboarding completion → employee status:
    In app/api/hrms/lifecycle/route.ts or onboarding route:
      When all employee_boarding_activities for an onboarding are marked complete:
      Update employee.employment_status = 'active'.
    When employee_separations status = 'approved':
      Update employee.employment_status = 'exited'.

  For every change: do not change the function signature of existing helpers.
  Extend them by adding new optional parameters or new exported functions.
  Run npm run build after each link is fixed. Stop and report if build fails.

  ────────────────────────────────────────────────────────────
  AGENT 2C — Workflow State Machine Enforcer
  ────────────────────────────────────────────────────────────
  Addresses: All MISSING and PARTIAL workflow enforcement findings from Agent 0E.
  Works on: app/api/hrms/ route handlers only.

  For each workflow that has MISSING or PARTIAL transition enforcement:

  PATTERN TO IMPLEMENT in every PATCH route that changes a status field:

    // 1. Read current record and its status
    const { data: current } = await supabase
      .from('table_name')
      .select('status, employee_id')
      .eq('id', id)
      .single()

    // 2. Validate transition is allowed
    const VALID_TRANSITIONS: Record<string, string[]> = {
      draft: ['submitted', 'cancelled'],
      submitted: ['approved', 'rejected', 'cancelled'],
      approved: ['cancelled'],
      rejected: [],
      cancelled: [],
    }
    if (!VALID_TRANSITIONS[current.status]?.includes(newStatus)) {
      return Response.json({ error: 'Invalid status transition' }, { status: 422 })
    }

    // 3. Update status
    // 4. Perform side effects (ledger write, salary slip creation, etc.)
    // 5. Return updated record

  Apply this pattern to:
    - leave_applications PATCH
    - expense_claims PATCH
    - employee_advances PATCH
    - payroll_entries PATCH (payroll run status)
    - appraisals PATCH
    - employee_onboardings PATCH
    - employee_separations PATCH

  Use the exact valid transitions defined in metadata/workflows.yaml for each domain.
  Do not invent transitions. Import WORKFLOW_KEYS from lib/generated/workflows.ts
  instead of hardcoding status strings where possible.

  Run npm run build after all changes.

  ────────────────────────────────────────────────────────────
  AGENT 2D — Metadata Lineage Repairer
  ────────────────────────────────────────────────────────────
  Addresses: All findings from Agent 0D (missing lineage entries, stale generated files).
  Works on: metadata/ YAML files and lib/generated/ files only.

  STEP 1 — Fix lineage.yaml
    For every metadata key in workflows.yaml, permissions.yaml, routes.yaml that
    has no lineage entry in lineage.yaml: add the entry with all required fields:
      key, domain, source_ref, plan_requirement, registry, db (table + migration),
      typescript (generated file + export), api (routes), ui (surfaces), tests.

    Do not invent test files. If a test does not exist yet, set tests: [] and add
    a comment: # tests pending — Wave 3 will write them.

  STEP 2 — Regenerate
    Run: npm run metadata:generate
    Run: npm run metadata:validate
    Fix any validation errors reported. Validation requires every item to have:
      key, label, domain, owner, source_ref, introduced_in_phase, db_table,
      ts_export, api_routes, ui_surfaces, tests.

  STEP 3 — Check hardcoding
    Run: npm run metadata:check-hardcoding
    For any hardcoded strings it finds in app/ or lib/ (that are not in allowlists/):
      Replace with the imported key from lib/generated/.
      Example: replace the string "approved" with WORKFLOW_KEYS.leave.approved
      where that key exists in lib/generated/workflows.ts.

  STEP 4 — Confirm lineage report runs clean
    Run: npm run metadata:lineage
    It should produce output without any UNTRACED or MISSING entries.

  Run npm run test:metadata after all changes. All tests must pass.

  ────────────────────────────────────────────────────────────
  AGENT 2E — UI Data Reality Fixer
  ────────────────────────────────────────────────────────────
  Addresses: All PLACEHOLDER and DATA_LEAK findings from Agent 0F.
  Works on: app/(app)/ page files and their data fetching only.
  Does NOT redesign layouts or change Tailwind classes.

  Priority order (fix highest-traffic pages first):

  PRIORITY 1 — Employee detail page
    File: app/(app)/people/employees/[id]/page.tsx (or similar)
    This page must fetch and display:
      - Employee core data (name, department, role, joining date, status)
      - Attendance summary this month (from /api/hrms/attendance/days?employee_id=)
      - Leave balance (from /api/hrms/leave/balances?employee_id=)
      - Latest salary slip (from /api/hrms/payroll/salary-slips?employee_id=)
      - Current appraisal cycle status (from /api/hrms/performance/appraisals?employee_id=)
      - Lifecycle stage (onboarding complete? separation in progress?)
    Each of these is a separate fetch. Show each section even if data is empty.
    Show "No data yet" — not a blank area.

  PRIORITY 2 — Dashboard page
    File: app/(app)/dashboard/page.tsx
    The dashboard must show role-aware summary cards:
      admin/hr_manager: total employees, open leaves today, pending expense approvals,
                        next payroll run date, open positions (from jobs table)
      payroll_manager: employees without salary structure (critical alert),
                       next payroll run, salary slips pending submission
      recruiter: open jobs count, candidates in pipeline, interviews today
      employee: my attendance this week, my leave balance, my pending approvals,
                my latest salary slip

    Fetch each card's data from the relevant API routes.
    Do not hardcode counts. Do not show static numbers.

  PRIORITY 3 — Payroll runs page
    File: app/(app)/payroll/runs/page.tsx
    When a payroll run is selected, show:
      - List of employees included in the run
      - For each employee: salary structure name, gross amount, status of their slip
      - Total run amount
    This requires fetching salary_slips joined to employees for the selected run.

  PRIORITY 4 — Self-service page
    File: app/(app)/self-service/page.tsx
    Must show the logged-in employee's own data:
      - My profile summary
      - My attendance this week
      - My leave balance
      - My pending expense claims
      - My latest salary slip download link
      - My active goals and appraisal status
    All fetches must use the employee's own profile_id/employee_id — no admin scope.

  For every data fetch added:
    - Use fetch() to the existing API routes — do not query Supabase directly from pages
    - Handle loading state and error state
    - Do not add new API routes — use existing ones with query parameters
    - Run npm run build after each page. Stop if build fails.

  ---

  ## WAVE 3 — INTEGRATION VERIFICATION (run all 3 agents, parallel where possible)

  ────────────────────────────────────────────────────────────
  AGENT 3A — End-to-End Golden Thread Test Writer
  ────────────────────────────────────────────────────────────
  Write a new test file: tests/integration/golden-thread.test.ts

  This test suite must follow the golden thread from candidate to appraisal
  using the existing test infrastructure patterns (read other test files for patterns).

  The test must:
    1. Create a candidate with final_status = 'joined'
    2. Call the from-candidate conversion API and get back an employee_id
    3. Verify the employee exists in the employees table
    4. Create a shift_assignment for the employee
    5. Create an attendance record for the employee
    6. Create a leave_application for the employee, submit it, approve it
    7. Verify a leave_ledger_entries row was created by the approval
    8. Assign a salary_structure to the employee
    9. Create a payroll_entry (payroll run), submit it
    10. Verify salary_slip rows were created for the employee
    11. Create an appraisal for the employee within an appraisal_cycle
    12. Verify the appraisal is linked to the employee_id from step 2
    13. Create an employee_onboarding, mark all activities complete
    14. Verify the employee's employment_status is now 'active'

  Each step is a separate test (describe + it block).
  Each step uses the real Supabase test client — no mocks.
  If a step fails, report exactly which golden thread link is still broken.

  ────────────────────────────────────────────────────────────
  AGENT 3B — Full Test Suite Runner
  ────────────────────────────────────────────────────────────
  Run every npm test script in order and report results:

    npm run metadata:validate       — must pass with 0 errors
    npm run metadata:generate       — must complete without errors
    npm run metadata:check-hardcoding — must pass with 0 violations
    npm run metadata:lineage        — must produce clean output
    npm run test:metadata           — all tests must pass
    npm run test:employee-core      — all tests must pass
    npm run test:attendance         — all tests must pass
    npm run test:leave              — all tests must pass
    npm run test:expenses           — all tests must pass
    npm run test:payroll            — all tests must pass
    npm run test:performance        — all tests must pass
    npm run test:nav                — all tests must pass
    npm run test:lifecycle          — all tests must pass (if script exists)
    npm run test:self-service       — all tests must pass (if script exists)
    npm run test:reports            — all tests must pass (if script exists)
    npm run build                   — must compile with 0 TypeScript errors

  For any test that fails:
    Report the exact test name, the error message, and which Wave 2 agent
    is responsible for fixing it.

  Do NOT fix test failures yourself. Report them. The orchestrator will decide
  whether to re-run a Wave 2 agent or escalate to the user.

  ────────────────────────────────────────────────────────────
  AGENT 3C — Final Golden Thread Verification Report
  ────────────────────────────────────────────────────────────
  Read audit/0C-golden-thread.md (the original findings).
  Read the results from Agent 3A and Agent 3B.

  Produce audit/3C-final-report.md with this structure:

  GOLDEN THREAD STATUS (after all fixes):
    Link 1: candidates → employees          [CONNECTED / PARTIAL / BROKEN]
    Link 2: employees → attendance          [CONNECTED / PARTIAL / BROKEN]
    Link 3: employees → leave → ledger      [CONNECTED / PARTIAL / BROKEN]
    Link 4: employees → payroll → slips     [CONNECTED / PARTIAL / BROKEN]
    Link 5: expense → advance settlement    [CONNECTED / PARTIAL / BROKEN]
    Link 6: employees → appraisals          [CONNECTED / PARTIAL / BROKEN]
    Link 7: onboarding → employee status    [CONNECTED / PARTIAL / BROKEN]
    Link 8: separation → employee status    [CONNECTED / PARTIAL / BROKEN]

  BEFORE vs AFTER:
    Total BROKEN links before Wave 2: X
    Total BROKEN links after Wave 2: Y
    Remaining broken links and their root cause (needs migration? needs Bob?)

  TEST RESULTS SUMMARY:
    Total tests passed: X
    Total tests failed: Y
    Failing test suites: [list]

  BUILD STATUS: PASS / FAIL

  ITEMS REQUIRING HUMAN ACTION:
    List anything that requires Bob to apply a new migration or confirm Supabase state.

  ITEMS DEFERRED TO PHASE 10:
    List any remaining gaps that are intentionally deferred to Phase 10
    (ATS terminology unification).

  ---

  ## ORCHESTRATOR RULES

  1. Run Wave 0 agents in parallel. All 6 must complete before Wave 1 starts.
  2. Run Wave 1 as a single agent. It must complete before Wave 2 starts.
  3. Run Wave 2 agents in this strict order: 2A → 2B → 2C → 2D → 2E.
     Each must complete and pass npm run build before the next starts.
     If any Wave 2 agent causes a build failure, stop and report before continuing.
  4. Run Wave 3 agents: 3A and 3B in parallel, then 3C after both complete.
  5. Never modify supabase/migrations/ files that have already been applied to
     the linked Supabase project. Create new migrations instead.
  6. Never delete any existing API route, helper function, or page.
     Only add to or fix existing code.
  7. Never change lib/nav/config.ts — it is already correct.
  8. Never change Tailwind CSS classes on existing UI elements.
  9. The audit/ directory is for coordination only. Do not commit it.
  10. After all waves complete, run npm run build one final time.
      This is the single source of truth for whether the task succeeded.

  ---

  ## DEFINITION OF DONE

  The task is complete when:

  1. npm run build passes with 0 TypeScript errors
  2. All npm test:* scripts pass
  3. npm run metadata:validate passes with 0 errors
  4. audit/3C-final-report.md shows 6 or more golden thread links as CONNECTED
  5. No CRITICAL findings remain from audit/0B-api-audit.md
     (no fail-open data leaks, no missing authorization checks)
  6. The leave approval flow writes to leave_ledger_entries (verified by test)
  7. The payroll run submission generates salary_slips (verified by test)
  8. The candidate-to-employee conversion is traceable to an appraisal (verified by test)

  ---
  
  New migrations (if Agent 2A creates one) — Bob (you) still has to apply it with supabase db push --linked. Tell
  Codex to flag anything that needs this and not to assume it's been applied.

  Wave 2B and 2C are the heaviest — the payroll run → salary slip generation and the leave approval → ledger write are
   almost certainly missing. Those two fixes alone will make the biggest difference to making the system actually work
   vs being a skeleton.
