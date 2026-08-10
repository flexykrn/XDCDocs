---
title: Key Management
sidebar_position: 4
description: How to generate, store, rotate, and back up the different key types used on XDC Network — validator coinbase keys, wallet keys, contract admin keys, and CI deployer keys.
---

# Key Management

Private keys are the only thing standing between an attacker and your funds, your stake, or your contract's admin controls. This page covers the key types you will encounter on XDC, how to store them by risk tier, and operational practices for rotation and backup. For an overview of the broader threat model, see [Security Overview](/docs/security/overview).

## Key Types on XDC

Different keys carry different blast radii. Treat them differently.

- **Validator coinbase key** — The private key your masternode uses to sign blocks; its derived address is your coinbase identity tied to a 10,000,000 XDC stake. See [Validator/Standby Node — Key Generation and Management](/docs/xdc-chain/developers/node-operators/validator-node) for how it is created and where it lives on disk.
- **Wallet keys (EOAs)** — Personal or treasury accounts holding XDC and tokens. The 10M XDC stake itself should be held in a wallet separate from the node (XDCPay, web wallet, or hardware wallet), never on the server.
- **Contract admin keys** — Keys controlling `owner` functions, `pause()`, fee setters, or proxy upgrade authority. A single compromised admin key can drain or brick a contract. These belong behind a multisig (see below).
- **Deployer / CI keys** — Keys used by deployment scripts and pipelines. They are a frequent leak vector because they touch `.env` files, CI secrets stores, and developer machines.

## Storage Tiers

Match the storage mechanism to how often the key is used and how much it protects.

| Tier | Use for | Mechanism |
|---|---|---|
| **Hot** | CI deployer keys, low-value operational accounts | Secrets manager / CI secret store, strict file permissions (`chmod 600`), never in Git |
| **Warm** | Validator coinbase keys, day-to-day ops accounts | Encrypted keystore on the node, offline backups, restricted SSH access |
| **Cold** | Treasury funds, the 10M XDC stake, contract admin keys | Hardware wallet (Ledger/Trezor are supported on XDC) or multisig, kept entirely offline |

**Hardware wallets** keep the private key inside the device and sign transactions without exposing it to a connected computer. **HSM/KMS** (Hardware Security Modules or cloud Key Management Services) are the institutional equivalent: keys are generated and used inside tamper-resistant hardware or a managed service, and signing happens via API without the raw key ever leaving the boundary. Consider HSM/KMS for exchange integrations, custodial services, or high-frequency signing where a hardware wallet is impractical.

## Generation Hygiene

- Generate keys on the machine that will use them, or on an air-gapped machine for cold keys — never on a shared or untrusted device.
- Use well-audited tools (the node bootstrap script, hardware wallet firmware, established libraries such as `ethers`) — do not roll your own key generation.
- Never reuse a key that has appeared in a screenshot, chat log, ticket, CI log, or repository history, even after deletion. Assume it is compromised and rotate.
- Verify derived addresses independently before staking or transferring funds to them.

## Rotation

Rotate keys on a schedule and immediately on suspicion:

- **Immediately** if a key may have been exposed (committed to Git, pasted into a log, lost device, departed employee).
- **Planned** for CI deployer keys and hot operational accounts — rotate by deploying with a new key and revoking the old one's permissions.
- **Validator keys** — a rotation means migrating the masternode identity; plan it around the staking/KYC process rather than swapping files casually. Coordinate with the [incident runbooks](/docs/xdc-chain/developers/node-operators/incident-runbooks) if the rotation is triggered by a compromise.

After rotation, verify the old key holds no funds and controls no contract roles before discarding it.

## Backup

- Back up the node private key and keystore files immediately after setup, offline, in at least two separate secure locations.
- For seed phrases, use offline storage (metal backup is recommended over paper).
- Test restores periodically — an untested backup is not a backup.
- Full procedures, including node data and disaster recovery: [Backup and Recovery](/docs/xdc-chain/developers/node-operators/backup-recovery).

## Multisig for Shared Control

Any key that controls shared funds or contract admin functions should not be a single EOA. A multisig (M-of-N) removes the single point of failure: no one key — compromised, lost, or malicious — can act alone.

- Put team treasuries behind a multisig.
- Transfer contract `owner` / upgrade authority to a multisig after deployment.
- Distribute the N owner keys across different people, devices, and storage tiers.

Full setup walkthrough: [Multisig Wallet Setup and Usage Guide](/docs/xdc-chain/developers/multisig).

## CI Secret Handling

Deployer keys in pipelines must live in the CI system's secret store (GitHub Actions secrets, GitLab CI variables, etc.) — masked, environment-scoped, and never echoed to logs. Inject them at runtime via `dotenv` or the CI environment; never hardcode them in config files. Patterns and examples: [CI/CD Pipelines](/docs/smart-contracts/ci-cd-pipelines).

## Never Commit Keys

:::warning
Never commit private keys, seed phrases, keystore files, or `.env` files to Git — not even in a private repository, not even "temporarily". Add them to `.gitignore` before your first commit. If a key is committed, history rewriting is not enough: treat it as compromised and rotate immediately.
:::

Quick checklist for any repository touching XDC keys:

- `.env`, keystore, and `coinbase.txt` are in `.gitignore`
- Example files (`.env.example`) contain placeholders, not real values
- A secret-scanning tool (e.g. `gitleaks`) runs in CI
- No key material in documentation, screenshots, or issue trackers
