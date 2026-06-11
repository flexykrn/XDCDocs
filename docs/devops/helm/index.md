---
title: XDC Node Helm Chart
description: Production Helm chart for deploying XDC masternodes, standby nodes, and full nodes on Kubernetes with customizable values, upgrade procedures, and security defaults.
---

# XDC Node Helm Chart

This Helm chart deploys XDC Network nodes on Kubernetes with production-ready defaults, security contexts, monitoring integration, and flexible configuration through values.yaml.

## Prerequisites

- Kubernetes 1.28+
- Helm 3.12+
- PV provisioner supporting ReadWriteOnce
- Optional: cert-manager for TLS, Prometheus Operator for metrics

## Installation

### Add Repository

```bash
helm repo add xdc https://charts.xdc.network
helm repo update
```

### Quick Start: Full Node

```bash
helm install xdc-fullnode xdc/xdc-node \
  --namespace xdc-network \
  --create-namespace \
  --set node.type=fullnode \
  --set persistence.size=2Ti
```

### Masternode Deployment

```bash
helm install xdc-masternode xdc/xdc-node \
  --namespace xdc-network \
  --create-namespace \
  --set node.type=masternode \
  --set node.coinbase=xdcYOURADDRESS \
  --set persistence.size=4Ti \
  --set resources.requests.cpu=16 \
  --set resources.requests.memory=64Gi \
  --set service.p2p.type=LoadBalancer \
  --set secrets.keystoreExistingSecret=xdc-masternode-keys
```

## values.yaml Reference

### Global Settings

```yaml
global:
  clusterDomain: cluster.local
  imagePullSecrets: []
  nodeSelector: {}
  tolerations: []
  affinity: {}
  podAnnotations: {}
  securityContext:
    runAsUser: 1000
    runAsGroup: 1000
    fsGroup: 1000
    runAsNonRoot: true
    seccompProfile:
      type: RuntimeDefault
```

### Node Configuration

```yaml
node:
  type: fullnode          # masternode, standby, fullnode, archive
  network: mainnet        # mainnet, testnet, devnet
  syncMode: snap          # full, fast, snap, light
  coinbase: ""            # Required for masternode/standby
  maxPeers: 50
  cache: 4096             # Cache size in MB
  snapshot: true
  gasPrice: 1
  logLevel: info          # debug, info, warn, error
  extraArgs: []
```

### Image Configuration

```yaml
image:
  repository: xinfinorg/xinfin-node
  tag: latest
  pullPolicy: IfNotPresent
  digest: ""              # Optional: immutable deployments
```

### Service Configuration

```yaml
service:
  p2p:
    type: LoadBalancer
    annotations:
      service.beta.kubernetes.io/aws-load-balancer-type: nlb
      service.beta.kubernetes.io/aws-load-balancer-scheme: internet-facing
    externalTrafficPolicy: Local

  rpc:
    type: ClusterIP
    port: 8545

  ws:
    type: ClusterIP
    port: 8888

  metrics:
    type: ClusterIP
    port: 6060

  ingress:
    enabled: false
    className: nginx
    annotations:
      nginx.ingress.kubernetes.io/ssl-redirect: "true"
      cert-manager.io/cluster-issuer: letsencrypt-prod
    hosts:
    - host: rpc.example.com
      paths:
      - path: /
        pathType: Prefix
    tls:
    - secretName: xdc-rpc-tls
      hosts:
      - rpc.example.com
```

### Persistence

```yaml
persistence:
  enabled: true
  storageClassName: xdc-fast-ssd
  accessMode: ReadWriteOnce
  size: 2Ti
  allowVolumeExpansion: true
  dataSource: {}          # For snapshot initialization
```

### Resources

```yaml
resources:
  requests:
    cpu: 4
    memory: 16Gi
  limits:
    cpu: 8
    memory: 32Gi
```

### Node Type Presets

```yaml
presets:
  masternode:
    resources:
      requests:
        cpu: 16
        memory: 64Gi
      limits:
        cpu: 32
        memory: 128Gi
    persistence:
      size: 4Ti
    service:
      p2p:
        type: LoadBalancer
    podDisruptionBudget:
      minAvailable: 1

  standby:
    resources:
      requests:
        cpu: 16
        memory: 64Gi
      limits:
        cpu: 32
        memory: 128Gi
    persistence:
      size: 4Ti
    service:
      p2p:
        type: LoadBalancer
    podDisruptionBudget:
      minAvailable: 1

  fullnode:
    resources:
      requests:
        cpu: 4
        memory: 16Gi
      limits:
        cpu: 8
        memory: 32Gi
    persistence:
      size: 2Ti
    service:
      p2p:
        type: ClusterIP
    podDisruptionBudget:
      minAvailable: 2

  archive:
    resources:
      requests:
        cpu: 16
        memory: 128Gi
      limits:
        cpu: 32
        memory: 256Gi
    persistence:
      size: 8Ti
    service:
      p2p:
        type: ClusterIP
    podDisruptionBudget:
      minAvailable: 1
```

### Secrets

```yaml
secrets:
  keystore: ""                        # Inline (not for production)
  keystoreExistingSecret: ""          # Reference existing secret
  keystoreExistingSecretKey: keystore

  externalSecret:
    enabled: false
    refreshInterval: 1h
    secretStoreRef:
      name: aws-secrets-manager
      kind: ClusterSecretStore
    remoteRef:
      key: xdc/mainnet/masternode-1
      property: keystore
```

