---
title: Security Model Overview
sidebar_position: 1
description: How XDC Network security works across protocol, network, application, and operational layers — plus the threat model every builder should design against.
---

# Security Model Overview

Security on the XDC Network is layered. No single mechanism protects your users — safety comes from the consensus protocol, the economic security of validators, the correctness of your smart contracts, and the operational discipline of your team. This page maps those layers and the threats each one addresses.

## The Four Pillars

### 1. Protocol Security

At the core of the network sits XinFin Delegated Proof-of-Stake 2.0 (XDPoS 2.0), which regulates XDC nodes in maintaining a consistent decentralized ledger with strong security and performance guarantees. Its three pillars are:

- **Masternode election** — delegation and proof-of-stake determine who may propose and validate blocks.
- **Consensus engine** — the HotStuff state machine replication protocol, a state-of-the-art Byzantine fault-tolerant (BFT) SMR protocol, delivers deterministic finality.
- **Reward mechanism** — incentives for nodes to join and maintain the network, with slashing penalties for extended downtime, double signing, and malicious behavior.

Deterministic finality means confirmed blocks cannot be reorganized, eliminating an entire class of double-spend and reorg attacks that affect probabilistic-finality chains. See [XDPoS 2.0](/docs/xdc-chain/xdpos2) for the full protocol description.

### 2. Network Security

The validator set provides economic security:

- **10,000,000 XDC stake** is required to become a validator — attacking the network means acquiring and risking enormous capital.
- **Distributed masternodes** operated by independent parties with 99.9% expected uptime and static IPs reduce single points of failure.
- **Slashing** punishes validators for extended downtime, double signing, and malicious behavior, making attacks expensive even if attempted.

Network-level details (Chain IDs `50` mainnet / `51` Apothem testnet, RPC endpoints, validator requirements) are documented in the [FAQ](/docs/xdc-chain/faq).

### 3. Application Security

XDC is fully EVM-compatible — Solidity contracts, MetaMask, Hardhat, Foundry, and standard libraries all work unchanged. That means the entire body of Ethereum security knowledge applies directly:

- Reentrancy, access control, oracle manipulation, and front-running are the same threats.
- OpenZeppelin contracts, Slither, and Foundry fuzzing work out of the box.
- XDC's near-zero gas fees make attack probing extremely cheap, so assume your deployed bytecode is being actively scanned.

Start with [Security Best Practices](/docs/smart-contracts/security-best-practices) for secure coding, then the [Vulnerability Catalog](/docs/security/vulnerabilities) for exploit patterns.

### 4. Operational Security

Code correctness is not enough. Key custody, monitoring, and response readiness determine whether an incident becomes a loss:

- Admin keys in multisigs or hardware wallets, never hot wallets.
- Event emission for every critical state change, feeding off-chain monitoring.
- Pause mechanisms and a written response runbook before mainnet.

See [Key Management](/docs/security/key-management) and [Incident Response](/docs/security/incident-response).

## Threat Model

### High-Severity Threats

| Threat | Description | Primary Mitigation |
|---|---|---|
| Contract exploits | Reentrancy, access-control bugs, and logic errors drain funds from immutable deployed code | Audits, fuzzing, checks-effects-interactions — see [Vulnerability Catalog](/docs/security/vulnerabilities) |
| Validator compromise | Stolen masternode keys enable double signing or network disruption | Hardware-backed keys, hardened infrastructure — see [Validator Security](/docs/security/validator-security) |
| Bridge attacks | Cross-chain bridges are high-value targets; bugs or compromised validator sets can unback wrapped assets | Use official/audited bridges, verify contract addresses, limit exposure |
| Oracle manipulation | A single skewed price transaction can drain lending or DeFi protocols that trust spot prices | Medianizers, time-weighted averages, multi-source feeds |

### Medium-Severity Threats

| Threat | Description | Primary Mitigation |
|---|---|---|
| Front-running / MEV | Pending transactions are visible; bots reorder or sandwich sensitive operations | Slippage limits, deadlines, commit-reveal — see [MEV Protection](/docs/smart-contracts/mev-protection) |
| Governance attacks | Accumulated voting power or flash-borrowed tokens push through malicious proposals | Timelocks, quorum floors, vote-escrowed tokens |
| Social engineering | Phishing, fake support, and poisoned approvals trick users and admins into signing away assets | Hardware wallets, transaction simulation, address allowlists |
| Supply chain attacks | Compromised npm packages, malicious dependencies, or tampered tooling inject backdoors at build time | Pinned dependencies, lockfiles, audited libraries only |

## Security by Role

| Role | Start Here |
|---|---|
| Smart contract developers | [Security Best Practices](/docs/smart-contracts/security-best-practices) → [Vulnerability Catalog](/docs/security/vulnerabilities) → [Audit Preparation](/docs/security/audit-prep) |
| Protocol / infra engineers | [XDPoS 2.0](/docs/xdc-chain/xdpos2) → [Validator Security](/docs/security/validator-security) |
| Founders / project leads | [Audit Preparation](/docs/security/audit-prep) → [Incident Response](/docs/security/incident-response) → [Bug Bounty](/docs/security/bug-bounty) |
| Key custodians / ops | [Key Management](/docs/security/key-management) → [Incident Response](/docs/security/incident-response) |

## Core Principles

1. **Immutability is unforgiving.** Deployed code cannot be patched in place — audit before deployment, not after.
2. **Assume active attackers.** Near-zero gas fees mean probing your contract costs an attacker almost nothing.
3. **Defense in depth.** Protocol finality does not fix contract bugs; contract audits do not fix leaked keys. Cover every layer.
4. **Test on Apothem first.** Chain ID `51` mirrors mainnet behavior; exercise every user flow before committing real funds.
