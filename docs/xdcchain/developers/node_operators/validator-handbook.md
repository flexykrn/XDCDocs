---
title: Validator Handbook — Complete Setup Guide
description: Comprehensive guide for running an XDC Network validator node. Hardware requirements, installation, key management, staking, monitoring, and troubleshooting.
---

# Validator Handbook: Complete Setup Guide

This handbook covers everything you need to run a production XDC Network validator node — from hardware selection to monitoring and maintenance.

**Prerequisites:**
- 10,000,000 XDC for staking (mainnet)
- Linux server administration experience
- Basic understanding of blockchain consensus

---

## 1. Hardware Requirements

### Minimum Specs (Testnet / Development)

| Component | Minimum | Notes |
|-----------|---------|-------|
| CPU | 4 cores | x86_64 architecture |
| RAM | 16 GB | DDR4 or better |
| Storage | 1 TB SSD | SATA SSD acceptable |
| Network | 100 Mbps | Stable, low-latency |
| OS | Ubuntu 22.04 LTS | Other Linux distros may work |

### Recommended Specs (Production Mainnet)

| Component | Recommended | Notes |
|-----------|-------------|-------|
| CPU | 8+ cores | AMD EPYC or Intel Xeon |
| RAM | 32 GB | DDR4 ECC recommended |
| Storage | 2 TB NVMe | High IOPS for sync performance |
| Network | 1 Gbps | Dedicated, unmetered |
| OS | Ubuntu 22.04 LTS | LTS for long-term stability |

### Archive Node Requirements

Archive nodes store all historical state. Requirements are significantly higher:

| Component | Requirement |
|-----------|-------------|
| CPU | 16+ cores |
| RAM | 64 GB |
| Storage | 5+ TB NVMe |
| Network | 1 Gbps |

### Cloud Provider Options

| Provider | Instance Type | Monthly Cost (est.) | Best For |
|----------|--------------|---------------------|----------|
| AWS | c6i.2xlarge | $200-300 | Enterprise, global |
| GCP | c2-standard-8 | $200-280 | Integration with GCP services |
| Azure | D8s_v5 | $200-300 | Enterprise Microsoft stack |
| Hetzner | AX102 | $100-150 | Cost-effective Europe |
| OVHcloud | Advance-2 | $120-180 | Cost-effective global |
| DigitalOcean | c-8 | $150-200 | Simple setup |

> ⚠️ **Important:** The server must have a **public IP address** and **no NAT**. Validator nodes need direct internet connectivity.

---

## 2. Server Preparation

### 2.1 Initial OS Setup

Log in to your server:

```bash
ssh user@your-server-ip
```

Update all packages:

```bash
sudo apt update -y && sudo apt upgrade -y && sudo apt autoremove -y
```

Install essential tools:

```bash
sudo apt install -y curl wget git htop tmux ufw fail2ban
```

Set timezone to UTC:

```bash
sudo timedatectl set-timezone UTC
```

### 2.2 Create Dedicated User

Never run the node as root. Create a dedicated user:

```bash
sudo adduser xdc-node
sudo usermod -aG sudo xdc-node
su - xdc-node
```

### 2.3 SSH Hardening

Generate SSH key (on your local machine):

```bash
ssh-keygen -t ed25519 -C "xdc-validator@yourdomain.com"
ssh-copy-id -i ~/.ssh/id_ed25519.pub xdc-node@your-server-ip
```

On the server, disable password authentication:

```bash
sudo nano /etc/ssh/sshd_config
```

Set:

```
PasswordAuthentication no
PermitRootLogin no
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
```

Restart SSH:

```bash
sudo systemctl restart sshd
```

### 2.4 Firewall Configuration

