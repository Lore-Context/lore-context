# Cost Budget Ledger

## Configuration
- **Daily Cap**: $100 USD
- **Warning Threshold**: 80% ($80 USD)
- **Hard Pause Threshold**: 100% ($100 USD)

## Current Shift Ledger

### 2026-05-07 (UTC)
| Time | Service | Operation | Cost (USD) | Running Total | Notes |
|------|---------|-----------|------------|---------------|-------|
| 11:15 | AWS | Cost Explorer query | $0.00 | $0.00 | Ledger initialized |
| 18:00 | AWS | Cost Explorer (full day snapshot) | $2.28 | $2.28 | EC2 $1.80, ElastiCache $0.19, RDS $0.09, VPC $0.10, CE $0.06, EC2-Other $0.04 |

**AWS Service Breakdown (2026-05-07)**:
| Service | Cost (USD) |
|---------|------------|
| Amazon EC2 Compute | $1.7961 |
| Amazon ElastiCache | $0.1920 |
| Amazon VPC | $0.1000 |
| Amazon RDS | $0.0898 |
| AWS Cost Explorer | $0.0600 |
| EC2 - Other | $0.0374 |
| **Total** | **$2.2754** |

**Daily Total**: $2.28 / $100.00 (2.3%)

### 2026-05-08 (SGT, UTC+8)
| Time | Service | Operation | Cost (USD) | Running Total | Notes |
|------|---------|-----------|------------|---------------|-------|
| 02:00 SGT | AWS | Cost Explorer query | $0.00 | $0.00 | Early morning — AWS CE lagging; costs not yet reported for today |

**Daily Total**: $0.00 / $100.00 (0%) — *estimated, data lagging*

## Status
- ✅ **NORMAL** — May 7 final: $2.28 (2.3%), May 8 early: $0.00 (lagging)
- No cron jobs paused
- No alerts triggered
- Well below warning threshold ($80)

## Cron Pause Status
| Cron Job | Status |
|----------|--------|
| perf-baseline | ✅ Running |
| weekly-arch-audit | ✅ Running |
| all other crons | ✅ Running |

## Historical Averages
| Date | Total (USD) |
|------|-------------|
| 2026-05-07 | $2.28 |
| **Avg** | **$2.28** |

## Notes
- Ledger initialized on 2026-05-07 at 11:15 UTC
- AWS Cost Explorer has ~6-12h lag — early morning queries for same day return $0.00
- Tracking: AWS (EC2, RDS, ElastiCache, VPC, CloudWatch, SQS), Cloudflare, GitHub API, LLM API costs
- Auto-pause triggers: perf-baseline cron, weekly-arch-audit cron at >=80%
- Hard pause all non-critical cron at >=100%
- Major cost driver: EC2 compute ($1.80/day) — stable, expected for always-on infra
