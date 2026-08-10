---
title: Node Backup, Recovery, and Failover
sidebar_position: 10
description: How to back up XDC node keys and configuration, recover a node on a fresh host, and plan failover without risking double-signing.
---

This guide covers what to back up on an XDC validator or standby node, how to recover after a failure, and how to plan failover safely. It assumes the Docker-based setup described in [Validator/Standby Node](/docs/xdc-chain/developers/node-operators/validator-node).

## What Needs Backup

| Item | Location | Size | Replaceable? | Priority |
|---|---|---|---|---|
| Node private key / keystore | `xdcchain` data directory | Tiny | **No** — losing it loses the masternode identity tied to your stake | Critical |
| Coinbase address | `xdcchain/coinbase.txt` | Tiny | No (derived from the key) | Critical |
| Node configuration | `.env` (created from `env.example`) | Tiny | Partially — can be recreated, but identity details matter | High |
| Compose and helper scripts | `docker-compose.yml`, `xdc-attach.sh`, `docker-up.sh` | Tiny | Yes — re-downloadable from XinFin-Node | Low |
| Chain data | `xdcchain` data directory | Hundreds of GB | Yes — resync from peers or snapshot | Low |

Back up the small, irreplaceable files aggressively. Chain data is large and fully re-downloadable, so it rarely needs a traditional backup.

## Backing Up Keys and Configuration

Run this from the node directory (the directory containing `docker-compose.yml` and `xdcchain/`) immediately after setup, and again any time keys or `.env` change:

```bash
tar czf xdc-node-backup-$(date +%Y%m%d).tar.gz \
  xdcchain/coinbase.txt \
  .env \
  docker-compose.yml
```

Then encrypt the archive before moving it off the host:

```bash
gpg --symmetric --cipher-algo AES256 xdc-node-backup-$(date +%Y%m%d).tar.gz
```

This prompts for a passphrase and produces a `.gpg` file. Store the encrypted archive in at least two separate offline locations (for example, an encrypted USB drive and an encrypted cloud bucket). Delete the unencrypted `.tar.gz` from the server once the encrypted copy is verified.

### Storage rules

- **Never commit keys, `.env`, or keystore files to Git** or any version control system.
- **Never keep the only backup on the same host** as the node — a disk failure takes both.
- Restrict permissions on any file containing key material: `chmod 600`.
- Keep the wallet holding the 10,000,000 XDC stake separate from the node (XDCPay, web wallet, or hardware wallet) so staking funds never sit on the server.

## Chain Data and Snapshots

Chain data is re-downloadable, so the usual strategy is:

- **Do not back up `chaindata` routinely.** Resyncing from peers or applying a fresh network snapshot is almost always faster and safer than restoring a stale multi-hundred-GB archive.
- After a fresh install or database corruption, run the node and let it sync, or apply the latest snapshot and then run `bash upgrade.sh` as described in [Validator/Standby Node](/docs/xdc-chain/developers/node-operators/validator-node).
- Only archive chain data if you operate many nodes and want a local seed to avoid repeated downloads.

See [Run XDC Nodes using Bootstrap Script](/docs/xdc-chain/developers/node-operators/bootstrap) for the initial setup flow you will repeat during recovery.

## Recovery Runbook

To recover a node on a fresh host:

1. **Provision the host** to the same hardware spec (6 cores, 16 GB RAM, 1 TB SSD, public IP, port 30303 open).
2. **Install the node** using the bootstrap script:

```bash
sudo su -c "bash <(wget -qO- https://raw.githubusercontent.com/XinFinOrg/XinFin-Node/master/setup/bootstrap.sh)" root
```

3. **Stop the node**, then **restore your backup**: decrypt the `.gpg` archive, extract it over the new node directory, and confirm `.env`, `docker-compose.yml`, and `xdcchain/coinbase.txt` (plus any keystore files) match your original setup.
4. **Start the node**:

```bash
bash docker-up.sh
```

5. **Verify identity** — attach to the console and confirm the coinbase matches your registered masternode address:

```bash
bash xdc-attach.sh
```

```javascript
> eth.coinbase
```

6. **Monitor the resync**:

```javascript
> eth.syncing
> net.peerCount
```

Wait for `eth.syncing` to return `false` and confirm the node appears on the network stats pages before considering the recovery complete. If the node was slashed for missed blocks during downtime, it rejoins automatically after the slashing period — see [Slashing Mechanism](/docs/xdc-chain/developers/node-operators/slashing).

## Failover Options

The [Validator/Standby Node](/docs/xdc-chain/developers/node-operators/validator-node) and [Masternode](/docs/xdc-chain/developers/node-operators/masternode) guides describe the network-level standby role: standby nodes fill in for validators that drop out. This is distinct from **operator-level failover**, where you keep spare infrastructure for your own node.

Common operator patterns:

- **Cold standby**: keep backed-up keys and config offsite; rebuild on a fresh host using the recovery runbook. Cheapest and safest; downtime measured in hours.
- **Warm standby**: a second host with the node software installed and synced, but **without your keys**. On failure, copy keys over, start the node, and verify the primary is fully stopped first.

:::danger Never run two nodes with the same keys
Never run two nodes using the same private key simultaneously. Two instances signing with one identity can produce conflicting signatures (double-signing), which can get your masternode penalized or ejected from consensus. Before starting a failover node with your keys, confirm the original node and its containers are completely stopped.
:::

## Disaster Scenarios

| Scenario | Immediate steps |
|---|---|
| Disk failure | Provision new storage/host, restore keys from offline backup, resync from snapshot |
| Corrupted database | Stop the node, delete the chain data, resync from peers or the latest snapshot |
| Host unreachable / provider outage | Follow the recovery runbook on a new host; keep the old host offline |
| Key compromise | Take the node offline immediately, rotate to a new keypair and coinbase, and re-register/propose the replacement through the masternode process; review [Slashing Mechanism](/docs/xdc-chain/developers/node-operators/slashing) for the impact of missed epochs |

## Backup Schedule

| Item | Frequency |
|---|---|
| Keys, `coinbase.txt`, keystore | On change (and immediately after initial setup) |
| `.env` and compose files | On change |
| Chain data | Not backed up — resync from snapshot instead |
| Restore drill | Quarterly — practice the full recovery runbook on a spare host and verify `eth.coinbase` and sync |

## See Also

- [Validator/Standby Node](/docs/xdc-chain/developers/node-operators/validator-node)
- [Run XDC Nodes using Bootstrap Script](/docs/xdc-chain/developers/node-operators/bootstrap)
- [Slashing Mechanism](/docs/xdc-chain/developers/node-operators/slashing)
