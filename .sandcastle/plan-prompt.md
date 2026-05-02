# ISSUES

Here are the open issues in `jnsdls/watchtower` that have been triaged
**ready-for-agent** (see `docs/agents/triage-labels.md`):

<issues-json>

!`gh issue list --state open --label ready-for-agent --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`

</issues-json>

# DOMAIN CONTEXT

Before reasoning about dependencies, skim:

- `CONTEXT.md` — the watchtower glossary (Hub, Dashboard, Runner, Job, Run, Task, Project, Event, Agent Provider, Sandbox Provider, Template, Completion Signal). Use these terms verbatim when describing dependencies; do not drift to synonyms the glossary explicitly avoids.
- `docs/adr/` — architectural decisions; if any apply to the issues you're planning around, factor them in.

# TASK

Analyze the open issues and build a dependency graph. For each issue, determine whether it **blocks** or **is blocked by** any other open issue.

An issue B is **blocked by** issue A if:

- B requires code, schema, or infrastructure that A introduces (e.g. B touches the Hub HTTP API but A defines the Hub process boundary).
- B and A modify overlapping files or modules, making concurrent work likely to produce merge conflicts.
- B's requirements depend on a decision or interface shape that A will establish (often signalled by an ADR placeholder).

An issue is **unblocked** if it has zero blocking dependencies on other open issues.

For each unblocked issue, assign a branch name using the format `sandcastle/issue-{id}-{slug}`.

# OUTPUT

Output your plan as a JSON object wrapped in `<plan>` tags:

<plan>
{"issues": [{"id": "42", "title": "Wire Runner→Hub event stream", "branch": "sandcastle/issue-42-wire-runner-hub-event-stream"}]}
</plan>

Include only unblocked issues. If every issue is blocked, include the single highest-priority candidate (the one with the fewest or weakest dependencies).
