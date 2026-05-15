# Bob Log

## 2026-05-14 Initial Coordination Setup

- Role: master coordinator for tmux-managed Codex sessions.
- Active workspace: `C:\Users\Admin\Music\HRMS\HRMS-main`.
- Visible sessions: `bob`, `anish`, `trisha`, `Tannu`.
- Protocol file: `.planning/team-context/TEAM-CONTEXT-PROTOCOL.md`.
- Rule: when any Codex session reaches 40% context remaining or lower, pause that session, make it append a handoff summary here or in its own log, start a fresh Codex session, tell the fresh session to read the relevant log, then terminate the old session after handoff confirmation.
- Tmux command delivery rule: before sending any worker prompt, capture the pane and confirm Codex is live. If Codex is not live, start `codex`, wait/check that the Codex UI is active, then send the prompt.
- Prompt submission rule: after sending a worker prompt, also send Enter / `C-m`, then capture the pane again to confirm the prompt was inserted and submitted. Do not count a command as delivered if it is only sitting in the input box.
- Delegation rule: before assigning work, understand the phase scope and completed state, then split work by independent ownership boundaries such as backend/API, database/RLS, frontend/UI, tests, docs, and verification.
- Team subagent rule: when a worker receives complicated work with two or more independent parts, instruct that worker to spin up at least two subagents internally while keeping integration, verification, and log updates under that team's responsibility.
- Phase 4 state reviewed: Phase 4 is `Expenses, Advances, and Travel`; phases 0-3 are complete; Phase 4 is ready to execute and implementation is absent.
- Phase 4 split:
  - `anish`: metadata contract plus SQL/RLS/storage migration and related tests.
  - `trisha`: pure expense helpers, authorization helpers, API routes, and related tests.
  - `Tannu`: finance route access, sidebar, UI pages, UI contract tests, and browser verification preparation.
- Next action: dispatch scoped Phase 4 prompts to the three teams after confirming each pane has live Codex, submit prompts with `C-m`, then monitor for progress, conflicts, and context below 40%.
