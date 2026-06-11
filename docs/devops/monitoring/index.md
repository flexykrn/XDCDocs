---
title: Node Monitoring and Observability
description: Prometheus, Grafana, and alerting setup for XDC nodes with metric definitions, dashboard templates, and incident response integration.
---

# Node Monitoring and Observability

This guide covers monitoring and observability for XDC Network nodes using Prometheus, Grafana, and alerting systems. Proper monitoring detects issues before they cause downtime or slashing.

## Table of Contents

1. [Overview](#overview)
2. [Prometheus Setup](#prometheus-setup)
3. [Key Metrics](#key-metrics)
4. [Grafana Dashboards](#grafana-dashboards)
5. [Alert Rules](#alert-rules)
6. [Log Aggregation](#log-aggregation)
7. [Uptime Monitoring](#uptime-monitoring)
8. [Mobile Alerting](#mobile-alerting)
9. [Runbook Integration](#runbook-integration)

---

## Overview

### Why Monitor XDC Nodes

- **Prevent Slashing**: Detect missed blocks before penalties
- **Minimize Downtime**: Proactive alerts for disk, memory, sync issues
- **Performance Optimization**: Identify bottlenecks in block processing
- **Capacity Planning**: Track growth trends for storage and traffic

### Monitoring Stack

```
XDC Node (port 6060)
  -> Prometheus (scrapes metrics)
    -> Grafana (visualizes dashboards)
      -> Alertmanager (routes alerts)
        -> PagerDuty / Slack / Email
```

---

## Prometheus Setup

### Installation

```bash
# Download Prometheus
wget https://github.com/prometheus/prometheus/releases/download/v2.47.0/prometheus-2.47.0.linux-amd64.tar.gz
tar xvfz prometheus-2.47.0.linux-amd64.tar.gz
cd prometheus-2.47.0.linux-amd64
```

### Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: xdc-mainnet
    replica: '{{.ExternalURL}}'

scrape_configs:
  - job_name: 'xdc-nodes'
    static_configs:
      - targets: ['localhost:6060']
        labels:
          node_type: 'masternode'
          region: 'us-east-1'
      - targets: ['fullnode-1:6060', 'fullnode-2:6060']
        labels:
          node_type: 'fullnode'
          region: 'us-east-1'
    metrics_path: /debug/metrics/prometheus
    scrape_timeout: 10s

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']

  - job_name: 'docker'
    static_configs:
      - targets: ['localhost:9323']

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['localhost:9093']

rule_files:
  - /etc/prometheus/rules/*.yml
```

### Retention

```bash
# Keep 30 days of metrics
./prometheus \
  --config.file=prometheus.yml \
  --storage.tsdb.retention.time=30d \
  --storage.tsdb.retention.size=50GB
```

### Kubernetes ServiceMonitor

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: xdc-node-metrics
  namespace: monitoring
  labels:
    release: prometheus
spec:
  namespaceSelector:
    matchNames:
    - xdc-network
  selector:
    matchLabels:
      app.kubernetes.io/name: xdc-node
  endpoints:
  - port: metrics
    path: /debug/metrics/prometheus
    interval: 15s
    scrapeTimeout: 10s
```

---

## Key Metrics

### Blockchain Metrics

| Metric | Name | Type | Description |
|--------|------|------|-------------|
| Block Height | `eth_block_number` | Gauge | Current block height |
| Sync Status | `eth_syncing` | Gauge | 1 if syncing, 0 if synced |
| Peer Count | `p2p_peers` | Gauge | Number of connected peers |
| Pending Transactions | `txpool_pending` | Gauge | Transactions in mempool |
| Gas Price | `eth_gas_price` | Gauge | Current gas price in wei |

### System Metrics

| Metric | Name | Type | Critical Threshold |
|--------|------|------|-------------------|
| CPU Usage | `process_cpu_seconds_total` | Counter | > 80% for 10m |
| Memory Usage | `process_resident_memory_bytes` | Gauge | > 90% |
| Disk Usage | `node_filesystem_avail_bytes` | Gauge | < 10% free |
| Goroutines | `go_goroutines` | Gauge | > 10000 |
| Open Files | `process_open_fds` | Gauge | > 80% of limit |

### Validator Metrics

| Metric | Name | Type | Alert Condition |
|--------|------|------|----------------|
| Missed Blocks | `validator_missed_blocks` | Counter | Increase in 1h |
| Block Time | `block_timestamp` | Gauge | > 5s average |
| Epoch Participation | `validator_participation` | Gauge | < 90% |

---

## Grafana Dashboards

### Node Health Dashboard

**Panels:**

1. **Block Height**
   - Query: `eth_block_number`
   - Visualization: Stat + Graph
   - Alert: No increase for 5 minutes

2. **Sync Status**
   - Query: `eth_syncing`
   - Visualization: Stat (0 = green, 1 = yellow)

3. **Peer Count**
   - Query: `p2p_peers`
   - Visualization: Gauge + Graph
   - Thresholds: < 5 yellow, < 2 red

4. **Disk Usage**
   - Query: `1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes)`
   - Visualization: Gauge
   - Thresholds: > 80% yellow, > 90% red

5. **Memory Usage**
   - Query: `process_resident_memory_bytes / 1024 / 1024 / 1024`
   - Visualization: Graph
   - Unit: GB

6. **CPU Usage**
   - Query: `rate(process_cpu_seconds_total[5m]) * 100`
   - Visualization: Graph
   - Unit: Percent

### Network Dashboard

**Panels:**

1. **Network Block Height**
   - Query: `max(eth_block_number)` across all nodes
   - Shows consensus on latest block

2. **Peer Distribution**
   - Query: `p2p_peers` by `instance`
   - Bar gauge showing peers per node

3. **Transaction Pool**
   - Query: `txpool_pending`
   - Shows mempool backlog

4. **Block Time**
   - Query: `rate(eth_block_number[5m]) * 60`
   - Average blocks per minute

### Validator Dashboard

**Panels:**

1. **Validator Status**
   - Query: `validator_status`
   - Stat: Active / Inactive / Jailed

2. **Blocks Produced**
   - Query: `increase(validator_blocks_produced[1h])`
   - Counter for block production

3. **Rewards Earned**
   - Query: `validator_rewards_total`
   - Cumulative rewards

4. **Slashing Risk**
   - Query: `validator_missed_blocks_in_window`
   - Gauge showing missed blocks in current window

### Dashboard JSON (Excerpt)

```json
{
  "dashboard": {
    "title": "XDC Node Health",
    "panels": [
      {
        "id": 1,
        "title": "Block Height",
        "type": "stat",
        "targets": [{
          "expr": "eth_block_number{job=\"xdc-nodes\"}",
          "legendFormat": "{{instance}}"
        }],
        "fieldConfig": {
          "defaults": {
            "unit": "none",
            "thresholds": {
              "steps": [
                {"color": "green", "value": null}
              ]
            }
          }
        }
      },
      {
        "id": 2,
        "title": "Peer Count",
        "type": "gauge",
        "targets": [{
          "expr": "p2p_peers{job=\"xdc-nodes\"}",
          "legendFormat": "{{instance}}"
        }],
        "fieldConfig": {
          "defaults": {
            "min": 0,
            "max": 50,
            "thresholds": {
              "steps": [
                {"color": "red", "value": 0},
                {"color": "yellow", "value": 5},
                {"color": "green", "value": 10}
              ]
            }
          }
        }
      }
    ]
  }
}
```

---

## Alert Rules

### Critical Alerts (P1)

```yaml
# rules/critical.yml
groups:
  - name: xdc-critical
    rules:
      - alert: XDCNodeDown
        expr: up{job="xdc-nodes"} == 0
        for: 5m
        labels:
          severity: critical
          team: devops
        annotations:
          summary: "XDC node {{ $labels.instance }} is down"
          description: "Node has been down for more than 5 minutes."
          runbook_url: "https://docs.xdc.network/devops/runbooks/#node-not-syncing"

      - alert: XDCNodeDiskFull
        expr: |
          (
            node_filesystem_avail_bytes{job="node-exporter",mountpoint="/opt/xdc"}
            /
            node_filesystem_size_bytes{job="node-exporter",mountpoint="/opt/xdc"}
          ) < 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Disk almost full on {{ $labels.instance }}"
          description: "Disk usage is above 90%."

      - alert: XDCValidatorMissingBlocks
        expr: increase(validator_missed_blocks[1h]) > 5
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Validator missing blocks"
          description: "Validator has missed {{ $value }} blocks in the last hour."
```

### Warning Alerts (P2)

```yaml
# rules/warning.yml
groups:
  - name: xdc-warning
    rules:
      - alert: XDCNodeSyncingSlow
        expr: |
          (
            eth_syncing{job="xdc-nodes"} == 1
          )
          and
          (
            rate(eth_block_number[5m]) < 0.1
          )
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Node syncing slowly"
          description: "Block processing rate is below threshold."

      - alert: XDCNodeLowPeers
        expr: p2p_peers{job="xdc-nodes"} < 5
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Low peer count on {{ $labels.instance }}"
          description: "Only {{ $value }} peers connected."

      - alert: XDCNodeHighMemory
        expr: |
          (
            process_resident_memory_bytes{job="xdc-nodes"}
            /
            node_memory_MemTotal_bytes{job="node-exporter"}
          ) > 0.9
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage on {{ $labels.instance }}"
```

### Alertmanager Configuration

```yaml
# alertmanager.yml
global:
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alerts@xdc.network'
  smtp_auth_username: 'alerts@xdc.network'
  smtp_auth_password: '${SMTP_PASSWORD}'

route:
  group_by: ['alertname', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'default'
  routes:
    - match:
        severity: critical
      receiver: 'pagerduty-critical'
      continue: true
    - match:
        severity: warning
      receiver: 'slack-warnings'

receivers:
  - name: 'default'
    email_configs:
      - to: 'devops@xdc.network'

  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: '${PAGERDUTY_KEY}'
        severity: critical

  - name: 'slack-warnings'
    slack_configs:
      - api_url: '${SLACK_WEBHOOK_URL}'
        channel: '#xdc-alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
```

---

## Log Aggregation

### Promtail + Loki Setup

```yaml
# promtail-config.yml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: xdc-logs
    static_configs:
      - targets:
          - localhost
        labels:
          job: xdc-node
          __path__: /opt/xdc/xdcchain/logs/*.log
```

### Log Queries in Grafana

```
# Find errors
{job="xdc-node"} |= "ERROR"

# Find sync issues
{job="xdc-node"} |= "sync" |~ "failed|stuck|timeout"

# Find peer connection issues
{job="xdc-node"} |= "peer" |~ "disconnect|reject|dial"

# Find block production logs (validators)
{job="xdc-node"} |= "Commit new mining work"
```

---

## Uptime Monitoring

### External Monitoring

```bash
# Simple uptime check with curl
curl -sf http://your-node:8545 \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

### UptimeRobot / Pingdom

Configure HTTP checks:
- URL: `http://your-node:8545`
- Method: POST
- Body: `{"jsonrpc":"2.0","method":"net_listening","params":[],"id":1}`
- Expected response: Contains `"result":true`
- Check interval: 1 minute

### Blackbox Exporter

```yaml
# blackbox.yml
modules:
  xdc_rpc:
    prober: http
    timeout: 5s
    http:
      method: POST
      headers:
        Content-Type: application/json
      body: '{"jsonrpc":"2.0","method":"net_listening","params":[],"id":1}'
      fail_if_body_not_matches_regexp:
        - '"result":true'
```

---

## Mobile Alerting

### PagerDuty Mobile App

1. Install PagerDuty app
2. Configure notification rules
3. Set up escalation policies

### Slack Mobile Notifications

1. Enable mobile push for #xdc-alerts
2. Configure Do Not Disturb exceptions
3. Use @mentions for critical alerts

### SMS via Twilio

```yaml
# alertmanager.yml addition
receivers:
  - name: 'sms-critical'
    webhook_configs:
      - url: 'http://twilio-webhook:5000/sms'
        send_resolved: false
```

---

## Runbook Integration

### Alert Annotations

Every alert should include:

```yaml
annotations:
  summary: "Brief description"
  description: "Detailed explanation"
  runbook_url: "https://docs.xdc.network/devops/runbooks/#specific-runbook"
  dashboard_url: "https://grafana.xdc.network/d/xdc-node-health"
```

### Grafana Alert Links

Configure Grafana to link alerts to runbooks:

```ini
# grafana.ini
[unified_alerting]
enabled = true

[annotations]
runbook_url = https://docs.xdc.network/devops/runbooks
```

---

## Related Topics

- [Kubernetes Deployment](../kubernetes/index.md): Containerized deployment
- [Incident Response](../runbooks/index.md): Troubleshooting runbooks
- [Backup and Recovery](../backup/index.md): Backup strategies
- [Infrastructure as Code](../iac/index.md): Terraform and Pulumi