For validator nodes (no RPC needed):

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 30303/tcp   # XDC P2P
sudo ufw allow 30303/udp   # XDC P2P
sudo ufw allow 2222/tcp    # Your custom SSH port
sudo ufw enable
```

For RPC nodes (add these):

```bash
sudo ufw allow 8545/tcp    # HTTP RPC
sudo ufw allow 8546/tcp    # WebSocket RPC
sudo ufw allow 8551/tcp    # Engine API
```

Verify:

```bash
sudo ufw status verbose
```

### 2.5 System Tuning

Increase file descriptor limits:

```bash
sudo nano /etc/security/limits.conf
```

Add:

```
*xdc-node soft nofile 65535
*xdc-node hard nofile 65535
```

Optimize network settings:

```bash
sudo nano /etc/sysctl.conf
```

Add:

```
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.ipv4.tcp_rmem = 4096 87380 134217728
net.ipv4.tcp_wmem = 4096 65536 134217728
net.core.netdev_max_backlog = 30000
net.ipv4.tcp_congestion_control = bbr
```

Apply:

```bash
sudo sysctl -p
```

---

## 3. Node Installation

### 3.1 Option A: Bootstrap Script (Recommended for Beginners)

The bootstrap script automates installation:

```bash
sudo su -c "bash <(wget -qO- https://raw.githubusercontent.com/XinFinOrg/XinFin-Node/master/setup/bootstrap.sh)" root
```

You will be prompted for:

1. **Network:** Enter `mainnet`, `testnet`, or `devnet`
2. **Node Name:** Enter a descriptive name (e.g., `validator-us-east-01`)
3. **Key Generation:** Type `Y` to generate a new keypair

The script will:
- Install Docker and Docker Compose
- Clone the XinFin-Node repository
- Generate a coinbase address
- Start syncing the blockchain

**Verify sync status:**

```bash
bash xdc-attach.sh
```

In the console, check:

```javascript
eth.syncing
eth.blockNumber
```

If `eth.syncing` is `false`, your node is fully synced.

### 3.2 Option B: Docker Setup (Recommended for Production)

For more control over the environment:

```bash
# Clone repository
git clone https://github.com/XinFinOrg/XinFin-Node.git
cd XinFin-Node

# Install Docker
sudo ./setup/install_docker.sh

# Configure environment
cd mainnet
cp env.example .env
nano .env
```

Edit `.env`:

```
NODE_NAME=validator-us-east-01
CONTACT_EMAIL=ops@yourdomain.com
```

Start the node:

```bash
cd mainnet
bash docker-up.sh
```

**Check logs:**

```bash
docker-compose logs -f --tail=100
```

### 3.3 Option C: Snapshot Sync (Fastest)

To sync in hours instead of days:

```bash
# Stop node
bash docker-down.sh

# Remove old chain data
rm -rf xdcchain/XDC

# Download snapshot (Full Node)
wget https://rpc.xdc.network/snapshots/mainnet/full/xdc.tar

# Or Archive Node snapshot
# wget https://rpc.xdc.network/snapshots/mainnet/archive/xdc.tar

# Extract
tar -xvzf xdc.tar

# Clean up snapshot files
rm -rf xdcchain/XDC/nodekey
rm -rf xdcchain/XDC/transactions.rlp

# Move extracted data
mv XDC xdcchain/

# Restart node
bash docker-up.sh
```

> 💡 **Tip:** Snapshots are updated approximately every 20 days at `https://rpc.xdc.network/snapshots/`

---

## 4. Key Management

### 4.1 Understanding Node Keys

Your node generates several important files:

| File | Location | Purpose |
|------|----------|---------|
| `coinbase.txt` | `xdcchain/coinbase.txt` | Validator address for staking |
| `nodekey` | `xdcchain/XDC/nodekey` | P2P network identity |
| `keystore/` | `xdcchain/keystore/` | Encrypted private keys |

### 4.2 Backup Your Keys

**Critical:** Back up these files immediately after generation.

```bash
# Create backup directory
mkdir -p ~/xdc-backup/$(date +%Y%m%d)

# Copy keys
cp xdcchain/coinbase.txt ~/xdc-backup/$(date +%Y%m%d)/
cp xdcchain/XDC/nodekey ~/xdc-backup/$(date +%Y%m%d)/
cp -r xdcchain/keystore ~/xdc-backup/$(date +%Y%m%d)/

# Secure the backup
chmod 600 ~/xdc-backup/$(date +%Y%m%d)/*
```

