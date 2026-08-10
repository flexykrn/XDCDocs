---
title: Validator Security
sidebar_position: 5
description: Hardening guide for XDC validator and standby nodes — OS hardening, firewall rules, Docker hygiene, key isolation, monitoring, slashing avoidance, and DDoS considerations.
---

# Validator Security

A validator node holds a hot signing key and is tied to a 10,000,000 XDC stake. Hardening it protects both your funds and the network's consensus. This page complements the setup guide — start with [Validator/Standby Node](/docs/xdc-chain/developers/node-operators/validator-node), then apply the controls below. For key-specific practices, see [Key Management](/docs/security/key-management).

## OS Hardening

- Run a supported LTS release (Ubuntu 22.04 LTS recommended) and enable automatic security updates.
- **SSH keys only** — disable password authentication and root login in `sshd_config`; restrict SSH to known admin IPs where possible.
- Install and configure **fail2ban** (or equivalent) to throttle brute-force attempts on SSH.
- Remove or disable unused services and packages; every running service is attack surface.
- Use a dedicated non-root user for administration; keep `sudo` access limited to operators who need it.

## Firewall Rules

Use `ufw` (or your cloud security group) with a default-deny inbound policy:

- **Allow P2P port 30303 (TCP and UDP)** — required for peer connectivity.
- **Allow SSH** — ideally restricted to your admin IP range.
- **Do not expose RPC publicly.** The node's RPC/WebSocket ports (8545/8546) should be bound to localhost or reachable only over a private network / SSH tunnel. A public unlocked RPC on a validator is a critical exposure.

Example:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 30303
sudo ufw allow from <your-admin-ip> to any port 22
sudo ufw enable
```

Verify the node's public reachability matches intent: P2P open, RPC closed.

## Docker Daemon Hygiene

- Keep Docker Engine and the node image updated; follow the project's `upgrade.sh` flow for node upgrades.
- Do not expose the Docker socket (`/var/run/docker.sock`) to containers or over TCP — socket access is root on the host.
- Run only the containers you need; prune unused images and volumes.
- Restrict who is in the `docker` group — membership is effectively root.
- See [Docker Setup](/docs/xdc-chain/developers/node-operators/docker) for the baseline container layout.

## Key Isolation

- The only key that must exist on the node is the **coinbase signing key**. Keep the 10M XDC stake and treasury funds in separate wallets — a hardware wallet or multisig — never on the server.
- `chmod 600` on any file containing key material; keep `.env` and keystore files out of Git.
- Back up the coinbase key offline per [Backup and Recovery](/docs/xdc-chain/developers/node-operators/backup-recovery).

## Monitoring and Alerting

You cannot defend what you cannot see. At minimum, alert on:

- Block height stalling (node stopped syncing)
- Peer count dropping
- CPU / memory / disk saturation
- Container restarts or node process crashes
- Unexpected outbound connections or logins

Full metrics and dashboard setup: [Monitoring](/docs/xdc-chain/developers/node-operators/monitoring).

## Slashing Avoidance

Slashing penalties are triggered by consensus misbehavior — most commonly extended downtime or double-signing. Operational discipline is the defense:

- Maintain the 99.9% uptime expectation with monitoring and fast incident response.
- **Never run the same coinbase key on two machines at once.** During failover or migration, fully stop the old node before starting the new one.
- Follow [Slashing](/docs/xdc-chain/developers/node-operators/slashing) for the penalty rules and what triggers them.

## DDoS Considerations

Validators are public-facing by design and can be targeted to force downtime (and thus slashing):

- Use cloud-provider DDoS protection or a scrubbing service for the node IP where available.
- Rate-limit and fail2ban non-P2P services; the P2P port itself is handled by the client's peer management.
- Do not advertise the node IP beyond what the network requires; keep admin interfaces (SSH, monitoring) on separate, restricted endpoints.
- Have a documented failover plan — but observe the single-instance rule above to avoid double-signing during failover.

## Physical and Provider Diversity

- Avoid co-locating your validator with a large share of the network (same cloud provider, same region) — correlated outages hurt both you and consensus.
- Prefer providers and regions with low existing concentration of XDC masternodes when you have a choice.
- If you run multiple nodes, spread them across providers/regions and independent admin credentials, so one account compromise cannot take down your whole fleet.

## Responding to a Suspected Compromise

If you suspect the host or key is compromised, follow the key-compromise runbook in [Incident Response Runbooks](/docs/xdc-chain/developers/node-operators/incident-runbooks) and the severity-based process in [Incident Response](/docs/security/incident-response).
