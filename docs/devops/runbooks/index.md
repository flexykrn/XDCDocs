---
title: Incident Response Runbooks for Node Operators
description: Step-by-step runbooks for diagnosing and resolving common XDC node failures, network issues, and security incidents.
---

# Incident Response Runbooks for Node Operators

These runbooks provide structured procedures for diagnosing and resolving common incidents affecting XDC Network nodes. Each runbook includes symptoms, diagnostic commands, resolution steps, and escalation criteria.

## Severity Classification

| Severity | Impact | Response Time | Examples |
|----------|--------|---------------|----------|
| P1 - Critical | Node down, missed blocks, potential slashing | 15 minutes | Sync failure, disk full, key compromise |
| P2 - High | Degraded performance, partial functionality | 1 hour | High memory, slow sync, low peers |
| P3 - Medium | Non-critical issues, monitoring alerts | 4 hours | Log errors, minor config issues |
| P4 - Low | Cosmetic, informational | 24 hours | Log warnings, metric anomalies |

---

## Runbook 1: Node Not Syncing

**Severity:** P1 - Critical
**Symptoms:**
- `eth.syncing` returns object with `currentBlock` far behind `highestBlock`
- Block height not increasing
- Peer count is zero or very low

### Diagnostic Steps

```bash
# 1. Check sync status
bash xdc-attach.sh
> eth.syncing

# Expected: false (synced) or object with currentBlock close to highestBlock
# Problem: currentBlock stuck or very far behind

# 2. Check peer count
> net.peerCount

# Expected: 10+ peers
# Problem: 0-2 peers

# 3. Check network connectivity
curl -s http://localhost:8545 -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"net_listening","params":[],"id":1}'

# Expected: {"jsonrpc":"2.0","id":1,"result":true}
# Problem: result is false or connection refused

# 4. Check logs
docker-compose logs --tail=100 | grep -i "peer\|sync\|error"
```

### Resolution

**If peer count is 0:**

```bash
# Check firewall rules
sudo ufw status
# Ensure port 30303/tcp and 30303/udp are open

# Check if nodekey exists
ls -la xdcchain/XDC/nodekey
# If missing, restart node to generate new one

# Manually add bootnodes
# Edit .env and add bootnode addresses
```

**If sync is stuck:**

```bash
# Restart node
bash docker-down.sh
bash docker-up.sh

# If still stuck, reset sync
bash docker-down.sh
rm -rf xdcchain/XDC/geth/chaindata
bash docker-up.sh
```

**If behind by many blocks:**

```bash
# Download snapshot for faster sync
bash docker-down.sh
rm -rf xdcchain/XDC
wget https://download.xinfin.network/xdcchain.tar
tar -xvzf xdcchain.tar
bash docker-up.sh
```

### Escalation

Escalate if:
- Node not syncing after 2 restart attempts
- Peer count remains 0 after firewall verification
- Sync gap increases over time instead of decreasing

---

## Runbook 2: Disk Space Full

**Severity:** P1 - Critical
**Symptoms:**
- "No space left on device" errors in logs
- Node crashes or becomes unresponsive
- Monitoring alert: disk usage > 90%

### Diagnostic Steps

```bash
# 1. Check disk usage
df -h

# 2. Check chain data size
du -sh xdcchain/XDC/
du -sh xdcchain/XDC/geth/chaindata

# 3. Check log size
du -sh xdcchain/logs/ 2>/dev/null || echo "No logs directory"

# 4. Find largest files
find xdcchain/ -type f -exec du -h {} + | sort -rh | head -20
```

### Resolution

**Immediate (buy time):**

```bash
# Clean up old logs
find xdcchain/logs -type f -mtime +7 -delete 2>/dev/null

# Remove temporary files
rm -f xdcchain/XDC/*.tmp
rm -f xdcchain/XDC/transactions.rlp
```

**Short-term (expand storage):**

```bash
# If using LVM
sudo lvextend -L +500G /dev/mapper/xdc-volume
sudo resize2fs /dev/mapper/xdc-volume

# If using cloud volume
# Expand EBS/GCE/Azure disk in console, then:
sudo growpart /dev/nvme0n1 1
sudo resize2fs /dev/nvme0n1p1
```

**Long-term (prune or archive):**

```bash
# For full nodes: prune old state
bash docker-down.sh
bash xdc-attach.sh
> debug.setHead("0x" + (eth.blockNumber - 1000000).toString(16))

# For archive nodes: migrate to larger disk
# Follow migration procedure in backup guide
```

### Prevention

```bash
# Set up disk usage monitoring alert
# Alert when > 80% full
# Auto-prune logs when > 85% full
```

