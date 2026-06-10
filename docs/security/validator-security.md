# Validator Security

Validator nodes are the backbone of the XDC Network. This guide covers comprehensive security hardening for XDC masternodes and standby nodes, ensuring network integrity and protecting staked assets.

---

## Node Architecture

### Validator Node Components

```
┌─────────────────────────────────────────────┐
│              Validator Node                  │
├─────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────────────┐  │
│  │   XDC Node  │  │    Monitoring        │  │
│  │   (Geth)    │  │    (Prometheus/      │  │
│  │             │  │     Grafana)         │  │
│  └─────────────┘  └──────────────────────┘  │
│  ┌─────────────┐  ┌──────────────────────┐  │
│  │   Firewall  │  │    Log Management    │  │
│  │   (UFW/     │  │    (ELK Stack/       │  │
│  │    iptables)│  │     Loki)            │  │
│  └─────────────┘  └──────────────────────┘  │
│  ┌─────────────┐  ┌──────────────────────┐  │
│  │   HSM/      │  │    Backup System     │  │
│  │   Key Store │  │    (Automated)       │  │
│  └─────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────┘
```

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 4 cores | 8+ cores |
| RAM | 16 GB | 32 GB |
| Storage | 500 GB SSD | 1 TB NVMe SSD |
| Network | 100 Mbps | 1 Gbps |
| Uptime | 99.9% | 99.99% |

---

## Operating System Hardening

### Initial Setup

1. **Minimal Installation**
   - Use Ubuntu Server LTS (20.04 or 22.04)
   - Install only necessary packages
   - Disable unnecessary services

2. **System Updates**
   ```bash
   # Automatic security updates
   sudo apt install unattended-upgrades
   sudo dpkg-reconfigure unattended-upgrades
   
   # Manual update check
   sudo apt update && sudo apt upgrade -y
   ```

3. **Secure Boot**
   - Enable UEFI Secure Boot
   - Verify boot integrity
   - Disable legacy boot modes

### User Management

```bash
# Create dedicated service user
sudo useradd -r -s /bin/false xdc-node

# Set strong password for admin
sudo passwd admin

# Configure sudo access
sudo usermod -aG sudo admin

# Disable root login
sudo passwd -l root
```

### SSH Hardening

```bash
# Edit SSH configuration
sudo nano /etc/ssh/sshd_config

# Recommended settings
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
AllowUsers admin xdc-node

# Restart SSH
sudo systemctl restart sshd
```

### Firewall Configuration

```bash
# Install UFW
sudo apt install ufw

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (custom port recommended)
sudo ufw allow 22/tcp

# Allow XDC node ports
sudo ufw allow 30303/tcp  # XDC protocol
sudo ufw allow 30303/udp
sudo ufw allow 8545/tcp   # RPC (restrict to localhost)
sudo ufw allow 8551/tcp   # WebSocket (restrict to localhost)

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status verbose
```

---

## Node Configuration

### XDC Node Setup

1. **Installation**
   ```bash
   # Download latest release
   wget https://github.com/XinFinOrg/XDPoSChain/releases/latest/download/xdc-linux-amd64
   
   # Verify checksum
   sha256sum xdc-linux-amd64
   
   # Install
   sudo mv xdc-linux-amd64 /usr/local/bin/xdc
   sudo chmod +x /usr/local/bin/xdc
   ```

2. **Configuration**
   ```bash
   # Create data directory
   sudo mkdir -p /var/lib/xdc
   sudo chown xdc-node:xdc-node /var/lib/xdc
   
   # Create configuration
   sudo nano /etc/xdc/config.toml
   ```

   ```toml
   [Node]
   DataDir = "/var/lib/xdc"
   
   [Node.P2P]
   MaxPeers = 50
   NoDiscovery = false
   
   [Node.HTTP]
   Host = "localhost"
   Port = 8545
   Cors = ["localhost"]
   
   [Node.WS]
   Host = "localhost"
   Port = 8551
   ```

3. **Systemd Service**
   ```bash
   sudo nano /etc/systemd/system/xdc.service
   ```

   ```ini
   [Unit]
   Description=XDC Validator Node
   After=network.target
   
   [Service]
   Type=simple
   User=xdc-node
   ExecStart=/usr/local/bin/xdc --config /etc/xdc/config.toml
   Restart=always
   RestartSec=10
   
   [Install]
   WantedBy=multi-user.target
   ```

   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable xdc
   sudo systemctl start xdc
   ```

### Key Management

```bash
# Generate validator key
sudo -u xdc-node xdc account new --datadir /var/lib/xdc

