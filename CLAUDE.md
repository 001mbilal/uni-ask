# uni-ask — project rules for Claude

## Repository
- Owner: **001mbilal** only. Never push or open PRs as BilalSheikh-dev.
- Remote: `git@github-001mbilal:001mbilal/uni-ask.git` (SSH alias, no token in URL).
- **main is protected**: never push directly to main. All changes go through a PR.

## GitHub CLI
- **Always use `scripts/gh.sh` instead of `gh` directly.** It injects `GH_TOKEN` for
  `001mbilal` automatically, so the correct account is always used regardless of which
  account is globally active in the shell.
- Never run `gh auth switch`. Never call bare `gh` for API or PR operations.

## Branch naming
| Prefix | Use for |
|--------|---------|
| `feat/` | new features |
| `fix/` | bug fixes |
| `chore/` | infra, deps, config, scripts |
| `docs/` | documentation only |

## Commits
- Follow **Conventional Commits**: `type(scope): description` (scope optional).
- One logical change per commit. No "WIP" or "misc fixes" messages.
- Author: `Muhammad Bilal <mbilalsheikh.dev@gmail.com>`.
- Never amend a published commit; create a new one instead.

## Pull request workflow

**Always use `/ship` to ship a branch. Never push directly to main. Never bypass branch protection.**

`/ship` does the following automatically:
1. Refuses to run on main or with uncommitted changes.
2. Runs `npm run typecheck`, `npm test`, and `npm run build` — stops on any failure.
3. Pushes the branch over the SSH alias (`git@github-001mbilal:...`) and opens a PR.
4. Reviews the diff in a fresh subagent (no prior context), posts findings as a PR comment, and fixes any important issues.
5. Enables auto-merge (`gh pr merge --auto --squash --delete-branch`) so the PR merges itself when CI goes green.
6. **Exception — do NOT enable auto-merge** if the diff touches:
   - `scripts/crawl.ts`: politeness rules, circuit breaker, robots.txt, User-Agent, delays
   - `src/lib/answer.ts`: system prompt, citation rules, retrieval, model selection
   - `src/lib/universities.ts`: `exclude` or `excludePrefixes` arrays
   In that case, post the PR URL and wait for the owner to say "merge".

## Crawling ethics — hard rules
- **No UA spoofing.** The crawler uses `UniAskBot/0.1 (+contact: <CRAWL_CONTACT>)`.
  Never change the UA to impersonate a real browser.
- **No IP rotation or proxy bypass.**
- **Respect robots.txt.** The crawler checks `isAllowed` before fetching.
- If a university blocks the crawler (403/429 circuit breaker), do not attempt
  to circumvent the block. Leave it blocked and note it in the PR.

## TLS
- Never set `rejectUnauthorized: false`.
- For broken cert chains: download the missing intermediate from the AIA URL in
  the leaf cert and add it to `certs/`. Add the domain to `BROKEN_CHAIN_DOMAINS`
  in `crawl.ts` with a comment citing the source URL and cert subject/expiry.

## Personal data
- Never store named individual data (seat lists, merit lists, result sheets,
  roll numbers) in the database.
- When a personal-data document is found, **delete it from the DB** and add its
  URL to the `exclude` array (or its path prefix to `excludePrefixes`) in
  `src/lib/universities.ts` before opening a PR.
- The `SKIP_ROLL` regex in `crawl.ts` catches these at crawl time; keep it up to date.

## Testing
- Run `npm run typecheck` and `npm test` before every commit.
- Tests live in `scripts/__tests__/` (crawl utilities) and `src/lib/__tests__/` (lib).
- Tests must be pure (no network, no DB). Use vitest.

## Environment variables
- Never commit `.env` or any file containing real API keys or secrets.
- `.env.example` documents all required vars with safe placeholder values.

## Stale content
- `isStaleUrl()` skips URLs whose only year is ≥ 2 years old.
- Versioned documents (old prospectuses, catalogs) must be added to `exclude`
  so they cannot re-enter the index on a re-crawl.
