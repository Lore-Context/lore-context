# Lore Cloud Privacy

Privacy contracts, data-handling policies, and audit guides for Lore Context
(memory + code KG + secret vault).

## Code Knowledge Graph (v2.0.4)

- [Code Graph Privacy Model](./code-graph-privacy-model.md) — Tier-1 allowlist
  and denylist (what leaves your machine), Tier-2 residual leakage statement
  (symbol-name obfuscation, not E2E encryption), secret-pattern regex
  denylist, file rejection patterns, and change-control process.

## Secret Vault (v2.0.5)

- Lore Secret Vault security model and threat model — private until crypto audit.
- Secret Vault setup and recovery — private until crypto audit.
- Agent authorization model (`once` / `always` / `deny`) — private until crypto audit.

### Zero-knowledge guarantees

For the Secret Vault feature specifically:

- Lore Cloud servers store only **ciphertext**. The encryption key
  (Vault Master Key, derived from your Master Passphrase + Secret Key)
  never leaves your device.
- We cannot decrypt your secrets. If law enforcement compels us to hand
  over your data, what we can deliver is encrypted bytes — useful only
  to whomever has both your Master Passphrase AND your Secret Key.
- The full Secret Vault threat model remains private until crypto audit.

### What we DO see (across all Lore features)

- Account email + name (for billing + support)
- Vault metadata: timestamps, labels, categories, tags, last-used counts
  (labels are NOT encrypted — see `security-model.md` §"Plaintext metadata"
  for the trade-off)
- Audit log entries: actions, agent identifiers (HMAC-hashed, not raw),
  occurrence times, client IP
- Conversation memory: full content, indexed for search (this is NOT
  zero-knowledge — memory is a separate product surface; see
  `../privacy/memory-data-handling.md` (TBD v2.1))
- Code knowledge graph: see [`./code-graph-privacy-model.md`](./code-graph-privacy-model.md)

### What we DON'T see (Secret Vault)

- Master Passphrase
- Secret Key (the 26-char base32 string in your Emergency Kit)
- Vault Master Key or any per-secret derived keys
- Plaintext of any `secret_items.ciphertext` row
- The contents of your Emergency Kit PDF (it's generated client-side)

## Data retention

| Data type | Retention |
|---|---|
| Active secrets | Indefinite (until you revoke) |
| Soft-deleted secrets | 30 days, then hard-deleted by purge worker |
| Audit log | 365 days (rolling); v2.1 lets you configure |
| Account-level data | Deleted within 30 days of account closure |

## GDPR / CCPA

- **Right to access:** Use `/settings/secrets/export` to get a JSON dump
  of your encrypted vault state (you can decrypt locally with your
  Master Passphrase + Secret Key).
- **Right to delete:** Use `/settings/secrets/delete-vault` (irreversibly
  destroys all secret_* rows + secret_audit_log).
- **Right to portability:** Secret Vault import/export format details remain
  private until crypto audit. Export to those formats is a v2.1 feature.

## Contact

- Privacy questions: `privacy@lorecontext.com`
- Security disclosure: `security@lorecontext.com` (PGP key in
  `security-whitepaper.md` §5)
- Account / billing: `support@lorecontext.com`
