---
title: Validator/Standby Node
sidebar_position: 6
---

## Validator Masternode
Validator Masternodes operate and participate in XDC Network's XDPoS 2.0 consensus engine, validating transactions and block creation. Running a validator requires completing a KYC process and staking **10,000,000 XDC**.

## Standby Masternodes
Standby Masternodes (or "Standby Nodes") are identical in form and function to Validators but do not participate in validating transactions and block creation. These nodes are on standby to fill the role of Validators that drop from network participation. Standby nodes must also stake 10,000,000 XDC and earn rewards at a lower rate than active validators (see [Rewards Mechanism](/docs/xdc-chain/rewards)).

## Hardware Requirements

The following specifications are recommended for running a validator or standby node. Hardware is identical for both roles — the difference is participation in consensus, not the machine.

| Component | Validator | Standby |
|---|---|---|
| Processor (CPU) | 6 Core | 6 Core |
| Memory (RAM) | 16 GB minimum | 16 GB minimum |
| Storage | 1 TB SSD or NVMe | 1 TB SSD or NVMe |
| Network | 1 Gbps up/down, stable connection | 1 Gbps up/down, stable connection |
| Operating System | Ubuntu 22.04 LTS (recommended) | Ubuntu 22.04 LTS (recommended) |

**Additional operational requirements:**

- Public IP address, directly facing the internet (no NAT)
- 99.9% uptime expected for validators
- Properly configured firewall (allow P2P port 30303; see [Masternode](/docs/xdc-chain/developers/node-operators/masternode) for hardening steps)

## Key Generation and Management

Every masternode is identified by a **coinbase address**, which is derived from the private key your node uses to sign blocks.

### How keys are created

- When you run the bootstrap script (or the Devnet setup), it will prompt: `Generate new private key and wallet address.` Answering `Y` generates a fresh keypair for the node.
- If you already have a private key you want to use, you can replace the generated key after setup and restart the node.
- For Docker-based setups, the coinbase address is written to `xdcchain/coinbase.txt` inside the node directory. Node identity and contact details (masternode name, email) are configured in the `.env` file created from `env.example`:

```bash
cd mainnet
cp env.example .env
nano .env
```

### Viewing your coinbase address

Attach to the running node and query the coinbase account:

```bash
bash xdc-attach.sh
```

```javascript
> eth.coinbase
```

### Backup and security

- **Back up the node's private key** (and the keystore/secret files in the node data directory) immediately after setup, and store the backup offline in at least two secure locations. Losing the key means losing control of the masternode identity tied to your stake.
- **Never commit private keys, `.env` files, or keystore files to Git** or any other version control system. Add them to `.gitignore` before working in the repository.
- Keep the wallet that holds the **10,000,000 XDC stake** separate from the node where possible — the stake can be managed from XDCPay, a web wallet, or a hardware wallet (Trezor/Ledger supported), so your staking funds never need to sit on the server.
- Restrict file permissions on key material: `chmod 600` on any file containing a private key.

## KYC and Staking Overview

Before your node can join the masternode candidate list, you must:

