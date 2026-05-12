# Rabbits Project

Root: `C:\Users\admin\Music\Rabbits-main`
Stack: Next.js · TypeScript · Supabase · HRMS modules (attendance, leave, payroll)

---

## Context Management Protocol — READ THIS EVERY SESSION

This project has 38,000+ files. Long tasks WILL drain the context window.

### When context drops to ~40% remaining — do ALL of these steps:

**Step 1 — Run `/compact`** immediately.

**Step 2 — Write the handoff prompt** to `.claude/handoff-signal.txt`.
Write it as a direct message TO the next Claude session, as if briefing a colleague who is taking over right now. Use this format exactly:

```
I am continuing a Claude session that ran out of context. Here is your full briefing:

## Task I was working on
<one clear sentence>

## What has been completed
- <file or feature done, with path>
- <file or feature done, with path>

## What to do next (start here immediately)
<specific next action — file path, function name, exactly what to write or change>

## Active file paths
<list every file currently open or recently edited>

## Important decisions / gotchas
<anything the next session must know to not repeat mistakes or undo work>

Continue from "What to do next" without asking for clarification.
```

**Step 3 — Tell the user:**
> "Context at 40% — compacted and handoff written. New terminal opening automatically."

The hook detects `.claude/handoff-signal.txt`, saves it to `.claude/handoffs/` with a timestamp, prints it in the new terminal, and passes it directly to `claude --continue` as the first message.

### Rules
- Act at 40% — do NOT wait until 20% or lower.
- The handoff must be specific: file paths, function names, exact next step. Vague handoffs waste the new session.
- Never write "see conversation above" — the new session starts fresh.
- After the new terminal opens, this session can be closed.

---

## Project Modules

- `app/(app)/time/` — Attendance & Leave UI pages
- `app/api/hrms/` — HRMS API routes (leave, compensatory, encashments)
- `lib/hrms/` — Auth, access control, leave logic
- `supabase/migrations/` — DB schema
- `tests/` — Contract tests (attendance, leave UI + API + SQL)
- `components/` — Shared UI (sidebar, etc.)
- `metadata/routes.yaml` — Route metadata
