#!/bin/sh
# U1 acceptance test: install-git-hook integration test.
#
# Creates a temp git repo, runs `lore-index install-git-hook`,
# makes a commit, asserts the hook fired.
#
# Exit code: 0 = PASS, 1 = FAIL
set -e

PKG_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DIST_CLI="$PKG_DIR/dist/cli.js"
TMP_DIR="$(mktemp -d)"
HOOK_FIRED_FILE="$TMP_DIR/hook_fired"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

echo "[test-git-hook] Temp repo: $TMP_DIR"

# Verify dist/cli.js exists (package must be built first)
if [ ! -f "$DIST_CLI" ]; then
  echo "[test-git-hook] FAIL: dist/cli.js not found. Run: pnpm --filter @lore-context/code-indexer build"
  exit 1
fi

# Init temp git repo
cd "$TMP_DIR"
git init -q
git config user.email "test@lore-context.com"
git config user.name "lore-index test"

# Install the hook using our CLI
# We pass a custom hook script that writes to $HOOK_FIRED_FILE instead of running
# the real indexer (no API creds available in CI)
node "$DIST_CLI" install-git-hook 2>&1 || {
  echo "[test-git-hook] FAIL: install-git-hook command exited non-zero"
  exit 1
}

# Verify hook file exists and is executable
HOOK_PATH="$TMP_DIR/.git/hooks/post-commit"
if [ ! -f "$HOOK_PATH" ]; then
  echo "[test-git-hook] FAIL: .git/hooks/post-commit was not created"
  exit 1
fi

if [ ! -x "$HOOK_PATH" ]; then
  echo "[test-git-hook] FAIL: .git/hooks/post-commit is not executable"
  exit 1
fi

# Verify the hook contains our sentinel
if ! grep -q "Lore Context" "$HOOK_PATH"; then
  echo "[test-git-hook] FAIL: hook does not contain Lore Context sentinel"
  exit 1
fi

echo "[test-git-hook] Hook installed and executable. Content:"
cat "$HOOK_PATH"

# Replace the hook with one that writes a sentinel file (so we can verify it fired)
# without requiring real LORE_AUTH_TOKEN / API connectivity
cat > "$HOOK_PATH" << 'HOOK_SCRIPT'
#!/bin/sh
# Lore Context — post-commit hook (test stub)
echo "hook_fired" > "$HOOK_FIRED_FILE_PLACEHOLDER"
HOOK_SCRIPT
# Substitute the placeholder with the actual path
sed -i.bak "s|HOOK_FIRED_FILE_PLACEHOLDER|$HOOK_FIRED_FILE|g" "$HOOK_PATH"
chmod +x "$HOOK_PATH"

# Make a commit to trigger the hook
echo "hello" > test.txt
git add test.txt
git commit -q -m "test: verify hook fires"

# Assert the hook fired
if [ ! -f "$HOOK_FIRED_FILE" ]; then
  echo "[test-git-hook] FAIL: hook did not fire on commit"
  exit 1
fi

echo "[test-git-hook] PASS: hook fired on commit"
exit 0
