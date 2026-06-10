---
title: Validator & Node Security
description: Hardening guide for XDC masternodes, standby nodes, and subnet validators.
---

# Validator & Node Security

XDC Network security depends on validator integrity. A compromised masternode can censor transactions, double-sign blocks, or leak private keys. This guide covers hardening for all node types.

## Node Types & Risk Profiles

| Node Type | Stake Required | Attack Impact | Priority |
|-----------|---------------|---------------|----------|
| Masternode (Validator) | 10M XDC | Consensus manipulation, double-signing | Critical |
| Standby Node | None | Elevated to masternode if promoted | High |
| Full Node | None | Data integrity, relay attacks | Medium |
| Subnet Validator | Varies | Subnet consensus compromise | Critical |

## Operating System Hardening

### 1. Minimal Base Image

Use Ubuntu 22.04 LTS or RHEL 9. Remove unnecessary packages:

```bash
sudo apt autoremove --purge
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

### 2. Firewall Rules

```bash
# Allow only required ports
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH (change to non-standard port)
sudo ufw allow 30303/tcp # XDC peer-to-peer
sudo ufw allow 30303/udp # XDC peer-to-peer
sudo ufw allow 8545/tcp  # RPC (restrict to localhost if possible)
sudo ufw enable
```

### 3. SSH Hardening

```bash
# /etc/ssh/sshd_config
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
AllowUsers xdcnode
```

Restart: `sudo systemctl restart sshd`

## Key Management

### Masternode Coinbase Key

The coinbase address is derived from a private key stored in:

```
xdcchain/coinbase.txt
```

**Never:**
- Store the coinbase key on the validator node
- Back up the key to cloud storage without encryption
- Use the same key for multiple nodes

**Recommended:**
- Generate the key offline on an air-gapped machine
- Transfer only the address (not the key) to the node
- Use a hardware security module (HSM) for key storage

### Key Generation (Offline)

```bash
# On an air-gapped machine
geth account new --datadir ./offline
# Record the address, securely store the keystore file
# Transfer ONLY the address to the online node
```

## Docker Security

### Run Container as Non-Root

```yaml
# docker-compose.yml
services:
  xdc:
    image: xinfinorg/xinfin-node:latest
    user: "1000:1000"
    read_only: true
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
```

### Resource Limits

```yaml
    deploy:
      resources:
        limits:
          cpus: '4.0'
          memory: 16G
        reservations:
          cpus: '2.0'
          memory: 8G
```

## Monitoring & Alerting

### Critical Metrics

| Metric | Threshold | Action |
|--------|-----------|--------|
| Block height stale | > 5 minutes | Alert, investigate |
| Peer count | < 5 | Alert, check network |
| CPU usage | > 90% for 5 min | Alert, scale or investigate |
| Disk usage | > 85% | Alert, prune or expand |
| Failed login attempts | > 3 in 1 min | Alert, check SSH logs |

### Log Aggregation

```bash
# Install and configure filebeat for centralized logging
sudo apt install filebeat
# Configure to ship to ELK or Loki
```

## Backup & Recovery

### Snapshot Strategy

```bash
# Daily automated snapshot
0 2 * * * /usr/local/bin/xdc-snapshot.sh

# Snapshot script
#!/bin/bash
DATE=$(date +%Y%m%d)
docker-compose -f /opt/xdc/docker-compose.yml down
tar czf /backup/xdc-snapshot-${DATE}.tar.gz /opt/xdc/xdcchain/XDC
docker-compose -f /opt/xdc/docker-compose.yml up -d
```

### Disaster Recovery

1. **Key Compromise:** Immediately unstake and rotate to a new coinbase address
2. **Node Failure:** Restore from snapshot on new hardware within 4 epochs
3. **Network Partition:** Verify connectivity, check firewall rules, restart peering

## Subnet Validator Security

Subnet validators have additional responsibilities:

- **Checkpoint Relayer:** Secure the relayer key used to submit checkpoints to the parent chain
- **API Library:** Restrict API access with authentication tokens
- **Subswap:** Monitor bridge transactions for anomalies

### Relayer Key Isolation

```bash
# Run relayer in separate container with dedicated key
services:
  relayer:
    image: xinfinorg/subnet-relayer:latest
    volumes:
      - ./relayer-key:/keys:ro
    environment:
      - RELAYER_KEY_PATH=/keys/relayer.key
```

## Incident Response

See [Incident Response](./incident-response.md) for the full breach playbook.

**Immediate actions for validator compromise:**
1. Stop the node: `docker-compose down`
2. Unstake from the compromised address
3. Rotate to a new coinbase address
4. Investigate logs for intrusion vector
5. Rebuild node from clean snapshot
6. Re-stake with new address after KYC
