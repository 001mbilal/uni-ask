#!/usr/bin/env bash
# gh wrapper — always runs as 001mbilal regardless of the global `gh` active account.
# Usage: scripts/gh.sh <gh args...>
# Never call `gh auth switch` or hardcode tokens; this script handles account selection.
set -euo pipefail

exec env GH_TOKEN="$(gh auth token --user 001mbilal)" gh "$@"
