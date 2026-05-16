# Daemon Liveness Monitor

This module provides automated monitoring and termination of long-running daemon processes.

## Overview

The daemon-liveness system:
- Runs every 20 seconds via cron
- Monitors all node/python/daemon processes
- Auto-terminates processes exceeding 30 minutes runtime
- Logs all actions to `daemon-liveness.log`
- Replaces the shell-based `monitor.sh`

## Files

- `daemon-liveness.ts` - Main TypeScript monitoring script
- `daemon-liveness.sh` - Shell wrapper for cron execution
- `setup-cron.sh` - Cron job installation script
- `daemon-liveness.log` - Log file (auto-generated)
- `.daemon-liveness.pid` - PID tracking file (auto-generated)

## Installation

1. Run the setup script:
   ```bash
   ./setup-cron.sh
   ```

2. Verify cron job is installed:
   ```bash
   crontab -l
   ```

## Manual Execution

Run the monitor once:
```bash
./daemon-liveness.sh
```

Run as daemon with 20-second interval:
```bash
./daemon-liveness.sh --daemon
```

## Configuration

The following constants can be modified in `daemon-liveness.ts`:

- `MAX_RUNTIME_MS` - Maximum runtime before termination (default: 30 minutes)
- Process filter patterns (node, python, daemon, monitor)

## Logs

Monitor the log file:
```bash
tail -f daemon-liveness.log
```

## Removal

Remove the cron job:
```bash
crontab -l | grep -v 'daemon-liveness' | crontab -
```

## Safety Features

- Only terminates processes matching daemon patterns
- Uses SIGTERM first, then SIGKILL after 5 seconds
- Logs all termination actions
- Preserves PID history for debugging
