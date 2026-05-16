#!/bin/bash

# Daemon Liveness Monitor
# Runs every 20 seconds via cron, auto-terminates processes exceeding 30 minutes
# Replaces monitor.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DAEMON_SCRIPT="$SCRIPT_DIR/daemon-liveness.ts"
LOG_FILE="$SCRIPT_DIR/daemon-liveness.log"
PID_FILE="$SCRIPT_DIR/.daemon-liveness.pid"

# Ensure tsx is available
if ! command -v npx &> /dev/null; then
    echo "Error: npx not found. Please install Node.js and npm." >> "$LOG_FILE"
    exit 1
fi

# Run the daemon liveness check
run_check() {
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    echo "[$timestamp] Starting daemon liveness check" >> "$LOG_FILE"
    
    # Run the TypeScript script
    npx tsx "$DAEMON_SCRIPT" 2>&1 | tee -a "$LOG_FILE"
    
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        echo "[$timestamp] Daemon liveness check failed with exit code $exit_code" >> "$LOG_FILE"
    fi
    
    return $exit_code
}

# Main execution
if [ "$1" = "--daemon" ]; then
    # Run as daemon with 20-second interval
    echo "Starting daemon liveness monitor as daemon (20-second interval)"
    while true; do
        run_check
        sleep 20
    done
else
    # Run once (for cron)
    run_check
fi