1. **Complete KYC** — Upload the required documents on the [XinFin Masternode](https://master.xinfin.network/) page when becoming a candidate. A "KYC True" status indicates approval.
2. **Stake 10,000,000 XDC** — Lock the stake by proposing your node's coinbase address through the masternode dashboard and signing the transaction from your wallet (XDCPay, WalletConnect, Ledger, or Trezor).

For the full step-by-step staking walkthrough, see [How to Stake XDC on a Masternode/Standby node](/docs/xdc-chain/developers/node-operators/masternode).

# Setup XDC Validator/Standby Node using Bootstrap Script

## For Mainnet

**Bootstrap Command XDC Validator/Standby Node Setup:**

```
sudo su -c "bash <(wget -qO- https://raw.githubusercontent.com/XinFinOrg/XinFin-Node/master/setup/bootstrap.sh)" root
```

**Examples:**
After running the bootstrap command, the system will prompt you to specify the network. To connect to the Mainnet, simply enter "mainnet". 
```
$ sudo su -c "bash <(wget -qO- https://raw.githubusercontent.com/XinFinOrg/XinFin-Node/master/setup/bootstrap.sh)" root
[sudo] password for user:
Please enter your XinFin Network (mainnet/testnet/devnet) :- mainnet
```
Next, you will be asked to input your XinFin Masternode name. Enter your desired Masternode name, such as "Demo_Server."
```
Your running network is mainnet
Please enter your XinFin MasterNode Name :- Demo_Server
Your Masternode Name is Demo_Server

```


## For Testnet
After running the bootstrap command, the system will prompt you to specify the network. To connect to the Mainnet, simply enter "testnet".
```
sudo su -c "bash <(wget -qO- https://raw.githubusercontent.com/XinFinOrg/XinFin-Node/master/setup/bootstrap.sh)" root
Please enter your XinFin Network (mainnet/testnet/devnet) :- testnet
```
Next, you will be asked to input your XinFin Masternode name. Enter your desired Masternode name, such as "test01"
```
Your running network is testnet
Please enter your XinFin MasterNode Name :- test01
Your Masternode Name is test01
```

## For Devnet
After running the bootstrap command, the system will prompt you to specify the network. To connect to the Mainnet, simply enter "devnet".
```
sudo su -c "bash <(wget -qO- https://raw.githubusercontent.com/XinFinOrg/XinFin-Node/master/setup/bootstrap.sh)" root
Please enter your XinFin Network (mainnet/testnet/devnet) :- devnet
Your running network is devnet
```
Next, you will be asked to input your XinFin Masternode name. Enter your desired Masternode name, such as "test01"
```
Please enter your XinFin MasterNode Name :- test01
Your Masternode Name is test01
Generate new private key and wallet address.
If you have your own key, you can change after this and restart the node
Type 'Y' or 'y' to continue:
```

# Setup XDC Masternode using One-Click Installer

To Setup XDC Masternode using One-Click Installer, [refer](./masternode.md)

## Monitoring Your Node

Keeping a validator healthy means checking sync status, peer connectivity, and logs regularly.

### Attach to the node console

```bash
bash xdc-attach.sh
```

### Check sync status

Inside the attached console:

```javascript
> eth.syncing
```

- Returns `false` when the node is fully synced.
- Returns an object with `currentBlock` / `highestBlock` while syncing — compare the gap to gauge progress.

```javascript
> eth.blockNumber
```

Compare the result against the latest block on [XDCScan](https://xdcscan.com) or the official stats page at https://xinfin.network/#stats.

### Check peer count

```javascript
> net.peerCount
```

A healthy validator maintains a stable set of peers. A persistently low or zero peer count usually indicates a firewall or networking problem (port 30303 must be reachable).

### Check container logs

For Docker-based setups:

```bash
sudo docker-compose -f docker-compose.yml logs -f
```

You can also confirm your node appears on the public network stats pages (Mainnet or Apothem) listed in the [Docker setup guide](/docs/xdc-chain/developers/node-operators/docker).

## Maintenance

### Upgrading the node

Pull the latest XinFin-Node scripts and run the upgrade command from the network directory:

```bash
bash upgrade.sh
```

This stops the node, updates the client, and brings it back up. The same `upgrade.sh` flow is used after applying a network snapshot — see [Setup XDC Masternode using Docker](/docs/xdc-chain/developers/node-operators/docker) for the full snapshot procedure.

### Routine tasks

- Keep the OS patched: `sudo apt update -y && sudo apt upgrade -y`
- Monitor disk usage — the chain data grows over time; plan SSD headroom above the recommended 1 TB
- Restart and resync from a snapshot if the node falls far behind or its database becomes corrupted

### Common failure modes

| Symptom | Likely cause | Action |
|---|---|---|
| `eth.syncing` never reaches `false` | Slow disk, insufficient RAM, or stale snapshot | Resync from the latest snapshot |
| `net.peerCount` is 0 | Port 30303 blocked or NAT in front of the node | Fix firewall/NAT configuration |
| Node missing from stats page | Container down or wrong network selected | Check `docker-compose logs`, restart with `bash docker-up.sh` |
| Node excluded from block production | Missed block signing for an epoch | Restore uptime; the node rejoins after the slashing period |

### Slashing

If your validator fails to sign any block during an epoch, it is slashed — excluded from block production for the next four epochs and ineligible for rewards during that period. It can regain status by resuming block verification and signing. See the [Slashing Mechanism](/docs/xdc-chain/developers/node-operators/slashing) for full details.
