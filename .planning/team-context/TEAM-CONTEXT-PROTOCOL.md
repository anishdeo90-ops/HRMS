# Team Context Protocol

This directory is the handoff source of truth for tmux-managed Codex workers.

## Sessions

- `bob`: master coordinator
- `anish`: worker
- `trisha`: worker
- `Tannu`: worker
- `jumbo`: worker

## Logs

- `bob.md`
- `anish.md`
- `trisha.md`
- `Tannu.md`
- `jumbo.md`

Each session must keep its own log current enough that a fresh Codex session can continue without relying on terminal scrollback.

## Context Threshold Rule

When a session's visible Codex context indicator reaches 40% remaining or lower:

1. Stop assigning new work to that session.
2. Ask it to append a concise handoff to its log file.
3. The handoff must include:
   - Current objective
   - Files read
   - Files changed
   - Commands run
   - Decisions made
   - Current blockers or risks
   - Exact next action
4. Start or reuse a fresh tmux session for that team identity.
5. Start `codex` in the fresh terminal first.
6. In the new Codex prompt, instruct it to read its log file and continue from the latest handoff.
7. After the replacement confirms it has the handoff, terminate the old exhausted session.

## Worker Command Template

Use this when starting a fresh worker:

```text
You are Team {name}. Before doing anything else, read:

.planning/team-context/{name}.md

Continue from the latest handoff. Follow AGENTS.md, preserve existing user changes, and update your team log before context drops to 40% remaining.
```

## Tmux Command Delivery Rules

Never assume a tmux terminal is ready just because the session exists.

Before sending a task command to a worker:

1. Check the pane with `tmux capture-pane`.
2. Confirm Codex is live in that terminal. The pane should show the Codex UI or a Codex prompt/status line.
3. If Codex is not live, start it first by sending `codex` and Enter.
4. Re-check the pane and confirm Codex has started.
5. Send the worker prompt.
6. Submit the prompt with Enter / `C-m`.
7. Re-check the pane and confirm the prompt is no longer just sitting in the input box. It must show Codex working, running a command, or producing an answer.

Do not pass task instructions into a plain shell prompt or an inactive terminal.

## Delegation Rules

Before Bob assigns work:

1. Understand the phase scope and what has already been completed.
2. Split the work by independent ownership boundaries, such as backend/API, database/RLS, frontend/UI, tests, documentation, or browser verification.
3. Assign each tmux team a focused scope with clear files or modules where practical.
4. Avoid assigning two teams to edit the same files unless Bob explicitly sequences the work.
5. For complicated work, tell the assigned team to create at least two subagents for its own internal investigation or implementation split when the scope has two or more independent parts.
6. Each team is allowed to spin up subagents for delegated work, but must keep responsibility for integration, verification, and updating its team log.
7. Each team must report changed files, commands run, blockers, and verification results back to Bob.

## Efficiency and Lane Discipline

Use this protocol for long multi-phase work so sessions conserve context and avoid collisions.

1. Bob owns routing. Workers do not expand their file scope unless Bob explicitly reassigns it.
2. Worker prompts must be compact and single-line when sent through tmux. Put durable details in the team log instead of repeating long phase text in every prompt.
3. A worker may read outside its lane to understand contracts, but must not edit outside its assigned lane.
4. If a needed fix is outside a worker's lane, the worker reports the exact file and issue to Bob instead of patching it.
5. Workers should run the narrowest useful tests first, then one broader owned command before reporting.
6. Subagents are for bounded side work only. A worker should give each subagent a disjoint read/write scope and require a short changed-files/test result.
7. Workers must not start new broad codebase scans after they already know the files needed for the current patch.
8. Reports back to Bob must use this compact shape: `status`, `changed files`, `tests`, `blockers`, `next action`.
9. Bob should monitor with `tmux capture-pane -p -S <small number>` snapshots unless a deeper transcript is needed.
10. Bob should avoid re-prompting a worker while its pane shows an active command, `Working`, or a wait on internal subagents unless a blocker or lane conflict requires interruption.

## Coordinator Responsibilities

Bob monitors the visible Codex status lines in tmux panes, delegates independent tasks, prevents write conflicts, and keeps `bob.md` updated with coordinator state.

## Migration Application Ownership

Bob owns live database migration operations for every phase.

Workers may create migration files, update migration contract tests, and run local/file-based verification inside their lane. Workers must not assume a phase is live just because migration tests pass.

Before any phase is called complete, Bob must:

1. Identify the target Supabase project from the active environment.
2. Run or confirm `supabase link` for that project.
3. Run `supabase migration list` and compare local vs remote versions.
4. Apply pending migrations with `supabase db push` when approved/available.
5. Re-run `supabase migration list` to confirm local and remote match.
6. Browser-verify affected routes against the live app and watch for schema-cache or missing-table errors.
7. Record the migration result in `bob.md`.

Bob must also follow the same handoff rule for itself before context reaches 40% remaining.

## Supabase Embed Discipline

For tables with more than one foreign key to the same target table, API routes must qualify PostgREST embeds with the exact FK name, for example `employee:employees!expense_claims_employee_id_fkey(...)`.

Do not use unqualified embeds such as `employee:employees(...)` in finance, attendance, leave, or lifecycle APIs unless code inspection proves there is only one relationship to that target table. If a browser error says `more than one relationship was found`, fix the API select string or remove the embed; do not treat it as a migration problem unless the FK is actually missing.

## Navigation Architecture Discipline

All sidebar routes must be represented in `lib/nav/config.ts`.

Future phase routes must be added to `NAV_CONFIG` with `enabled: false` until the route, tests, and browser verification are complete. Workers must not add sidebar-only JSX links or one-off role filters in `components/sidebar.tsx`.

Sidebar role visibility belongs in `NAV_CONFIG` role arrays and helpers. `components/sidebar.tsx` should render from `getNavForRole(profile.role)` and `getSectionsForRole(profile.role)` and keep Settings outside the main nav loop for `admin` and `hr_manager` only.

Settings role assignment must render from the central `ROLES` list in `lib/types.ts` and exclude only `candidate` unless Bob changes that rule. User create/edit API routes must validate role strings against the same central list before writing to `profiles.role`.