# Set proper permissions
sudo chmod 700 /var/lib/xdc/keystore
sudo chmod 600 /var/lib/xdc/keystore/*

# Backup keystore
sudo tar -czf /secure/backup/keystore-$(date +%Y%m%d).tar.gz /var/lib/xdc/keystore
```

---

## Monitoring and Alerting

### System Monitoring

1. **Prometheus Setup**
   ```bash
   # Install Prometheus
   sudo apt install prometheus
   
   # Configure scraping
   sudo nano /etc/prometheus/prometheus.yml
   ```

   ```yaml
   scrape_configs:
     - job_name: 'xdc-node'
       static_configs:
         - targets: ['localhost:6060']
       metrics_path: /debug/metrics
       scrape_interval: 15s
   ```

2. **Node Exporter**
   ```bash
   sudo apt install prometheus-node-exporter
   sudo systemctl enable prometheus-node-exporter
   ```

3. **Grafana Dashboard**
   ```bash
   sudo apt install grafana
   sudo systemctl enable grafana-server
   ```

### Alert Rules

```yaml
# /etc/prometheus/alerts.yml
groups:
  - name: xdc-validator
    rules:
      - alert: NodeDown
        expr: up{job="xdc-node"} == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "XDC node is down"
          
      - alert: HighCPU
        expr: 100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage on validator"
          
      - alert: DiskSpaceLow
        expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) < 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Low disk space on validator"
```

### Log Management

```bash
# Install Loki
sudo apt install loki promtail

# Configure log collection
sudo nano /etc/promtail/config.yml
```

```yaml
server:
  http_listen_port: 9080

clients:
  - url: http://localhost:3100/loki/api/v1/push

scrape_configs:
  - job_name: xdc-logs
    static_configs:
      - targets:
          - localhost
        labels:
          job: xdc-node
          __path__: /var/log/xdc/*.log
```

---

## Backup and Recovery

### Backup Strategy

| Component | Frequency | Retention | Storage |
|-----------|-----------|-----------|---------|
| Keystore | Daily | 30 days | Encrypted offsite |
| Chain Data | Weekly | 4 weeks | Local + Cloud |
| Configuration | On change | All versions | Git repository |
| Logs | Continuous | 90 days | Centralized |

### Automated Backup Script

```bash
#!/bin/bash
# /usr/local/bin/xdc-backup.sh

BACKUP_DIR="/secure/backup"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup keystore
tar -czf "$BACKUP_DIR/keystore-$DATE.tar.gz" /var/lib/xdc/keystore

# Backup chain data (stop node first)
systemctl stop xdc
tar -czf "$BACKUP_DIR/chaindata-$DATE.tar.gz" /var/lib/xdc/XDC
systemctl start xdc

# Backup configuration
cp /etc/xdc/config.toml "$BACKUP_DIR/config-$DATE.toml"

# Encrypt backups
gpg --symmetric --cipher-algo AES256 "$BACKUP_DIR/keystore-$DATE.tar.gz"
gpg --symmetric --cipher-algo AES256 "$BACKUP_DIR/chaindata-$DATE.tar.gz"

# Remove unencrypted files
rm "$BACKUP_DIR/keystore-$DATE.tar.gz"
rm "$BACKUP_DIR/chaindata-$DATE.tar.gz"

# Upload to secure storage
rclone copy "$BACKUP_DIR" secure-backup:xdc-validator

# Clean old backups
find "$BACKUP_DIR" -name "*.gpg" -mtime +30 -delete
```

### Recovery Procedures

1. **Key Recovery**
   ```bash
   # Restore from backup
   gpg --decrypt keystore-20240101_000000.tar.gz.gpg | tar -xz -C /tmp/
   
   # Verify key integrity
   xdc account list --datadir /tmp/xdc
   
   # Move to production
   sudo mv /tmp/xdc/keystore/* /var/lib/xdc/keystore/
   sudo chown -R xdc-node:xdc-node /var/lib/xdc/keystore
   ```

2. **Chain Data Recovery**
   ```bash
   # Stop node
   sudo systemctl stop xdc
   
   # Restore chain data
   gpg --decrypt chaindata-20240101_000000.tar.gz.gpg | tar -xz -C /tmp/
   
   # Replace data
   sudo rm -rf /var/lib/xdc/XDC
   sudo mv /tmp/xdc/XDC /var/lib/xdc/
   sudo chown -R xdc-node:xdc-node /var/lib/xdc/XDC
   
   # Restart node
   sudo systemctl start xdc
   ```

---

## Security Monitoring

### Intrusion Detection

```bash
# Install OSSEC
sudo apt install ossec-hids

# Configure
sudo nano /var/ossec/etc/ossec.conf
```

```xml
<ossec_config>
  <global>
    <email_notification>yes</email_notification>
    <email_to>security@example.com</email_to>
    <smtp_server>localhost</smtp_server>
  </global>
  
  <syscheck>
    <directories check_all="yes">/var/lib/xdc/keystore</directories>
    <directories check_all="yes">/etc/xdc</directories>
  </syscheck>
  
  <localfile>
    <log_format>syslog</log_format>
    <location>/var/log/auth.log</location>
  </localfile>
</ossec_config>
```

### Anomaly Detection

```python
# /usr/local/bin/xdc-anomaly-detector.py
import psutil
import time
import requests

ALERT_WEBHOOK = "https://hooks.slack.com/services/..."

def check_anomalies():
    # Check for unusual network connections
    connections = psutil.net_connections()
    external = [c for c in connections if c.raddr and c.raddr.ip != '127.0.0.1']
    
    if len(external) > 100:
        alert(f"Unusual number of external connections: {len(external)}")
    
    # Check CPU usage patterns
    cpu_percent = psutil.cpu_percent(interval=1)
    if cpu_percent > 95:
        alert(f"High CPU usage: {cpu_percent}%")
    
    # Check for failed login attempts
    with open('/var/log/auth.log', 'r') as f:
        failed_logins = [line for line in f if 'Failed password' in line]
    
    if len(failed_logins) > 10:
        alert(f"Multiple failed login attempts: {len(failed_logins)}")

def alert(message):
    requests.post(ALERT_WEBHOOK, json={"text": message})

if __name__ == "__main__":
    while True:
        check_anomalies()
        time.sleep(60)
```

---

## Incident Response

### Response Procedures

1. **Detection Phase**
   - Identify anomaly type
   - Assess severity
   - Alert response team
   - Document initial findings

2. **Containment Phase**
   - Isolate affected systems
   - Preserve evidence
   - Block malicious actors
   - Maintain service availability

3. **Investigation Phase**
   - Analyze logs
   - Trace attack vector
   - Identify compromised data
   - Determine impact scope

4. **Recovery Phase**
   - Restore from clean backups
   - Patch vulnerabilities
   - Verify system integrity
   - Resume operations

5. **Post-Incident**
   - Document lessons learned
   - Update procedures
   - Implement improvements
   - Conduct team review

### Emergency Contacts

| Role | Contact | Response Time |
|------|---------|---------------|
| Security Lead | security@example.com | 15 minutes |
| DevOps | devops@example.com | 30 minutes |
| XDC Foundation | security@xinfin.org | 1 hour |
| Hosting Provider | [Provider-specific] | 1 hour |

---

## XDC-Specific Security

### Consensus Participation

**Block Signing:**
- Validator key must be available 24/7
- Use HSM for key protection
- Monitor signing performance
- Alert on missed blocks

**Slashing Protection:**
- Implement double-sign protection
- Use redundant signing infrastructure
- Monitor for conflicting signatures
- Maintain signing history

### Network Security

**Peer Management:**
- Maintain trusted peer list
- Monitor peer behavior
- Block malicious peers
- Implement peer scoring

**Message Validation:**
- Verify all incoming messages
- Validate block proposals
- Check transaction signatures
- Filter invalid transactions

---

## Compliance and Auditing

### Regular Audits

| Audit Type | Frequency | Scope |
|------------|-----------|-------|
| Security | Quarterly | Infrastructure, access controls |
| Configuration | Monthly | Node settings, firewall rules |
| Access Review | Monthly | User accounts, SSH keys |
| Log Review | Weekly | Authentication, anomalies |
| Penetration Test | Annually | External and internal |

### Compliance Standards

- **ISO 27001**: Information security management
- **SOC 2 Type II**: Operational security controls
- **GDPR**: Data protection (if applicable)
- **PCI DSS**: Payment card industry (if applicable)

---

## Security Checklist

### Initial Setup
- [ ] Minimal OS installation
- [ ] Automatic updates enabled
- [ ] Dedicated service user created
- [ ] SSH hardened (key-only, no root)
- [ ] Firewall configured
- [ ] Intrusion detection installed

### Node Configuration
- [ ] Latest XDC node version
- [ ] Secure configuration applied
- [ ] RPC restricted to localhost
- [ ] WebSocket restricted to localhost
- [ ] Proper file permissions set

### Key Management
- [ ] Validator key generated securely
- [ ] Keystore backed up
- [ ] Backup encrypted
- [ ] Recovery tested

### Monitoring
- [ ] Prometheus configured
- [ ] Grafana dashboards created
- [ ] Alert rules defined
- [ ] Log aggregation enabled
- [ ] Anomaly detection active

### Backup
- [ ] Automated backup script
- [ ] Encrypted backups
- [ ] Offsite storage
- [ ] Recovery procedures tested
- [ ] Regular recovery drills

### Incident Response
- [ ] Response team defined
- [ ] Contact list updated
- [ ] Procedures documented
- [ ] Tools prepared
- [ ] Training completed

---

## Resources

- [XDC Node Setup Guide](https://docs.xdc.network)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [OSSEC Documentation](https://www.ossec.net/docs/)
- [Linux Hardening Guide](https://www.cisecurity.org/cis-benchmarks/)