### Monitoring

```yaml
monitoring:
  enabled: true
  serviceMonitor:
    enabled: true
    interval: 15s
    scrapeTimeout: 10s
    namespace: monitoring
  prometheusRule:
    enabled: true
    namespace: monitoring
  grafanaDashboard:
    enabled: true
    namespace: monitoring
  metricsPort: 6060
```

### Network Policy

```yaml
networkPolicy:
  enabled: true
  allowP2P: true
  allowRPCFrom:
  - namespaceSelector:
      matchLabels:
        name: ingress-nginx
  - namespaceSelector:
      matchLabels:
        name: monitoring
  allowEgress: true
  customEgress: []
```

### Backup

```yaml
backup:
  enabled: false
  volumeSnapshot:
    enabled: false
    className: csi-aws-vsc
    schedule: "0 2 * * *"
    retention: 7
  s3:
    enabled: false
    bucket: xdc-backups
    prefix: mainnet
    schedule: "0 2 * * *"
    region: us-east-1
    credentials:
      existingSecret: aws-backup-credentials
```

## Production values.yaml Example

```yaml
node:
  type: masternode
  network: mainnet
  syncMode: full
  coinbase: xdcYOURCOINBASEADDRESS
  cache: 8192

image:
  repository: xinfinorg/xinfin-node
  tag: v2.0.0
  pullPolicy: IfNotPresent

service:
  p2p:
    type: LoadBalancer
    annotations:
      service.beta.kubernetes.io/aws-load-balancer-type: nlb
      service.beta.kubernetes.io/aws-load-balancer-scheme: internet-facing
  ingress:
    enabled: true
    className: nginx
    hosts:
    - host: rpc.xdc-network.example.com
      paths:
      - path: /
        pathType: Prefix
    tls:
    - secretName: xdc-rpc-tls
      hosts:
      - rpc.xdc-network.example.com

persistence:
  storageClassName: xdc-fast-ssd
  size: 4Ti

resources:
  requests:
    cpu: 16
    memory: 64Gi
  limits:
    cpu: 32
    memory: 128Gi

secrets:
  keystoreExistingSecret: xdc-masternode-keys

monitoring:
  enabled: true
  serviceMonitor:
    enabled: true
    namespace: monitoring
  prometheusRule:
    enabled: true
    namespace: monitoring

networkPolicy:
  enabled: true
  allowP2P: true
  allowRPCFrom:
  - namespaceSelector:
      matchLabels:
        name: ingress-nginx
  - namespaceSelector:
      matchLabels:
        name: monitoring

backup:
  enabled: true
  volumeSnapshot:
    enabled: true
    className: csi-aws-vsc
    schedule: "0 2 * * *"
    retention: 14
  s3:
    enabled: true
    bucket: xdc-backups
    prefix: mainnet/masternode-1
    schedule: "0 3 * * *"
    region: us-east-1
    credentials:
      existingSecret: aws-backup-credentials

affinity:
  podAntiAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
    - labelSelector:
        matchExpressions:
        - key: app.kubernetes.io/component
          operator: In
          values:
          - masternode
      topologyKey: kubernetes.io/hostname

tolerations:
- key: dedicated
  operator: Equal
  value: xdc-nodes
  effect: NoSchedule
```

## Upgrade Procedures

### Helm Upgrade

```bash
# Upgrade to new chart version
helm upgrade xdc-masternode xdc/xdc-node \
  --namespace xdc-network \
  --values production-values.yaml \
  --version 1.2.0

# Upgrade with new image
helm upgrade xdc-masternode xdc/xdc-node \
  --namespace xdc-network \
  --set image.tag=v2.1.0 \
  --values production-values.yaml
```

### Helm Rollback

```bash
# List revisions
helm history xdc-masternode -n xdc-network

# Rollback to previous
helm rollback xdc-masternode -n xdc-network

# Rollback to specific revision
helm rollback xdc-masternode 3 -n xdc-network
```

## Uninstallation

```bash
# Uninstall release
helm uninstall xdc-masternode -n xdc-network

# Delete PVC (WARNING: irreversible data loss)
kubectl delete pvc -n xdc-network -l app.kubernetes.io/instance=xdc-masternode
```

## Troubleshooting

### Template Debugging

```bash
# Render templates without installing
helm template xdc-masternode xdc/xdc-node \
  --values production-values.yaml \
  --debug

# Validate against cluster
helm install xdc-masternode xdc/xdc-node \
  --values production-values.yaml \
  --dry-run --debug
```

### Show Values

```bash
helm show values xdc/xdc-node
helm show chart xdc/xdc-node
```

## Related Topics

- [Kubernetes Deployment](../kubernetes/index.md): Raw Kubernetes manifests
- [Docker Setup](../../xdcchain/developers/node_operators/docker.md): Single-node Docker deployment
- [Node Architecture](../../xdcchain/developers/node_operators/node_architecture.md): XDC node internals
- [Validator Handbook](../../xdcchain/developers/node_operators/validator-handbook.md): Validator operations
- [Backup and Recovery](../backup/index.md): Backup strategies
- [Incident Response](../runbooks/index.md): Troubleshooting runbooks