---

## Runbook 3: Memory Exhaustion

**Severity:** P2 - High
**Symptoms:**
- OOM (Out of Memory) kills in dmesg
- Node restarts unexpectedly
- High swap usage
- Slow response times

### Diagnostic Steps

```bash
# 1. Check current memory usage
free -h
top -o %MEM

# 2. Check container memory (if Docker)
docker stats --no-stream

# 3. Check for memory leaks in logs
dmesg | grep -i "oom\|out of memory"
docker-compose logs | grep -i "killed\|oom"

# 4. Monitor memory over time
vmstat 1 10
```

### Resolution

**Immediate:**

```bash
# Restart node to free memory
bash docker-down.sh
bash docker-up.sh
```

**Short-term:**

```bash
# Reduce cache size
# Edit .env or docker-compose.yml
# Add: --cache 2048 (reduce from default 4096)

# Increase swap (temporary)
sudo fallocate -l 8G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

**Long-term:**

```bash
# Upgrade RAM
# Or migrate to larger instance

# Optimize cache settings based on available memory
# 16GB RAM: --cache 2048
# 32GB RAM: --cache 4096
# 64GB RAM: --cache 8192
```

---

## Runbook 4: Missed Blocks (Validators)

**Severity:** P1 - Critical
**Symptoms:**
- Validator not producing blocks in assigned rounds
- Network stats page shows your node as offline
- Rewards decreasing

### Diagnostic Steps

```bash
# 1. Check if node is in validator set
bash xdc-attach.sh
> eth.getBlock("latest").validator

# 2. Check if node is syncing
> eth.syncing
# Must be false to produce blocks

# 3. Check peer count
> net.peerCount
# Must be > 0

# 4. Check if KYC is active
# Visit https://master.xinfin.network/
# Search your coinbase address

# 5. Check staking status
> xdc.getCandidateStatus("YOUR_COINBASE")
```

### Resolution

**If not syncing:**
- Follow Runbook 1 (Node Not Syncing)

**If KYC shows false:**
- Complete KYC process on masternode portal
- Wait for approval (can take 24-48 hours)

**If stake is insufficient:**
- Ensure 10,000,000 XDC is staked
- Check if stake was slashed

**If node is healthy but still missing blocks:**

```bash
# Check system time (must be accurate)
timedatectl status

# Sync time
sudo timedatectl set-ntp true
sudo systemctl restart systemd-timesyncd

# Check network latency
ping -c 10 master.xinfin.network
```

### Escalation

Escalate immediately if:
- Missing blocks for > 1 hour
- Stake was slashed (indicates double-signing or prolonged downtime)
- Node appears healthy but not in validator set

---

## Runbook 5: Network Partition

**Severity:** P2 - High
**Symptoms:**
- Node running but isolated from network
- Peer count drops suddenly
- Cannot reach external bootnodes

### Diagnostic Steps

```bash
# 1. Check network connectivity
ping 8.8.8.8
curl -I https://xinfin.network

# 2. Check if P2P port is reachable
nc -zv $(curl -s ifconfig.me) 30303

# 3. Check firewall status
sudo ufw status
sudo iptables -L | grep 30303

# 4. Check DNS resolution
nslookup bootnode.xinfin.network
```

### Resolution

**If firewall blocking:**

```bash
sudo ufw allow 30303/tcp
sudo ufw allow 30303/udp
sudo ufw reload
```

**If ISP/Cloud provider issue:**
- Check provider status page
- Verify security groups (AWS) / firewall rules (GCP/Azure)
- Ensure port 30303 is open in cloud console

**If DNS issue:**

```bash
# Use Google DNS temporarily
echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf

# Or add bootnode IPs directly to config
```

---

## Runbook 6: Key Compromise or Loss

**Severity:** P1 - Critical
**Symptoms:**
- Unauthorized transactions from validator address
- Keystore files deleted or corrupted
- Cannot access staked funds

### Immediate Actions

```bash
# 1. Stop node immediately
bash docker-down.sh

