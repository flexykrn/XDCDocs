---
title: Incident Response
sidebar_position: 6
description: How to classify, respond to, and learn from security incidents on XDC — severity levels, response runbook skeletons, evidence preservation, communication, and post-incident review.
---

# Incident Response

Security incidents are a matter of when, not if. A pre-agreed severity model and response process turns chaos into a checklist. This page covers the organizational process; for operational, command-level node runbooks (sync failures, downtime, key compromise), see [Incident Response Runbooks](/docs/xdc-chain/developers/node-operators/incident-runbooks).

## Severity Classification

Classify first, then respond. Severity determines who is paged, how fast you move, and what you are allowed to break.

| Level | Definition | Examples |
|---|---|---|
| **P1 — Critical** | Active loss of funds or network-level threat | Smart contract exploit draining funds, admin key compromised with live theft, consensus-impacting validator compromise |
| **P2 — High** | Security control breached, no confirmed loss yet | Validator host compromised without confirmed key theft, deployer/CI key leaked, unauthorized contract privilege change |
| **P3 — Degraded** | Service impact without direct security breach | Node downtime, RPC degradation, monitoring blind spots, failed backup discovered |

When in doubt, classify one level higher. It is cheap to downgrade later and expensive to discover you under-responded.

## Response Runbook Skeletons

Every runbook follows the same shape: **Contain → Assess → Eradicate → Recover → Communicate**. Adapt the details per severity.

### P1 — Critical Contract Exploit

1. **Contain immediately** — pause the contract if a pause function exists (this is why admin controls sit behind a responsive multisig), or front-run remaining risk where feasible.
2. **Assemble responders** — contract owner, multisig signers, auditor contact. Time-box decisions; minutes matter.
3. **Assess scope** — affected contracts, total value at risk, attack vector, whether it is still ongoing.
4. **Eradicate** — deploy a fix or migration contract; coordinate upgrades through the proxy admin if applicable.
5. **Recover** — unpause only after the fix is verified on-chain; consider an independent re-review.
6. **Communicate** — notify users promptly and factually (see below).

### P2 — Validator / Key Compromise

1. **Contain** — isolate the host from the network (or shut the node down) to stop attacker access. If the coinbase key may be exposed, take the node offline to prevent double-signing risk during transition.
2. **Assess** — determine what the attacker reached: host only, or key material? Check auth logs, process lists, and file integrity.
3. **Eradicate** — rebuild from a known-clean image rather than cleaning in place; rotate every credential the host touched.
4. **Recover** — restore from backup per [Backup and Recovery](/docs/xdc-chain/developers/node-operators/backup-recovery), with a fresh key if the old one is suspect.
5. Follow the command-level steps in [Incident Response Runbooks](/docs/xdc-chain/developers/node-operators/incident-runbooks).

### P3 — Service Degradation

1. Diagnose against the relevant operational runbook.
2. Fix, verify recovery through [Monitoring](/docs/xdc-chain/developers/node-operators/monitoring), and confirm alerting worked.
3. If the root cause reveals a security gap (e.g. an exposed port), reclassify and escalate.

## Evidence Preservation

Before you rebuild anything, capture evidence — you get one chance:

- Snapshot logs: node logs, `docker-compose logs`, auth logs (`/var/log/auth.log`), and shell history.
- Record on-chain artifacts: attacker addresses, exploit transaction hashes, affected contract states — all permanently verifiable on [XDCScan](https://xdcscan.com).
- Image or snapshot the compromised disk/host if forensics may be needed.
- Keep a timestamped incident timeline from the first alert onward. It is invaluable for the post-incident review and for any external reporting.

## Communication

- **Internal:** maintain a pre-agreed contact tree — who is paged for each severity, and who has authority to pause contracts or take validators offline.
- **Multisig signers:** for P1s, signers must be reachable around the clock; a 2-of-3 multisig that cannot assemble 2 signers in an emergency is a liability.
- **Users / public:** for incidents affecting user funds, communicate early, factually, and without speculation: what happened, what is affected, what users should do, and when the next update will come.
- **External security contacts:** if the incident affects shared infrastructure or other projects, coordinate disclosure rather than going public unilaterally.

## Post-Incident Review

After every P1/P2 (and recurring P3s), run a blameless review within a week:

1. **Timeline** — reconstruct detection, response, and recovery from the preserved evidence.
2. **Root cause** — identify the technical cause and the process gap that allowed it.
3. **What worked / what didn't** — did monitoring catch it? Did the runbook match reality? Were signers reachable?
4. **Action items** — each with an owner and a deadline: hardening, runbook updates, new alerts.
5. **Feed improvements back** into [Validator Security](/docs/security/validator-security) practices, key rotation schedules, and your audit scope (see [Audit Preparation](/docs/security/audit-prep)).

The goal is not to assign blame — it is to make the next incident shorter, cheaper, and rarer.
