#!/bin/bash

# Test script for daemon-liveness monitor

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_LOG="$SCRIPT_DIR/test-daemon-liveness.log"

echo "Testing daemon-liveness monitor..."

# Test 1: Check if TypeScript script compiles
echo "Test 1: Checking TypeScript compilation..."
if npx tsx --type-check "$SCRIPT_DIR/daemon-liveness.ts" 2>/dev/null; then
    echo "✓ TypeScript compilation successful"
else
    echo "✗ TypeScript compilation failed"
    exit 1
fi

# Test 2: Run the script once
echo "Test 2: Running daemon-liveness check..."
if "$SCRIPT_DIR/daemon-liveness.sh" 2>&1 | tee "$TEST_LOG"; then
    echo "✓ Daemon liveness check completed"
else
    echo "✗ Daemon liveness check failed"
    exit 1
fi

# Test 3: Check log file was created
echo "Test 3: Checking log file..."
if [ -f "$SCRIPT_DIR/daemon-liveness.log" ]; then
    echo "✓ Log file created"
    echo "Last 5 lines of log:"
    tail -5 "$SCRIPT_DIR/daemon-liveness.log"
else
    echo "✗ Log file not found"
    exit 1
fi

# Test 4: Check PID file was created
echo "Test 4: Checking PID file..."
if [ -f "$SCRIPT_DIR/.daemon-liveness.pid" ]; then
    echo "✓ PID file created"
    echo "PID file contents:"
    cat "$SCRIPT_DIR/.daemon-liveness.pid"
else
    echo "✗ PID file not found"
    exit 1
fi

echo ""
echo "All tests passed!"
echo ""
echo "To install the cron job, run:"
echo "  ./setup-cron.sh"