**Secure off-site backup:**

```bash
# Encrypt backup
tar -czf - ~/xdc-backup/$(date +%Y%m%d) | gpg -c > xdc-backup-$(date +%Y%m%d).tar.gz.gpg

# Transfer to secure storage (example: AWS S3)
aws s3 cp xdc-backup-$(date +%Y%m%d).tar.gz.gpg s3://your-secure-bucket/xdc-backups/
```

> ⚠️ **Security:** Never store unencrypted keys on cloud storage. Always encrypt with GPG or similar before uploading.

### 4.3 Restoring from Backup

If you need to migrate to a new server:

```bash
# Stop node
bash docker-down.sh

# Restore keys
cp ~/xdc-backup/YYYYMMDD/coinbase.txt xdcchain/
cp ~/xdc-backup/YYYYMMDD/nodekey xdcchain/XDC/
cp -r ~/xdc-backup/YYYYMMDD/keystore xdcchain/

# Restart
bash docker-up.sh
```

### 4.4 Key Rotation

To rotate your validator key (advanced):

1. Generate new keypair on a secure offline machine
2. Update staking with new address
3. Wait for next epoch
4. Shut down old node after new node is active

---

## 5. Staking Process

### 5.1 Requirements

- **10,000,000 XDC** in your wallet
- **KYC completion** (for mainnet)
- **Coinbase address** from your node

### 5.2 Get Your Coinbase Address

```bash
cat xdcchain/coinbase.txt
```

Or via RPC:

```bash
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_coinbase","params":[],"id":1}'
```

### 5.3 Complete KYC

