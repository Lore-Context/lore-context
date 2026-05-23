#!/usr/bin/env bash
# Z2 ⏸ DEFERRED until SDK is published — this script verifies once npm publish
# and PyPI publish have happened for @lore-context/code-indexer and
# lore-context-code-indexer respectively.
#
# Do NOT run this script against the local dev tree. It is intended to be run
# in a clean environment against the published packages.
#
# To use after publishing:
#   1. Set LORE_AUTH_TOKEN and LORE_VAULT_ID (use a test vault, not production).
#   2. Run: bash docs/sdk/scripts/verify-integration-examples.sh
#
# Exit codes: 0 = all checks passed, 1 = one or more checks failed.
#
# Acceptance criterion: V2.0.4-Z2
# Blocked on: @lore-context/code-indexer npm publish + lore-context-code-indexer PyPI publish

set -euo pipefail

PASS=0
FAIL=0

check() {
  local label="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    echo "  PASS  $label"
    PASS=$((PASS + 1))
  else
    echo "  FAIL  $label"
    FAIL=$((FAIL + 1))
  fi
}

# ---------------------------------------------------------------------------
# Guard: refuse to run against unpublished packages
# ---------------------------------------------------------------------------

echo ""
echo "Z2 verify-integration-examples.sh"
echo "=================================="
echo ""
echo "Checking for published packages..."
echo ""

# Check that @lore-context/code-indexer is resolvable from npm registry
if ! npm view @lore-context/code-indexer version >/dev/null 2>&1; then
  echo "DEFERRED: @lore-context/code-indexer is not yet published to npm."
  echo "Re-run this script after 'npm publish' completes for that package."
  echo ""
  echo "Z2 status: ⏸ DEFERRED"
  exit 0
fi

if ! pip index versions lore-context-code-indexer >/dev/null 2>&1; then
  echo "DEFERRED: lore-context-code-indexer is not yet published to PyPI."
  echo "Re-run this script after 'pip publish' completes for that package."
  echo ""
  echo "Z2 status: ⏸ DEFERRED"
  exit 0
fi

echo "Both packages are published. Running integration checks..."
echo ""

# ---------------------------------------------------------------------------
# Credential guard
# ---------------------------------------------------------------------------

if [[ -z "${LORE_AUTH_TOKEN:-}" ]] || [[ -z "${LORE_VAULT_ID:-}" ]]; then
  echo "ERROR: LORE_AUTH_TOKEN and LORE_VAULT_ID must be set."
  echo "Use a test vault — do not run against production."
  exit 1
fi

# ---------------------------------------------------------------------------
# 1. TypeScript SDK — install check
# ---------------------------------------------------------------------------

echo "--- TypeScript SDK ---"

TMPDIR_TS=$(mktemp -d)
trap 'rm -rf "$TMPDIR_TS"' EXIT

pushd "$TMPDIR_TS" >/dev/null

# Install from npm
check "npm install @lore-context/code-indexer" \
  npm install --silent "@lore-context/code-indexer"

# CLI binary is resolvable
check "npx lore-index --help exits 0" \
  npx lore-index --help

# CLI rejects missing credentials gracefully
MISSING_TOKEN_OUTPUT=$(npx lore-index --full 2>&1 || true)
if echo "$MISSING_TOKEN_OUTPUT" | grep -q "LORE_AUTH_TOKEN"; then
  echo "  PASS  --full without credentials prints LORE_AUTH_TOKEN error"
  PASS=$((PASS + 1))
else
  echo "  FAIL  --full without credentials did not print expected error"
  FAIL=$((FAIL + 1))
fi

popd >/dev/null

# ---------------------------------------------------------------------------
# 2. Python SDK — install check
# ---------------------------------------------------------------------------

echo ""
echo "--- Python SDK ---"

TMPDIR_PY=$(mktemp -d)
VENV_DIR="$TMPDIR_PY/venv"
python3 -m venv "$VENV_DIR"
source "$VENV_DIR/bin/activate"

check "pip install lore-context-code-indexer" \
  pip install --quiet lore-context-code-indexer

check "lore-index --help exits 0" \
  lore-index --help

deactivate

# ---------------------------------------------------------------------------
# 3. End-to-end: full index of a minimal fixture repo
# ---------------------------------------------------------------------------

echo ""
echo "--- End-to-end index test (TS SDK, minimal fixture) ---"

FIXTURE_DIR=$(mktemp -d)
trap 'rm -rf "$FIXTURE_DIR"' EXIT

# Create a minimal TypeScript fixture
mkdir -p "$FIXTURE_DIR/src"
cat > "$FIXTURE_DIR/src/hello.ts" << 'TSEOF'
/** Greets a user by name. */
export function greet(name: string): string {
  return `Hello, ${name}`;
}

/** Main entry point. */
export function main(): void {
  console.log(greet("world"));
}
TSEOF

# Initialize git so the indexer can derive a repo name
git -C "$FIXTURE_DIR" init -q
git -C "$FIXTURE_DIR" add .
git -C "$FIXTURE_DIR" commit -q -m "init"

pushd "$FIXTURE_DIR" >/dev/null
LORE_AUTH_TOKEN="$LORE_AUTH_TOKEN" \
LORE_VAULT_ID="$LORE_VAULT_ID" \
LORE_REPO_NAME="z2-verify-fixture" \
  check "lore-index --full on minimal fixture exits 0" \
  npx lore-index --full
popd >/dev/null

# ---------------------------------------------------------------------------
# 4. MCP tool smoke test: code.list_repos
# ---------------------------------------------------------------------------
# This requires the MCP server to be running. In CI this is expected to be
# started as a sidecar before this script runs. Skip if MCP_SERVER_URL is
# not set.

if [[ -n "${MCP_SERVER_URL:-}" ]]; then
  echo ""
  echo "--- MCP tool smoke test (code.list_repos) ---"

  RESPONSE=$(curl -sf -X POST "$MCP_SERVER_URL/mcp" \
    -H "Authorization: Bearer $LORE_AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"code.list_repos","arguments":{}}}' \
    2>/dev/null || echo "")

  if echo "$RESPONSE" | grep -q '"repos"'; then
    echo "  PASS  code.list_repos returns repos array"
    PASS=$((PASS + 1))
  else
    echo "  FAIL  code.list_repos did not return expected repos field"
    echo "        Response: $RESPONSE"
    FAIL=$((FAIL + 1))
  fi
else
  echo ""
  echo "  SKIP  MCP_SERVER_URL not set — skipping MCP tool smoke test"
  echo "        Set MCP_SERVER_URL to the running MCP server URL to enable."
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

echo ""
echo "=================================="
echo "Results: $PASS passed, $FAIL failed"
echo ""

if [[ $FAIL -gt 0 ]]; then
  echo "Z2 status: FAIL"
  exit 1
else
  echo "Z2 status: PASS"
  exit 0
fi
