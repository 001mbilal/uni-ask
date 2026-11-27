# /ship — commit, push, PR, review, and auto-merge

Run this command to ship the current branch. It refuses to run on main or with unrelated
uncommitted changes. It gates on local checks, opens a PR, reviews the diff in a fresh
subagent, and enables auto-merge (with one exception — see step 6).

All `gh` calls use `GH_TOKEN=$(gh auth token --user 001mbilal)`.

---

## Step 1 — Safety checks (abort on any failure)

```bash
# Must not be on main
if [ "$(git rev-parse --abbrev-ref HEAD)" = "main" ]; then
  echo "ERROR: /ship must not run on main. Create a feature branch first." && exit 1
fi

# Working tree must be clean (no uncommitted changes)
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "ERROR: working tree has uncommitted changes. Commit or stash them first." && exit 1
fi

# Branch must have commits ahead of main
AHEAD=$(git rev-list --count origin/main..HEAD 2>/dev/null || git rev-list --count main..HEAD)
if [ "$AHEAD" -eq 0 ]; then
  echo "ERROR: no commits ahead of main. Nothing to ship." && exit 1
fi
```

## Step 2 — Engineering gates (abort on any failure)

Run these in order. Stop immediately if any exit non-zero; do NOT open a PR.

```bash
npm run typecheck                       # tsc --noEmit
npm test                                # vitest run
NEXT_TELEMETRY_DISABLED=1 npm run build # next build
```

## Step 3 — Push and open PR

Push the branch over the SSH alias (never use a token in the URL):

```bash
git push -u origin "$(git rev-parse --abbrev-ref HEAD)"
```

Open the PR. Fill the template from **real command output**, not placeholders:

```bash
GH_TOKEN=$(gh auth token --user 001mbilal) gh pr create \
  --title "<conventional-commits-style title matching the branch's commits>" \
  --body "$(cat <<'BODY'
## Summary
<!-- 2-3 bullet points describing what this PR does and why -->

## Evidence
<!-- paste actual output from steps 2 and 3 -->
typecheck: <exit code and any output>
test:      <exit code, N tests passed>
build:     <exit code and route summary>

## Type of change
- [ ] Bug fix
- [ ] New feature / enhancement
- [x] Chore / infra / docs

## Checklist
- [ ] Branch name follows prefix convention (`feat/`, `fix/`, `chore/`, `docs/`)
- [ ] Commits use Conventional Commits format
- [ ] `npm run typecheck` passed (exit 0)
- [ ] `npm test` passed (exit 0, N/N tests)
- [ ] `npm run build` passed (exit 0)
- [ ] No personal data added
- [ ] New `exclude`/`excludePrefixes` entries added for any personal-data documents
- [ ] Crawl changes tested with `npm run crawl -- <uni-id>`
BODY
)" \
  --base main
```

Capture and remember the PR number and URL for the following steps.

## Step 4 — Diff review in a fresh subagent

Spawn a **fork subagent** (no prior context about this PR) and ask it to:

1. Fetch the diff: `GH_TOKEN=$(gh auth token --user 001mbilal) gh pr diff <PR number>`
2. Review it for: correctness bugs, security issues (injection, exposed secrets, auth bypass),
   CLAUDE.md rule violations, and anything that would break the crawl pipeline or answer quality.
3. Return a structured list of findings, severity (important / nit), and suggested fixes.

After the fork returns its findings:

- Post all findings as a **single PR comment** (use `gh pr comment <PR number> --body "..."`)
- For every **important** finding: fix it in a new commit on this branch, push, then resolve the
  conversation with a reply noting the fix.
- Nits do not block shipping but should be listed.
- After fixing: re-run steps 2 (typecheck + test + build) and confirm they still pass.

## Step 5 — Enable auto-merge

**Check the exception in step 6 first.** If the exception does NOT apply:

```bash
GH_TOKEN=$(gh auth token --user 001mbilal) gh pr merge --auto --squash --delete-branch <PR number>
```

This schedules a squash merge the moment the "Typecheck, build, test" CI check goes green.
Print the PR URL and say: "auto-merge enabled — will merge when CI passes."

## Step 6 — Exception: sensitive diffs require manual merge

First, check whether the exception applies using an explicit diff command:

```bash
SENSITIVE=$(git diff origin/main..HEAD -- \
  scripts/crawl.ts \
  src/lib/answer.ts \
  src/lib/universities.ts)
```

If `$SENSITIVE` is non-empty, the exception applies. The sensitive files and areas are:

| File | Sensitive area |
|------|----------------|
| `scripts/crawl.ts` | Crawler politeness rules, 403/429 circuit breaker logic, `robots.txt` checking, User-Agent string, `rejectUnauthorized`, delay/concurrency constants |
| `src/lib/answer.ts` | System prompt, citation rules, retrieval call, query rewriting, model selection |
| `src/lib/universities.ts` | `exclude` or `excludePrefixes` arrays (personal-data exclusion lists) |

If the exception applies:
1. Skip `gh pr merge --auto`.
2. Post a PR comment: "⚠️ This diff touches sensitive crawl/answer/exclusion logic. Auto-merge is disabled. Owner must review and say 'merge'."
3. Print the PR URL and stop. Wait for the owner to say "merge".

---

## Notes

- Never use `--no-verify` or `--force` on any git command.
- Never push directly to main; always go through this workflow.
- Never bypass branch protection.
- The exception in step 6 is intentional. Politeness rules and answer quality rules are
  the two things that could cause real harm (to universities or to users) if they regress.
