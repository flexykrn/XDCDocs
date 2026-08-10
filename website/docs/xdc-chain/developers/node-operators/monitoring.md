---
title: Node Monitoring and Observability
sidebar_position: 9
description: Monitor an XDC validator or standby node with health checks, Prometheus metrics, Grafana dashboards, and alerting to avoid slashing and reward loss.
---

## Why Monitor Your Node

Validators are expected to maintain 99.9% uptime. A validator that fails to sign any block during an epoch is slashed — excluded from block production for the next four epochs and ineligible for rewards during that period (see [Slashing Mechanism](/docs/xdc-chain/developers/node-operators/slashing)). Even standby nodes lose reward eligibility when they fall out of sync (see [Rewards Mechanism](/docs/xdc-chain/rewards)). Monitoring gives you early warning before downtime turns into slashing.

## What to Monitor

| Signal | Healthy state | Why it matters |
|---|---|---|
| Block height vs network | Within a few blocks of the latest block on XDCScan | A lagging node cannot sign blocks on time |
| Peer count | Stable, non-zero set of peers | Zero peers means the node is isolated (often firewall/NAT) |
| Sync status | `eth.syncing` returns `false` | A syncing node cannot participate in consensus |
| CPU / RAM | Sustained headroom under load | Starvation causes missed block signing |
| Disk usage | Below ~80% with room to grow | A full disk halts the node and can corrupt chain data |
| Docker container health | Container up, no restart loops | A crashed container means zero participation |

## Quick Health Checks

Attach to the running node's console:

```bash
bash xdc-attach.sh
```

Inside the attached console:

```javascript
> eth.syncing
```

- Returns `false` when the node is fully synced.
- Returns an object with `currentBlock` / `highestBlock` while syncing.

```javascript
> eth.blockNumber
> net.peerCount
```

Compare `eth.blockNumber` against the latest block on [XDCScan](https://xdcscan.com). If your node trails by more than a handful of blocks, or `net.peerCount` is persistently low or zero, investigate networking (port 30303) and host resources before the node misses an epoch.

## Prometheus

### Host metrics with node exporter

Add the Prometheus node exporter as a service alongside your node in `docker-compose.yml`:

```yaml
services:
  node-exporter:
    image: prom/node-exporter:latest
    container_name: node-exporter
    restart: unless-stopped
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
      - '--path.rootfs=/rootfs'
```

This exposes CPU, memory, disk, and network metrics for the host on port 9100.

### XDC client metrics

A `/metrics` endpoint for the XDC client is not documented in this guide set — check your client version's documentation or startup flags to confirm whether Prometheus metrics are available and on which port. Then add a scrape job, adjusting the target as needed:

```yaml
scrape_configs:
  - job_name: 'xdc-node'
    static_configs:
      # Adjust the port to your XDC client's metrics endpoint, if exposed
      - targets: ['localhost:6060']
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']
```

Even without client metrics, node exporter plus the alert rules below (driven by the JSON-RPC health checks) covers the most common failure modes.

## Alerting

Example Prometheus alert rules covering the failures that lead to slashing:

```yaml
groups:
  - name: xdc-node
    rules:
      - alert: XDCNodeDown
        expr: up{job="node-exporter"} == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "XDC node host is down"

      - alert: XDCBlockHeightStalled
        expr: rate(xdc_block_height[5m]) == 0
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "Block height has not advanced for 10 minutes"

      - alert: XDCDiskAlmostFull
        expr: (1 - node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) > 0.85
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Disk usage above 85%"

      - alert: XDCLowPeerCount
        expr: xdc_peer_count < 5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Peer count below threshold — check port 30303"
```

The `xdc_block_height` / `xdc_peer_count` metrics require client metrics (see above); if unavailable, use a blackbox-style exporter or a small script that polls `xdc-attach.sh` and exposes the values.

## Grafana

Point Grafana at your Prometheus instance as a data source and build a dashboard per node. Suggested panels:

- **Block height** — your node's height vs. the latest block on the network (singlestat + time series)
- **Peer count** — time series with a threshold line at your alert value
- **Sync status** — derived from `eth.syncing` / height gap
- **Host resources** — CPU, RAM, disk usage, and disk I/O from node exporter
- **Container restarts** — restart count from cAdvisor or Docker metrics

You can also browse community-built dashboards on [Grafana's dashboard directory](https://grafana.com/grafana/dashboards/) as a starting point and adapt them to your metric names.

## Log Monitoring

Follow the node container's logs:

```bash
sudo docker-compose -f docker-compose.yml logs -f
```

Useful patterns to watch or grep for:

```bash
sudo docker-compose -f docker-compose.yml logs --tail=500 | grep -iE "error|fatal|panic|failed"
```

Repeated import errors, database corruption messages, or rapid restart loops warrant immediate attention. For longer retention and cross-node search, add a log shipper such as Promtail with Loki and query logs from the same Grafana instance as your metrics.

## On-Call Basics

- **Alert routing:** pick a channel you actually respond to — email for low severity, Telegram/SMS for warnings, and a paging service (e.g., PagerDuty or equivalent) for critical alerts like node down or stalled height.
- **Response expectations:** validators should treat critical alerts as same-epoch incidents. A node that misses an entire epoch is slashed for the following four, so response time is measured in minutes, not days.
- **Runbook:** keep the recovery steps from the [Validator/Standby Node maintenance section](/docs/xdc-chain/developers/node-operators/validator-node) at hand — `bash upgrade.sh`, resync from snapshot, and the common failure modes table cover most incidents.

## See Also

- [Validator/Standby Node](/docs/xdc-chain/developers/node-operators/validator-node)
- [Slashing Mechanism](/docs/xdc-chain/developers/node-operators/slashing)
- [Rewards Mechanism](/docs/xdc-chain/rewards)
