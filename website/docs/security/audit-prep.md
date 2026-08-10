---
title: Audit Preparation
sidebar_position: 3
description: How to prepare an XDC smart contract for audit — expanded pre-deployment checklist, what auditors need, process timeline, and post-audit actions.
---

# Pre-Deployment Audit Preparation

Contracts on XDC Mainnet (Chain ID `50`) are immutable once deployed — an audit is your last chance to catch bugs before real funds are at stake. This page expands the checklist from [Security Best Practices](/docs/smart-contracts/security-best-practices) with the reasoning behind each item, what auditors expect from you, and what happens after the report arrives.

## Expanded Pre-Deployment Checklist

Work through every item before requesting an audit quote. Auditors charge for time — handing them a self-reviewed codebase is cheaper and produces better findings.

1. **Access control** — Every privileged function is protected by `onlyOwner`, a role check, or equivalent. Verify with tests that call each privileged function from an unauthorized account and expect a revert.
2. **Reentrancy** — All external calls follow checks-effects-interactions and/or are guarded by `nonReentrant`. Update state before the call, not after.
3. **External call return values** — Every low-level `call`/`delegatecall`/`send` checks its success flag. Silent failures are silent fund losses.
4. **No tx.origin authorization** — `msg.sender` is used for every access decision. `tx.origin` opens phishing paths through intermediate contracts.
5. **Oracle manipulation resistance** — Price feeds can't be skewed by a single transaction. Prefer medianizers or time-weighted averages over spot prices, and bound feeds with circuit breakers.
6. **Integer safety** — Compiled with Solidity 0.8.x, which reverts on overflow/underflow. No unjustified `unchecked` blocks.
7. **Front-running review** — Sensitive functions have slippage limits, deadlines, or commit-reveal protection. See [MEV Protection](/docs/smart-contracts/mev-protection).
8. **Upgradeability storage gaps** — Proxy contracts reserve storage gaps, append-only storage changes between upgrades, and every implementation is initialized (no uninitialized implementation left to be hijacked).
9. **Event emission** — Every critical state change (transfers, role changes, parameter updates) emits an event. Events are your monitoring layer after deployment.
10. **Gas limits** — No unbounded loops over user-controlled arrays; withdrawals use pull patterns so one reverting recipient can't block everyone.
11. **Compiler pinned** — Exact Solidity version (e.g. `pragma solidity 0.8.x;`, not a floating range) and optimizer settings recorded so verification reproduces identical bytecode.
12. **Dependencies audited** — OpenZeppelin (or equivalent) versions are current and pinned in your lockfile. No unaudited third-party math, token, or access-control code.
13. **Tests pass** — Unit, integration, and fuzz tests all pass; branch coverage reviewed. See the [Testing Guide](/docs/smart-contracts/testing-guide).
14. **Testnet deployment exercised** — Full user flows tested end-to-end on Apothem Testnet (Chain ID `51`), including attack simulations against your own contract.
15. **Source verification ready** — Contract source and build metadata prepared for verification immediately after deployment. See [Deployment & Verification](/docs/smart-contracts/deployment-verification).
16. **Incident plan** — Pause mechanisms, admin keys in a multisig or hardware wallet, and a written response runbook are in place before launch, not after an exploit.

## What Auditors Need

| Deliverable | Why It Matters |
|---|---|
| **Frozen source code** | Pinned compiler version and build instructions so auditors review exactly what will deploy |
| **Specification / documentation** | Intended behavior, trust assumptions, and privileged roles — most critical findings are spec-vs-code mismatches |
| **Test suite** | Lets auditors run and extend your tests instead of building from scratch |
| **Coverage report** | Shows which branches lack tests; auditors focus there first |
| **Deployed testnet instances** | Live Apothem deployments for interaction and dynamic analysis |
| **Freeze period** | No code changes during the audit — every change after the freeze invalidates reviewed code |

## Audit Process Timeline

| Phase | What Happens |
|---|---|
| 1. Scoping & quote | You share the codebase and spec; the auditor estimates effort and timeline |
| 2. Manual review + automated analysis | Line-by-line review plus tooling (Slither, fuzzing); typically the longest phase |
| 3. Findings report | Issues classified critical / high / medium / low with reproduction steps |
| 4. Remediation | Your team fixes findings; keep every fix in a separate, reviewable commit |
| 5. Re-review & final report | Auditor verifies each fix; the final report reflects the code that will deploy |

Budget time for **at least one remediation round** — first-pass reports almost always contain critical or high findings.

## Post-Audit Actions

1. **Fix review** — Confirm every finding is either fixed and re-reviewed, or consciously accepted with a documented rationale. Never deploy code that differs from the audited commit.
2. **Deploy and verify** — Deploy to mainnet, then verify source on XDCScan immediately so users can read the audited code: [Deployment & Verification](/docs/smart-contracts/deployment-verification).
3. **Set up monitoring** — Wire emitted events into alerting before announcing launch.
4. **Publish the report** — Public audit reports build user trust and deter opportunistic attackers.
5. **Open a bug bounty** — Audits are point-in-time; a bounty keeps whitehats engaged after launch. See [Bug Bounty](/docs/security/bug-bounty).

## Common Mistakes

- **Auditing stale code** — the deployed bytecode must match the audited commit hash exactly.
- **Skipping the freeze** — "just one small change" after the audit reopens the entire attack surface.
- **Treating audit as a guarantee** — audits reduce risk; they don't eliminate it. Keep pause mechanisms and an [Incident Response](/docs/security/incident-response) plan ready.
- **No testnet rehearsal** — if your full user flow hasn't run on Apothem, you're not audit-ready.

## Next Steps

- [Vulnerability Catalog](/docs/security/vulnerabilities) — self-review against known exploit patterns before paying an auditor
- [Security Best Practices](/docs/smart-contracts/security-best-practices) — secure coding habits and the base checklist
- [Testing Guide](/docs/smart-contracts/testing-guide) — unit, integration, and fuzz testing on XDC
