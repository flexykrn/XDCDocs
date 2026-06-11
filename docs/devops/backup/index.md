---
title: Node Backup, Recovery, and Failover
description: Comprehensive backup strategies, disaster recovery procedures, and high-availability failover configurations for XDC masternodes, standby nodes, and full nodes.
---

# Node Backup, Recovery, and Failover

This guide covers backup strategies, recovery procedures, and failover architectures for XDC Network nodes. Proper backup and recovery planning prevents data loss, minimizes downtime, and protects validators from slashing during outages.

## Table of Contents

1. [What to Backup](#what-to-backup)
2. [Backup Strategies](#backup-strategies)
3. [Automated Backup Scripts](#automated-backup-scripts)
4. [Recovery Procedures](#recovery-procedures)
5. [Failover Architecture](#failover-architecture)
6. [Disaster Recovery Plan](#disaster-recovery-plan)
7. [Testing Your Backups](#testing-your-backups)
8. [Security Considerations](#security-considerations)

---

## What to Backup

### Critical Data Hierarchy

| Priority | Data | Location | Size | Backup Frequency |
|----------|------|----------|------|-----------------|
| Critical | Keystore + Private Keys | `xdcchain/keystore/`, `xdcchain/coinbase.txt` | < 1 MB | Every change + daily |
| Critical | Nodekey | `xdcchain/XDC/nodekey` | 64 bytes | Every change + daily |
| High | Chain Data | `xdcchain/XDC/` | 1-4 TB | Daily incremental |
| Medium | Configuration | `.env`, `docker-compose.yml` | < 1 MB | Every change |
| Low | Logs | `xdcchain/logs/` | GBs | Optional |

### What NOT to Backup

- `xdcchain/XDC/nodekey` on full nodes (can be regenerated)
- Temporary files: `transactions.rlp`, `LOCK`, `tmp/` directories
- Cache directories that rebuild automatically

---

## Backup Strategies

### Strategy 1: Volume Snapshots (Cloud Native)

Best for: Kubernetes, cloud VMs with volume snapshot support

**AWS EBS Snapshot:**

```bash
# Create snapshot
aws ec2 create-snapshot \
  --volume-id vol-1234567890abcdef0 \
  --description "XDC masternode backup $(date +%Y%m%d-%H%M)"

# Tag for retention
aws ec2 create-tags \
  --resources snap-1234567890abcdef0 \
  --tags Key=Name,Value=xdc-masternode Key=Retention,Value=30days
```

**Automated with Lifecycle Manager:**

```bash
aws dlm create-lifecycle-policy \
  --execution-role-arn arn:aws:iam::ACCOUNT:role/AWSDataLifecycleManagerDefaultRole \
  --description "XDC Node Daily Snapshots" \
  --state ENABLED \
  --policy-details file://snapshot-policy.json
```

`snapshot-policy.json`:

```json
{
  "PolicyType": "EBS_SNAPSHOT_MANAGEMENT",
  "ResourceTypes": ["VOLUME"],
  "TargetTags": [{"Key": "Name", "Value": "xdc-masternode"}],
  "Schedules": [{
    "Name": "Daily",
    "TagsToAdd": [{"Key": "BackupType", "Value": "Daily"}],
    "CreateRule": {"Interval": 24, "IntervalUnit": "HOURS", "Times": ["02:00"]},
    "RetainRule": {"Count": 14}
  }]
}
```

### Strategy 2: Rsync to Remote Storage

Best for: Bare metal, on-premise, cross-region redundancy

```bash
#!/bin/bash
# /opt/xdc/scripts/backup-chain.sh

set -euo pipefail

BACKUP_DIR="/backup/xdc/$(date +%Y%m%d)"
REMOTE="backup-server:/backups/xdc"
CHAIN_DIR="/opt/xdc/xdcchain/XDC"
RETENTION_DAYS=7

# Create local backup
mkdir -p "$BACKUP_DIR"
rsync -a --delete --exclude='nodekey' --exclude='LOCK' \
  "$CHAIN_DIR/" "$BACKUP_DIR/chain/"

# Sync to remote
rsync -az --delete "$BACKUP_DIR/" "$REMOTE/$(date +%Y%m%d)/"

# Clean old backups
find /backup/xdc -maxdepth 1 -type d -mtime +$RETENTION_DAYS -exec rm -rf {} +
ssh backup-server "find /backups/xdc -maxdepth 1 -type d -mtime +$RETENTION_DAYS -exec rm -rf {} +"

echo "Backup completed: $BACKUP_DIR"
```

Add to crontab:

```bash
0 2 * * * /opt/xdc/scripts/backup-chain.sh >> /var/log/xdc-backup.log 2>&1
```

### Strategy 3: S3 with Object Lock

Best for: Immutable backups, compliance requirements

```bash
#!/bin/bash
# backup-to-s3.sh

BUCKET="xdc-backups"
PREFIX="mainnet/masternode-01"
CHAIN_DIR="/opt/xdc/xdcchain/XDC"

# Sync chain data with glacier transition
aws s3 sync "$CHAIN_DIR" "s3://$BUCKET/$PREFIX/chain/$(date +%Y%m%d)/" \
  --storage-class STANDARD_IA \
  --exclude="nodekey" \
  --exclude="LOCK" \
  --exclude="*.tmp"

# Backup keys separately with encryption
aws s3 cp /opt/xdc/xdcchain/keystore/ "s3://$BUCKET/$PREFIX/keystore/" \
  --recursive \
  --server-side-encryption AES256

aws s3 cp /opt/xdc/xdcchain/coinbase.txt "s3://$BUCKET/$PREFIX/coinbase.txt" \
  --server-side-encryption AES256
```

### Strategy 4: Kubernetes Volume Snapshots

Best for: Containerized deployments

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: xdc-masternode-backup-daily
  namespace: xdc-network
spec:
  volumeSnapshotClassName: csi-aws-vsc
  source:
    persistentVolumeClaimName: xdc-data-xdc-masternode-0
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: xdc-snapshot-creator
  namespace: xdc-network
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: snapshot
            image: bitnami/kubectl:latest
            command:
            - /bin/sh
            - -c
            - |
              kubectl create volumesnapshot xdc-masternode-backup-$(date +%Y%m%d) \
                --namespace=xdc-network \
                --volumesnapshotclass=csi-aws-vsc \
                --source=xdc-data-xdc-masternode-0
          restartPolicy: OnFailure
```

---

## Automated Backup Scripts

### Complete Backup Script

```bash
#!/bin/bash
# xdc-backup.sh - Comprehensive XDC node backup

set -euo pipefail

# Configuration
NODE_TYPE="${NODE_TYPE:-masternode}"
CHAIN_DIR="${CHAIN_DIR:-/opt/xdc/xdcchain}"
BACKUP_ROOT="${BACKUP_ROOT:-/backup/xdc}"
REMOTE_BACKUP="${REMOTE_BACKUP:-}"
S3_BUCKET="${S3_BUCKET:-}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="$BACKUP_ROOT/$DATE"

# Logging
exec 1> >(tee -a "$BACKUP_ROOT/backup.log")
exec 2>&1

echo "=== XDC Backup Started: $DATE ==="

# Pre-backup checks
if [ ! -d "$CHAIN_DIR" ]; then
  echo "ERROR: Chain directory not found: $CHAIN_DIR"
  exit 1
fi

# Check disk space
AVAILABLE=$(df "$BACKUP_ROOT" | awk 'NR==2 {print $4}')
REQUIRED=$(du -s "$CHAIN_DIR" | awk '{print $1}')
if [ "$AVAILABLE" -lt "$REQUIRED" ]; then
  echo "ERROR: Insufficient disk space for backup"
  exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# 1. Backup keys (most critical)
echo "Backing up keys..."
cp "$CHAIN_DIR/coinbase.txt" "$BACKUP_DIR/"
cp -r "$CHAIN_DIR/keystore/" "$BACKUP_DIR/" 2>/dev/null || true
cp "$CHAIN_DIR/XDC/nodekey" "$BACKUP_DIR/" 2>/dev/null || true
chmod 600 "$BACKUP_DIR"/*

# 2. Backup configuration
echo "Backing up configuration..."
cp "$CHAIN_DIR/../.env" "$BACKUP_DIR/" 2>/dev/null || true
cp "$CHAIN_DIR/../docker-compose.yml" "$BACKUP_DIR/" 2>/dev/null || true

# 3. Backup chain data (incremental with hard links)
echo "Backing up chain data..."
LATEST_BACKUP=$(ls -td "$BACKUP_ROOT"/*/ 2>/dev/null | head -1 || echo "")
if [ -n "$LATEST_BACKUP" ] && [ -d "$LATEST_BACKUP/chain" ]; then
  rsync -a --delete --link-dest="$LATEST_BACKUP/chain" \
    --exclude='nodekey' --exclude='LOCK' --exclude='*.tmp' \
    "$CHAIN_DIR/XDC/" "$BACKUP_DIR/chain/"
else
  rsync -a --delete \
    --exclude='nodekey' --exclude='LOCK' --exclude='*.tmp' \
    "$CHAIN_DIR/XDC/" "$BACKUP_DIR/chain/"
fi

# 4. Create manifest
cat > "$BACKUP_DIR/MANIFEST.txt" <<EOF
Backup Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)
Node Type: $NODE_TYPE
Chain Directory: $CHAIN_DIR
Backup Size: $(du -sh "$BACKUP_DIR" | cut -f1)
Hostname: $(hostname)
EOF

# 5. Remote backup
if [ -n "$REMOTE_BACKUP" ]; then
  echo "Syncing to remote..."
  rsync -az --delete "$BACKUP_DIR/" "$REMOTE_BACKUP/$DATE/"
fi

if [ -n "$S3_BUCKET" ]; then
  echo "Uploading to S3..."
  aws s3 sync "$BACKUP_DIR" "s3://$S3_BUCKET/$NODE_TYPE/$DATE/" \
    --storage-class STANDARD_IA
fi

# 6. Cleanup old backups
echo "Cleaning up old backups..."
find "$BACKUP_ROOT" -maxdepth 1 -type d -name '20*' -mtime +$RETENTION_DAYS -exec rm -rf {} + 2>/dev/null || true

echo "=== Backup Completed: $BACKUP_DIR ==="
```

### Key-Only Backup (For Critical Recovery)

```bash
#!/bin/bash
# xdc-keys-backup.sh - Backup only critical keys

BACKUP_DIR="/secure/xdc-keys-$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

cp /opt/xdc/xdcchain/coinbase.txt "$BACK_DIR/"
cp -r /opt/xdc/xdcchain/keystore/ "$BACKUP_DIR/"
cp /opt/xdc/xdcchain/XDC/nodekey "$BACKUP_DIR/"

# Encrypt
tar -czf - "$BACKUP_DIR" | gpg --symmetric --cipher-algo AES256 > "$BACKUP_DIR.tar.gz.gpg"

# Upload to secure storage
aws s3 cp "$BACKUP_DIR.tar.gz.gpg" s3://xdc-secure-backups/keys/ \
  --server-side-encryption AES256

# Cleanup
rm -rf "$BACKUP_DIR" "$BACKUP_DIR.tar.gz.gpg"
```

---

## Recovery Procedures

### Scenario 1: Full Node Recovery from Backup

```bash
# 1. Stop node
bash docker-down.sh

# 2. Backup current state (if any)
mv xdcchain/XDC xdcchain/XDC.corrupted.$(date +%Y%m%d)

# 3. Restore from backup
BACKUP_DATE="20250115"
BACKUP_PATH="/backup/xdc/$BACKUP_DATE"

# Restore keys
cp "$BACKUP_PATH/coinbase.txt" xdcchain/
cp -r "$BACKUP_PATH/keystore/" xdcchain/ 2>/dev/null || true
cp "$BACKUP_PATH/nodekey" xdcchain/XDC/ 2>/dev/null || true

# Restore chain data
rsync -a "$BACKUP_PATH/chain/" xdcchain/XDC/

# 4. Fix permissions
chmod 600 xdcchain/keystore/* xdcchain/XDC/nodekey 2>/dev/null || true

# 5. Start node
bash docker-up.sh

# 6. Verify sync
bash xdc-attach.sh
> eth.syncing
> eth.blockNumber
```

### Scenario 2: State Sync (Faster than Full Restore)

Instead of restoring multi-TB chain data, sync from network:

```bash
# 1. Stop node
bash docker-down.sh

# 2. Keep keys, remove chain data
rm -rf xdcchain/XDC/geth/chaindata
rm -rf xdcchain/XDC/geth/triecache

# 3. Start with fast sync
# Edit .env to add: SYNC_MODE=fast
bash docker-up.sh

# 4. Monitor sync
bash xdc-attach.sh
> eth.syncing
```

**Trade-offs:**

| Method | Time | Data Integrity | Use Case |
|--------|------|---------------|----------|
| Full Backup Restore | Hours | Complete | Corruption, migration |
| State Sync | 30 min - 2 hours | Pruned history | Quick recovery |
| Snapshot Download | 1-4 hours | Complete | New deployment |

### Scenario 3: Key Recovery Only

If chain data is intact but keys are lost:

```bash
# 1. Stop node
bash docker-down.sh

# 2. Restore keys from backup
cp /backup/xdc/keys/coinbase.txt xdcchain/
cp -r /backup/xdc/keys/keystore/ xdcchain/
cp /backup/xdc/keys/nodekey xdcchain/XDC/

# 3. Start node
bash docker-up.sh
```

### Scenario 4: Cross-Region Recovery

```bash
# Download from S3 in new region
aws s3 sync s3://xdc-backups/mainnet/latest/ /opt/xdc/restore/

# Follow Scenario 1 restore steps
```

---

## Failover Architecture

### Hot Standby Configuration

```
Primary Masternode (Active)
  - Region: us-east-1
  - IP: 203.0.113.10
  - Status: Producing blocks

Standby Node (Passive)
  - Region: us-west-2
  - IP: 198.51.100.20
  - Status: Synced, ready to activate
  - Same coinbase, same keys

Health Check Service
  - Monitors primary every 10 seconds
  - Triggers failover if primary down > 60s

Load Balancer / DNS
  - Points to active node
  - Switches on failover
```

### Automated Failover Script

```bash
#!/bin/bash
# xdc-failover.sh

PRIMARY_IP="203.0.113.10"
STANDBY_IP="198.51.100.20"
HEALTH_CHECK_URL="http://$PRIMARY_IP:8545"
FAILOVER_THRESHOLD=6  # 60 seconds with 10s interval

consecutive_failures=0

while true; do
  if curl -sf "$HEALTH_CHECK_URL" \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"eth_syncing","params":[],"id":1}' > /dev/null; then
    consecutive_failures=0
  else
    consecutive_failures=$((consecutive_failures + 1))
    echo "Health check failed ($consecutive_failures/$FAILOVER_THRESHOLD)"

    if [ "$consecutive_failures" -ge "$FAILOVER_THRESHOLD" ]; then
      echo "Triggering failover..."

      # Update DNS / Load Balancer to point to standby
      aws route53 change-resource-record-sets \
        --hosted-zone-id ZONE_ID \
        --change-batch file://failover-dns.json

      # Alert on-call
      curl -X POST "$PAGERDUTY_INTEGRATION_KEY" \
        -H "Content-Type: application/json" \
        -d '{
          "routing_key": "'"$PAGERDUTY_KEY"'",
          "event_action": "trigger",
          "payload": {
            "summary": "XDC Masternode Failover Triggered",
            "severity": "critical",
            "source": "failover-script"
          }
        }'

      consecutive_failures=0
    fi
  fi

  sleep 10
done
```

### Kubernetes-Based Failover

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: xdc-masternode-primary
  namespace: xdc-network
spec:
  replicas: 1
  selector:
    matchLabels:
      app: xdc-masternode
      role: primary
  template:
    metadata:
      labels:
        app: xdc-masternode
        role: primary
    spec:
      containers:
      - name: xdc-node
        image: xinfinorg/xinfin-node:latest
        env:
        - name: NODE_TYPE
          value: "masternode"
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: xdc-masternode-standby
  namespace: xdc-network
spec:
  replicas: 1
  selector:
    matchLabels:
      app: xdc-masternode
      role: standby
  template:
    metadata:
      labels:
        app: xdc-masternode
        role: standby
    spec:
      containers:
      - name: xdc-node
        image: xinfinorg/xinfin-node:latest
        env:
        - name: NODE_TYPE
          value: "standby"
```

---

## Disaster Recovery Plan

### RPO and RTO Targets

| Node Type | RPO (Data Loss) | RTO (Downtime) | Strategy |
|-----------|----------------|----------------|----------|
| Masternode | < 1 hour | < 15 minutes | Hot standby + automated failover |
| Standby | < 24 hours | < 30 minutes | Daily backups + manual promotion |
| Full Node | < 24 hours | < 2 hours | Daily backups or state sync |
| Archive | < 24 hours | < 4 hours | Weekly full + daily incremental |

### DR Checklist

**Immediate (0-15 minutes):**
- [ ] Confirm outage via monitoring
- [ ] Check if primary is recoverable
- [ ] Initiate failover if needed
- [ ] Notify stakeholders

**Short-term (15-60 minutes):**
- [ ] Verify standby is producing blocks / serving RPC
- [ ] Check network health (peers, sync status)
- [ ] Update DNS / load balancer
- [ ] Begin root cause analysis

**Long-term (1-24 hours):**
- [ ] Restore primary node
- [ ] Verify primary sync
- [ ] Plan failback
- [ ] Document incident

### Communication Template

```
Subject: [INCIDENT] XDC Node Outage - [Severity]

Impact: [Masternode / Full Node / RPC] in [Region]
Start Time: [UTC Timestamp]
Status: [Investigating / Failover Initiated / Resolved]

Details:
- [Brief description]
- [Affected services]

Actions Taken:
- [Step 1]
- [Step 2]

Next Update: [Time]
```

---

## Testing Your Backups

### Monthly Backup Verification

```bash
#!/bin/bash
# backup-test.sh

TEST_DIR="/tmp/xdc-backup-test-$(date +%Y%m%d)"
BACKUP_DIR="/backup/xdc/$(ls -t /backup/xdc | head -1)"

# 1. Restore to test directory
mkdir -p "$TEST_DIR"
cp -r "$BACKUP_DIR/keystore" "$TEST_DIR/"
cp "$BACKUP_DIR/coinbase.txt" "$TEST_DIR/"

# 2. Verify keystore integrity
for keyfile in "$TEST_DIR/keystore"/*; do
  if ! python3 -c "import json; json.load(open('$keyfile'))" 2>/dev/null; then
    echo "ERROR: Invalid keystore: $keyfile"
    exit 1
  fi
done

# 3. Verify coinbase matches keystore
COINBASE=$(cat "$TEST_DIR/coinbase.txt")
KEY_ADDRESS=$(python3 -c "import json; print(json.load(open('$TEST_DIR/keystore/' + os.listdir('$TEST_DIR/keystore')[0]))['address'])" 2>/dev/null)

if [ "xdc$KEY_ADDRESS" != "$COINBASE" ]; then
  echo "WARNING: Coinbase does not match keystore"
fi

# 4. Test chain data integrity (if included)
if [ -d "$BACKUP_DIR/chain" ]; then
  du -sh "$BACKUP_DIR/chain"
  ls "$BACKUP_DIR/chain/" | head -5
fi

echo "Backup test passed: $BACKUP_DIR"
rm -rf "$TEST_DIR"
```

### Quarterly DR Drill

1. **Announce drill** to team
2. **Simulate primary failure** (stop node, disconnect network)
3. **Execute failover** procedure
4. **Verify** standby takes over
5. **Restore primary** from backup
6. **Failback** to primary
7. **Document** lessons learned

---

## Security Considerations

### Key Handling

- **Never** commit keys to version control
- **Encrypt** all backups containing keys
- **Use separate** storage for keys vs chain data
- **Rotate** backup encryption keys annually
- **Multi-sig** for backup access in enterprise settings

### Access Control

| Role | Backup Access | Recovery Access | Failover Trigger |
|------|--------------|-----------------|------------------|
| Node Operator | Read | Execute | No |
| DevOps Lead | Read/Write | Execute | Yes |
| Security Officer | Audit | Audit | No |
| On-call Engineer | Read | Execute | Yes |

### Compliance

- **SOC 2:** Document backup procedures, test quarterly
- **ISO 27001:** Encrypt backups, control access
- **GDPR:** Anonymize logs in backups if containing PII

---

## Related Topics

- [Kubernetes Deployment](../kubernetes/index.md): Containerized node deployment
- [Helm Charts](../helm/index.md): Helm-based deployment
- [Incident Response](../runbooks/index.md): Troubleshooting runbooks
- [Infrastructure as Code](../iac/index.md): Automated infrastructure
- [Monitoring and Observability](../monitoring/index.md): Prometheus and Grafana
