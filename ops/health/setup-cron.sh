#!/bin/bash

# Setup script for daemon-liveness cron job
# Runs every 20 seconds, replaces monitor.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CRON_FILE="/tmp/daemon-liveness-cron"
LOG_FILE="$SCRIPT_DIR/daemon-liveness.log"

echo "Setting up daemon-liveness cron job..."

# Create cron entry that runs every 20 seconds
# Note: Standard cron doesn't support sub-minute intervals, so we use multiple entries
cat > "$CRON_FILE" << 'CRON'
# Daemon liveness check - runs every 20 seconds
# This replaces the shell-based monitor.sh
* * * * * /home/ubuntu/Lore/ops/health/daemon-liveness.sh
* * * * * sleep 20 && /home/ubuntu/Lore/ops/health/daemon-liveness.sh
* * * * * sleep 40 && /home/ubuntu/Lore/ops/health/daemon-liveness.sh
CRON

# Backup existing crontab
crontab -l > /tmp/crontab-backup-$(date +%Y%m%d%H%M%S) 2>/dev/null || true

# Add new cron entries
(crontab -l 2>/dev/null || true; cat "$CRON_FILE") | crontab -

echo "Cron job installed successfully!"
echo "Current crontab:"
crontab -l

echo ""
echo "To remove the cron job, run:"
echo "  crontab -l | grep -v 'daemon-liveness' | crontab -"