# 2. Disconnect from network
sudo ufw deny out 30303/tcp
sudo ufw deny out 30303/udp
```

### If Keys Are Lost

```bash
# 1. Check backups
ls -la /backup/xdc/*/keystore/

# 2. Restore from backup
cp /backup/xdc/latest/keystore/* xdcchain/keystore/
cp /backup/xdc/latest/coinbase.txt xdcchain/

# 3. If no backup, keys are unrecoverable
# Contact XinFin support for stake recovery procedures
```

### If Keys Are Compromised

```bash
# 1. Generate new keypair on secure offline machine
# 2. Submit unstake transaction from old key (if possible)
# 3. Stake from new address
# 4. Update KYC for new address
# 5. Update node configuration
```

### Prevention

- Keep encrypted offline backups
- Use hardware security modules (HSM) for production
- Implement multi-sig for large stakes
- Regular key rotation schedule

---

## Runbook 7: Docker Container Issues

**Severity:** P2 - High
**Symptoms:**
- Container exits immediately
- Container running but not responding
- Image pull failures

### Diagnostic Steps

```bash
# 1. Check container status
docker ps -a | grep xinfin

# 2. Check container logs
docker logs xinfin-node --tail=100

# 3. Check image
docker images | grep xinfin

# 4. Check disk space for Docker
docker system df
```

### Resolution

**If container exits:**

```bash
# Check for port conflicts
sudo lsof -i :30303
sudo lsof -i :8545

# Check for permission issues
ls -la xdcchain/
sudo chown -R $(id -u):$(id -g) xdcchain/

# Recreate container
bash docker-down.sh
bash docker-up.sh
```

**If image pull fails:**

```bash
# Check Docker Hub status
# Try pulling manually
docker pull xinfinorg/xinfin-node:latest

# If network issue, use mirror or download manually
```

**If container is running but unresponsive:**

```bash
# Restart container
docker restart xinfin-node

# If still unresponsive, recreate
bash docker-down.sh
bash docker-up.sh
```

---

## Runbook 8: High CPU Usage

**Severity:** P3 - Medium
**Symptoms:**
- CPU usage consistently > 90%
- Node becomes sluggish
- System load average high

### Diagnostic Steps

```bash
# 1. Check CPU usage
top -o %CPU
htop

# 2. Check specific process
ps aux | grep XDC

# 3. Check if during sync
bash xdc-attach.sh
> eth.syncing

# 4. Check block processing time
> debug.metrics(false)
```

### Resolution

**If during initial sync:**
- Normal behavior, will decrease after sync completes
- Consider upgrading CPU if sustained > 80% for days

**If after sync:**

```bash
# Check for spam transactions
bash xdc-attach.sh
> txpool.status

# If high pending count, network may be under load
# Consider increasing resources
```

**If sustained high CPU:**

```bash
# Reduce peer count
# Edit .env: MAX_PEERS=25 (default 50)

# Or upgrade instance
# masternode: minimum 8 cores, recommended 16
```

---

## Escalation Procedures

### When to Escalate

| Condition | Escalate To | Contact Method |
|-----------|-------------|----------------|
| Slashing event | XinFin Core Team | security@xinfin.org |
| Network-wide outage | XinFin Core Team | Discord #validators |
| Consensus failure | XinFin Core Team | Emergency hotline |
| Infrastructure issue | DevOps Lead | Internal Slack |
| Security incident | CISO + Legal | Incident response channel |

### Communication Templates

**P1 Incident Notification:**

```
Subject: [P1] XDC Node Incident - [Brief Description]

Impact: [Masternode/Full Node] in [Region]
Severity: P1 - Critical
Start Time: [UTC]
Status: Investigating

Symptoms:
- [Symptom 1]
- [Symptom 2]

Actions Taken:
- [Action 1]
- [Action 2]

Next Update: [Time + 15 minutes]
```

**Resolution Notification:**

```
Subject: [RESOLVED] XDC Node Incident - [Description]

Duration: [Start] to [End] ([Duration])
Root Cause: [Brief description]
Resolution: [What fixed it]

Preventive Actions:
- [Action 1]
- [Action 2]
```

---

## Post-Incident Review Template

**Incident ID:** INC-YYYY-MM-DD-NNN
**Date:** [Date]
**Severity:** [P1/P2/P3/P4]
**Duration:** [Start] - [End]

### Timeline

| Time | Event |
|------|-------|
| HH:MM | Alert triggered |
| HH:MM | Investigation started |
| HH:MM | Root cause identified |
| HH:MM | Resolution applied |
| HH:MM | Service restored |

### Root Cause

[Detailed description]

### Impact

- Blocks missed: [N]
- Downtime: [Duration]
- Users affected: [N]

### Lessons Learned

1. [Lesson 1]
2. [Lesson 2]

### Action Items

| Action | Owner | Due Date |
|--------|-------|----------|
| [Action] | [Name] | [Date] |

---

## Related Topics

- [Kubernetes Deployment](../kubernetes/index.md): Containerized deployment
- [Backup and Recovery](../backup/index.md): Backup strategies
- [Monitoring and Observability](../monitoring/index.md): Prometheus and Grafana
- [Validator Handbook](../../xdcchain/developers/node_operators/validator-handbook.md): Validator operations
