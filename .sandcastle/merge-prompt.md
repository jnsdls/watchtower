# TASK

Merge the following branches into the current branch:

{{BRANCHES}}

For each branch:

1. Run `git merge <branch> --no-edit`
2. If there are merge conflicts, resolve them intelligently by reading both sides and choosing the correct resolution
3. After resolving conflicts, run `bun run check` if it exists, otherwise run whichever of `bun run lint`, `bun run typecheck`, `bun run test` are defined, to verify the merge is clean
4. If any checks fail, fix the issues before proceeding to the next branch

After all branches are merged, make a single commit summarizing the merge.

# CLOSE ISSUES

For each branch that was merged, close its issue. The issue number is the first field on each line below:

{{ISSUES}}

Close each one with: `gh issue close <number> --comment "Completed by Sandcastle"`

Once you've merged everything you can, output <promise>COMPLETE</promise>.
