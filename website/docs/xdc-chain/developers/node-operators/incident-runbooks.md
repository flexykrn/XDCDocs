---
title: Incident Response Runbooks
sidebar_position: 12
description: Step-by-step runbooks for XDC node operators covering sync failures, downtime, low peers, resource exhaustion, slashing, upgrade breakage, and key compromise.
---

# Incident Response Runbooks

These runbooks cover the most common operational incidents for XDC validator and standby nodes. Each runbook lists **Symptoms**, **Diagnosis** (with exact commands), **Fix steps**, and **Escalation** criteria. Work through diagnosis before applying fixes — restarting blindly can make data-loss incidents worse.

All commands assume a Docker-based setup in the network directory (`mainnet` or `testnet`) of the [XinFin-Node](https://github.com/XinFinOrg/XinFin-Node) repository. See [Validator/Standby Node](/docs/xdc-chain/developers/node-operators/validator-node) for baseline setup.

## 1. Node Stopped Syncing (Height Frozen)

**Symptoms:** `eth.blockNumber` stops increasing; your node falls behind the latest block on [XDCScan](https://xdcscan.com).

**Diagnosis:**

```bash
bash xdc-attach.sh
```

```javascript
> eth.syncing
> eth.blockNumber
> net.peerCount
```

Also check logs and disk space:

```bash
sudo docker-compose -f docker-compose.yml logs -f
df -h
```

- `net.peerCount` of 0 points to a networking problem — see [Runbook 3](#3-low-peer-count).
- Disk at 100% means the database cannot write — see [Runbook 4](#4-high-resource-usage).
- Repeated database errors in logs indicate corruption.

**Fix steps:**

1. Restart the container first — many stalls clear on restart:

```bash
bash docker-down.sh
bash docker-up.sh
```

2. If the node still does not sync after 30 minutes, resync from the latest snapshot:

```bash
bash docker-down.sh
rm -rf xdcchain.tar
wget https://download.xinfin.network/xdcchain.tar
tar -xvzf xdcchain.tar
mv  xdcchain/XDC xdcchain/XDC_backup
mv XDC xdcchain
rm -rf xdcchain/XDC/nodekey
bash upgrade.sh
```

**Escalation:** If a fresh snapshot resync still fails, capture the last 200 log lines and escalate per [Getting Help](#8-getting-help).

## 2. Node Offline / Unreachable

**Symptoms:** Node missing from the network stats page; SSH or RPC unresponsive; monitoring alerts firing.

**Diagnosis:**

```bash
sudo docker ps
sudo docker-compose -f docker-compose.yml logs --tail 100
```

Check whether the P2P port is listening and reachable:

```bash
sudo ss -tlnp | grep 30303
```

**Fix steps:**

1. If the container is stopped or crash-looping, bring it down cleanly and restart:

```bash
bash docker-down.sh
bash docker-up.sh
```

2. If the container is running but unreachable from outside, verify the host firewall allows port 30303 and check your cloud provider's security group / network ACL for the same rule.
3. If the whole host is down (cloud outage, hardware failure), restore from your provider's console, then start the node and confirm it catches up with `eth.syncing`.

**Escalation:** Validators down for a full epoch will be slashed — if you cannot restore within the epoch, proceed to [Runbook 5](#5-slashing-event--penalties) after recovery.

## 3. Low Peer Count

**Symptoms:** `net.peerCount` returns 0 or stays in low single digits; sync is slow or stalls.

**Diagnosis:**

```bash
bash xdc-attach.sh
```

```javascript
> net.peerCount
> net.listening
```

Check outbound connectivity and the firewall:

```bash
sudo ss -tlnp | grep 30303
sudo ufw status
```

**Fix steps:**

1. Confirm port 30303 is open both inbound and outbound on the host firewall and any cloud security group. The node must have a public IP directly facing the internet (no NAT).
2. Verify the `.env` file in the network directory is intact (created from `env.example`) and restart:

```bash
bash docker-down.sh
bash docker-up.sh
```

**When to worry:** Peer counts fluctuate; a brief dip is normal. Worry when `net.peerCount` is 0, or stays very low for more than an hour while `eth.syncing` shows the node falling behind.

**Escalation:** If the port is confirmed open and peers remain 0 after restart, escalate per [Getting Help](#8-getting-help) with your `net.listening` output.

## 4. High Resource Usage

**Symptoms:** Host alerts for disk, memory, or CPU; node slow to respond to `bash xdc-attach.sh`.

**Diagnosis:**

```bash
sudo docker stats
df -h
free -h
```

**Fix steps:**

- **Disk full:** Chain data grows continuously. Free space by removing old snapshot archives (`xdcchain.tar`) and log files. If the disk cannot be expanded, resync from a fresh snapshot (Runbook 1, step 2), which prunes historical state growth, and plan SSD headroom above the recommended 1 TB.
- **High memory:** Restart the container to clear leaks (`bash docker-down.sh && bash docker-up.sh`). If usage stays above capacity, upgrade to at least 16 GB RAM per the [hardware requirements](/docs/xdc-chain/developers/node-operators/validator-node).
- **High CPU during sync:** Normal while `eth.syncing` returns an object. Sustained high CPU on a fully synced node is not — check logs for error loops.

**Escalation:** If resources remain exhausted after a snapshot resync, escalate with `docker stats` output.

## 5. Slashing Event / Penalties

**Symptoms:** Validator excluded from block production; no rewards; missing from the active masternode list.

**Diagnosis:**

1. Confirm the downtime cause — work through Runbooks 1–4 to find what took the node offline.
2. Review logs around the time signing stopped:

```bash
sudo docker-compose -f docker-compose.yml logs --tail 500
```

**Fix steps:**

1. Restore the node to full health: synced (`eth.syncing` returns `false`), peers connected, signing blocks.
2. The node regains status automatically — it rejoins after the four-epoch slashing period once it resumes block verification and signing.

**Prevention:** Follow the full [Slashing Mechanism](/docs/xdc-chain/developers/node-operators/slashing) doc, maintain 99.9% uptime, monitor disk space, and set up alerting per the [Monitoring](/docs/xdc-chain/developers/node-operators/monitoring) guide.

**Escalation:** If you were slashed while the node appeared healthy (synced, peers up, no errors in logs), escalate per [Getting Help](#8-getting-help) — this may indicate a network-level issue.

## 6. Node Broken After an Upgrade

**Symptoms:** Node fails to start or sync immediately after running `bash upgrade.sh`.

**Diagnosis:**

```bash
sudo docker-compose -f docker-compose.yml logs --tail 200
sudo docker ps -a
```

**Fix steps:**

1. Re-run the upgrade — interrupted pulls are the most common cause:

```bash
bash upgrade.sh
```

2. If it still fails, roll back: check the [XinFin-Node repository](https://github.com/XinFinOrg/XinFin-Node) for recent changes to your network directory, revert your local copy to the previous working version (`git log` / `git checkout` inside the cloned repo), then `bash docker-up.sh`.
3. If the new client version is incompatible with your chain data, resync from the latest snapshot (Runbook 1, step 2).

**Escalation:** If multiple operators report the same breakage, treat it as a client release issue — escalate per [Getting Help](#8-getting-help) before resyncing.

## 7. Key Compromise Suspected

**Symptoms:** Unexpected transactions from the coinbase address, unauthorized access to the host, or key material exposed (committed to Git, leaked in logs, stolen backup).

**Fix steps:**

1. **Shut the node down immediately** — do not restart with the same keys:

```bash
bash docker-down.sh
```

2. Do **not** delete anything yet — preserve logs for investigation.
3. Follow the migration path in [Backup and Recovery](/docs/xdc-chain/developers/node-operators/backup-recovery): generate a fresh keypair, provision a clean node, and coordinate any stake or masternode-dashboard changes from your separate staking wallet.
4. Rotate every other credential on the host (SSH keys, `.env` contents) and rebuild the server rather than cleaning it in place.

**Escalation:** Treat key compromise as a security incident — escalate per [Getting Help](#8-getting-help) immediately so the network is aware a masternode identity may be hostile.

## 8. Getting Help

Before escalating, collect: last 100–200 log lines, output of `eth.syncing` / `eth.blockNumber` / `net.peerCount`, `docker stats`, and `df -h`. Then reach out through the community and support channels listed in the [FAQ — Ecosystem & Community](/docs/xdc-chain/faq#ecosystem--community).

## See Also

- [Monitoring and Alerting](/docs/xdc-chain/developers/node-operators/monitoring)
- [Validator/Standby Node](/docs/xdc-chain/developers/node-operators/validator-node)
- [Slashing Mechanism](/docs/xdc-chain/developers/node-operators/slashing)
- [Setup XDC Masternode using Docker](/docs/xdc-chain/developers/node-operators/docker)
