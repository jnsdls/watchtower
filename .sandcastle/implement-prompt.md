# TASK

Fix issue {{TASK_ID}}: {{ISSUE_TITLE}}

Pull in the issue using `gh issue view {{TASK_ID}} --comments`. If it references a parent PRD or related issue, pull those in too.

Only work on the issue specified.

Work on branch {{BRANCH}}. Make commits as you go.

# DOMAIN CONTEXT

Before exploring, read:

- `CONTEXT.md` at the repo root — the watchtower glossary (Hub, Dashboard, Runner, Job, Run, Task, Project, Event, Agent Provider, Sandbox Provider, Template, Completion Signal). Name domain concepts using these terms; do not drift to synonyms the glossary explicitly avoids.
- Any ADRs in `docs/adr/` that touch the area you're modifying. If your change contradicts an existing ADR, surface it explicitly in the issue comment rather than silently overriding.

If `CONTEXT.md` or `docs/adr/` don't exist yet, proceed silently — early in the project they may not have been created.

# CONTEXT

Here are the last 10 commits:

<recent-commits>

!`git log -n 10 --format="%H%n%ad%n%B---" --date=short`

</recent-commits>

# EXPLORATION

Explore the repo and fill your context window with relevant information that will allow you to complete the task.

Pay extra attention to test files that touch the relevant parts of the code.

# EXECUTION

If applicable, use RGR to complete the task.

1. RED: write one test
2. GREEN: write the implementation to pass that test
3. REPEAT until done
4. REFACTOR the code

# FEEDBACK LOOPS

If a `bun run check` script exists in `package.json`, run it before committing
to ensure lint, type checking, tests, and dead-code analysis all pass.
If individual gates exist (`bun run lint`, `bun run typecheck`, `bun run test`)
but no aggregate `check` script, run each one available.

# COMMIT

Make a git commit. Match the conventional commit style shown in
`<recent-commits>` above: `<type>(<scope>): <description>`. Pick a scope that
already appears in recent history; do not invent new ones. If recent history is
empty (early in the project), pick a scope that names the watchtower component
you're touching (e.g. `hub`, `dashboard`, `runner`, `cli`, `docs`).

Keep the message concise. Add a body only if there are non-obvious decisions
or blockers worth recording.

# THE ISSUE

If the task is not complete, leave a comment on the issue with what was done.

Do not close the issue - this will be done later.

Once complete, output <promise>COMPLETE</promise>.

# FINAL RULES

ONLY WORK ON A SINGLE TASK.
