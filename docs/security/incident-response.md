---
title: Incident Response
description: Breach playbook and escalation procedures for XDC Network security incidents.
---

# Incident Response

## Response Phases

### Phase 1: Detection (0-1 hour)

**Indicators of Compromise:**
- Unusual RPC traffic patterns
- Failed masternode block signing
- Unexpected contract interactions
- Anomalous token transfers
- Validator slashing events

**Immediate Actions:**
1. Alert security team via PagerDuty/Opsgenie
2. Preserve logs (snapshot before rotation)
3. Isolate affected systems
4. Document initial observations

### Phase 2: Containment (1-4 hours)

**Smart Contract Breach:**
```solidity
// Emergency pause
function emergencyPause() external onlySecurityTeam {
    _pause();
    emit EmergencyPaused(msg.sender, block.timestamp);
}
```

**Validator Compromise:**
```bash
# Stop node immediately
docker-compose -f /opt/xdc/docker-compose.yml down

# Isolate from network
sudo iptables -A INPUT -j DROP
sudo iptables -A OUTPUT -j DROP
```

**Subnet Bridge:**
```bash
# Halt relayer
kubectl scale deployment subnet-relayer --replicas=0

# Lock bridge contract (via multi-sig)
# Execute pause() on checkpoint contract
```

### Phase 3: Eradication (4-24 hours)

1. **Identify root cause** from preserved logs
2. **Patch vulnerability** — deploy fixed contracts or update node software
3. **Rotate compromised keys** using [Key Management](./key-management.md) procedures
4. **Verify fix** on testnet before mainnet deployment

### Phase 4: Recovery (24-72 hours)

1. **Gradual restart** with monitoring
2. **Verify chain integrity** — check block hashes, state roots
3. **Resume operations** with heightened monitoring
4. **Community notification** via official channels

### Phase 5: Post-Incident (72+ hours)

1. **Write incident report** with timeline and root cause
2. **Update runbooks** based on lessons learned
3. **Security review** of related systems
4. **Public disclosure** if user funds were at risk

## Escalation Matrix

| Severity | Response Time | Escalation | Notification |
|----------|--------------|------------|--------------|
| Critical | 15 min | CTO + Legal + Communications | All channels |
| High | 1 hour | Security Lead + Engineering | Discord + Twitter |
| Medium | 4 hours | Engineering Lead | Discord |
| Low | 24 hours | On-call engineer | Internal ticket |

## Communication Templates

### Critical Incident (Public)

```
SECURITY ALERT — XDC Network

We have identified a critical security issue affecting [component].

IMMEDIATE ACTIONS REQUIRED:
- Do not interact with [affected contracts]
- Monitor [official channel] for updates

We are investigating with [security firm]. Updates every 2 hours.

Contact: security@xinfin.org
```

### Post-Incident Report

```
INCIDENT REPORT — [ID]

Timeline:
- [Time] — Detection
- [Time] — Containment
- [Time] — Fix deployed
- [Time] — Recovery complete

Root Cause: [Description]
Impact: [Scope]
Fix: [Description]
Prevention: [Measures implemented]
```

## Tools

- **PagerDuty/Opsgenie** — Alert routing
- **Datadog/Grafana** — Monitoring and dashboards
- **Splunk/ELK** — Log aggregation
- **Slack/Discord** — Team communication
- **Statuspage** — Public status updates