1. Visit [XinFin Masternode](https://master.xinfin.network/)
2. Connect your wallet (XDCPay, MetaMask, or Ledger)
3. Click **"Become a Candidate"**
4. Upload required KYC documents
5. Wait for approval (status shows "KYC True")

### 5.4 Stake Your XDC

1. On the masternode page, enter your **coinbase address**
2. Click **"Apply"**
3. Sign the transaction in your wallet
4. Wait for confirmation

**Verify staking:**

- Check your XDCPay transaction history for the **"Propose"** event
- View your node on [XinFin Network Stats](https://xinfin.network/#stats)

### 5.5 Minimum Stake Details

| Network | Minimum Stake | Lock Period | Rewards |
|---------|--------------|-------------|---------|
| Mainnet | 10,000,000 XDC | No fixed lock | Block rewards + transaction fees |
| Apothem (Testnet) | 10,000,000 test XDC | No fixed lock | Test rewards |

---

## 6. Monitoring and Alerting

### 6.1 Node Health Checks

**Check if node is running:**

```bash
docker ps | grep xinfin-node
```

**Check sync status:**

```bash
bash xdc-attach.sh
> eth.syncing
```

- `false` = fully synced
- Object with `currentBlock` and `highestBlock` = still syncing

**Check peer count:**

```bash
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"net_peerCount","params":[],"id":1}'
```

Healthy nodes should have 10+ peers.

**Check block production (validators only):**

Monitor your node on the [network stats page](https://xinfin.network/#stats). Your node name should appear in the validator list.

### 6.2 Prometheus + Grafana Setup

Install Prometheus:

```bash
wget https://github.com/prometheus/prometheus/releases/download/v2.47.0/prometheus-2.47.0.linux-amd64.tar.gz
tar xvfz prometheus-2.47.0.linux-amd64.tar.gz
cd prometheus-2.47.0.linux-amd64
```

Create `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'xdc-node'
    static_configs:
      - targets: ['localhost:6060']
    metrics_path: /debug/metrics/prometheus
```

Start Prometheus:

```bash
./prometheus --config.file=prometheus.yml
```

Install Grafana:

```bash
sudo apt-get install -y apt-transport-https software-properties-common
wget -q -O - https://packages.grafana.com/gpg.key | sudo apt-key add -
echo "deb https://packages.grafana.com/oss/deb stable main" | sudo tee /etc/apt/sources.list.d/grafana.list
sudo apt-get update
sudo apt-get install grafana
sudo systemctl enable grafana-server
sudo systemctl start grafana-server
```

Access Grafana at `http://your-server-ip:3000` (default login: admin/admin).

**Key metrics to monitor:**

| Metric | Warning Threshold | Critical Threshold |
|--------|-------------------|-------------------|
| Peers | < 5 | < 2 |
| Block height (lag) | > 10 blocks | > 50 blocks |
| Disk usage | > 80% | > 95% |
| Memory usage | > 80% | > 95% |
| CPU usage | > 80% sustained | > 95% sustained |
| Missed blocks (validators) | > 1 per epoch | > 3 per epoch |

### 6.3 Alert Rules (Prometheus)

Create `alerts.yml`:

```yaml
groups:
  - name: xdc-node
    rules:
      - alert: XDCNodeDown
        expr: up{job="xdc-node"} == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "XDC node is down"

      - alert: XDCNodeLowPeers
        expr: xdc_p2p_peers < 5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "XDC node has low peer count"

      - alert: XDCNodeSyncingSlow
        expr: xdc_highest_block - xdc_current_block > 100
        for: 30m
        labels:
          severity: warning
        annotations:
          summary: "XDC node is syncing slowly"

      - alert: XDCNodeDiskFull
        expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) < 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "XDC node disk is almost full"
```

### 6.4 Log Monitoring

Set up log rotation:

```bash
sudo nano /etc/logrotate.d/xdc-node
```

Add:

```
/home/xdc-node/XinFin-Node/mainnet/xdcchain/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 xdc-node xdc-node
}
```

Monitor logs in real-time:

```bash
docker-compose logs -f --tail=100 | grep -E "ERROR|WARN|imported|sealed"
```

---

## 7. Security Hardening Checklist

### Server Security

- [ ] Dedicated non-root user for node operation
- [ ] SSH key authentication only (no passwords)
- [ ] Custom SSH port (not 22)
- [ ] Firewall enabled (UFW) with only required ports open
- [ ] Fail2ban installed and configured
- [ ] Automatic security updates enabled
- [ ] Server timezone set to UTC

### Node Security

- [ ] Node not exposed to public RPC (validator-only nodes)
- [ ] RPC authentication enabled if RPC is required
- [ ] TLS/SSL for RPC endpoints
- [ ] Regular key backups (encrypted, off-site)
- [ ] No private keys stored on the server unencrypted
- [ ] Docker containers running as non-root

### Network Security

- [ ] DDoS protection (Cloudflare or provider-level)
- [ ] VPN or private network for admin access
- [ ] No unnecessary services running
- [ ] Regular port scans to verify exposure

### Operational Security

- [ ] 2FA on all cloud provider accounts
- [ ] Separate wallets for staking vs operations
- [ ] Incident response plan documented
- [ ] Regular security audits scheduled
- [ ] Team access controls (no shared passwords)

---

## 8. Maintenance Procedures

### 8.1 Regular Health Checks

**Daily:**
- Check node is running (`docker ps`)
- Verify sync status (`eth.syncing`)
- Review logs for errors

**Weekly:**
- Check disk usage (`df -h`)
- Monitor peer count
- Review Grafana dashboards
- Verify backup integrity

**Monthly:**
- Rotate logs
- Update OS packages
- Review security alerts
- Test backup restoration

### 8.2 Upgrading the Node

1. **Check for updates:**

```bash
cd XinFin-Node
git fetch origin
git log HEAD..origin/master --oneline
```

2. **Backup before upgrade:**

```bash
bash docker-down.sh
cp -r xdcchain ~/xdc-backup/pre-upgrade-$(date +%Y%m%d)
```

3. **Apply update:**

```bash
git pull origin master
bash docker-up.sh
```

4. **Verify after upgrade:**

```bash
bash xdc-attach.sh
> eth.syncing
> net.peerCount
```

### 8.3 Disaster Recovery

**Scenario 1: Server Failure**

1. Provision new server
2. Install Docker and dependencies
3. Restore keys from backup
4. Download latest snapshot
5. Start node and verify sync
6. Update staking with new IP if needed

**Scenario 2: Corrupted Chain Data**

```bash
bash docker-down.sh
rm -rf xdcchain/XDC
# Download fresh snapshot or sync from genesis
bash docker-up.sh
```

**Scenario 3: Lost Keys**

If you lose your keys and have no backup:
1. Generate new keypair
2. Start new node
3. **You will lose your stake** — the 10M XDC is tied to the old address
4. This is why backups are critical

---

## 9. Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| Node won't start | Port conflict | Check if port 30303 is in use: `sudo lsof -i :30303` |
| Syncing stuck | Corrupt database | Stop node, delete `xdcchain/XDC`, resync from snapshot |
| Low peer count | Firewall blocking | Verify UFW allows 30303/tcp and 30303/udp |
| Out of disk space | Chain growth | Expand disk or prune (full nodes keep 128 blocks) |
| High memory usage | Memory leak | Restart Docker container: `docker-compose restart` |
| KYC rejected | Invalid documents | Ensure documents are clear, valid, and match wallet holder |
| Staking tx failed | Insufficient gas | Ensure wallet has extra XDC for gas fees |
| Node not in validator list | Not enough stake | Verify 10M XDC staked and KYC approved |
| Missed blocks | Network latency | Check server network, consider changing datacenter |
| Slashed | Downtime | Ensure >99% uptime. Check monitoring alerts |
| RPC connection refused | Wrong port/config | Verify RPC port and that node is running |
| Docker container exits | Resource limits | Check `docker-compose logs` for OOM errors |

### Common Log Messages

**Normal:**
```
INFO [01-01|00:00:00.000] Imported new chain segment
INFO [01-01|00:00:00.000] Commit new mining work
```

**Warnings:**
```
WARN [01-01|00:00:00.000] Synchronisation failed, retrying
WARN [01-01|00:00:00.000] Snapshot extension registration failed
```

**Errors (investigate immediately):**
```
ERROR [01-01|00:00:00.000] Failed to write block to disk
ERROR [01-01|00:00:00.000] Blockchain not empty, fast sync disabled
```

---

## 10. Economics and Rewards

### Validator Rewards

| Source | Description | Approximate Rate |
|--------|-------------|------------------|
| Block rewards | New XDC minted per block | Variable |
| Transaction fees | Fees from transactions in block | Variable |

### Slashing Risks

| Violation | Penalty | Recovery |
|-----------|---------|----------|
| Miss full epoch | Excluded for 4 epochs | Resume signing to rejoin |
| Extended downtime | Removal from active list | Re-apply after recovery |

> 💡 **Note:** XDC slashing is non-punitive. You don't lose staked tokens — you just lose block rewards during exclusion periods.

---

## 11. Support and Community

| Resource | Link | Purpose |
|----------|------|---------|
| Validator Discord | [discord.gg/xdc](https://discord.gg/xdc) | Real-time support |
| XDC Forum | [www.xdc.dev](https://www.xdc.dev) | Technical discussions |
| Network Stats | [xinfin.network](https://xinfin.network) | Node monitoring |
| GitHub | [XinFinOrg/XinFin-Node](https://github.com/XinFinOrg/XinFin-Node) | Source code |
| Masternode Portal | [master.xinfin.network](https://master.xinfin.network) | Staking management |

---

## 🚀 Next Steps

1. **[Node Architecture →](./node_architecture.md)** — Understand XDC node types and consensus (⏱️ 15 min)
2. **[Slashing Mechanism →](./slashing.md)** — Learn about penalties and how to avoid them (⏱️ 10 min)
3. **[Docker Setup →](./docker.md)** — Detailed Docker deployment guide (⏱️ 30 min)
4. **[Bootstrap Setup →](./bootstrap.md)** — Quick setup with bootstrap script (⏱️ 20 min)

Or explore:
- **[Wallet Configuration →](../wallet-configuration.md)** — Set up XDCPay for staking
- **[RPC Reference →](../../../api/json-rpc.md)** — Interact with your node programmatically
- **[Security Best Practices →](../../../security/security-practices.md)** — Secure your infrastructure
