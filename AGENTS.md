<!-- GSD:project-start source:PROJECT.md -->
## Project

**HireRabbits ATS to HRMS Upgrade**

HireRabbits is an existing Next.js 14 and Supabase ATS being upgraded into a complete HRMS. The upgraded product must preserve current recruiting workflows while adding employee core data, attendance, leave, expenses, payroll, performance, lifecycle, self-service, reports, notifications, and HR automation.

The HRMS reference repo at `C:\Users\Admin\Music\Rabbit F\Rabbits-main v1\hrms-develop\hrms-develop` is a feature and workflow reference only. It must not be copied into this Next.js/Supabase app.

**Core Value:** HireRabbits must become a governed HRMS without breaking the ATS workflows that already run the business.

### Constraints

- **Architecture**: Keep Next.js App Router, TypeScript, Supabase Auth, Supabase Postgres, Supabase RLS, Tailwind, and the existing API/sidebar/layout patterns.
- **Brownfield safety**: HRMS work must preserve existing ATS behavior unless a change is explicitly planned and verified.
- **Metadata governance**: New roles, statuses, routes, form fields, workflow states, permissions, reports, salary components, leave types, approval rules, and import aliases must use governed metadata.
- **Database safety**: Supabase migrations must be incremental, reversible where practical, and include RLS in the same migration as new HRMS tables.
- **Security**: RLS policies must fail closed and use helper functions or generated permission helpers for role and permission decisions.
- **Frontend QA**: Use `agent-browser.cmd` for local browser verification before adding Playwright.
- **Execution discipline**: GSD owns roadmap/state/verification; Superpowers owns implementation discipline, TDD, reviews, and branch finishing.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:STACK.md -->
## Technology Stack

Technology stack not yet documented. Will populate after codebase mapping or first phase.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
