---
title: Deploy XDC Nodes on Kubernetes
description: Production-ready Kubernetes deployment guide for XDC masternodes, standby nodes, and full nodes with StatefulSets, persistent storage, monitoring, and security best practices.
---

# Deploy XDC Nodes on Kubernetes

This guide provides production-ready Kubernetes manifests and operational procedures for deploying XDC Network nodes on any conformant Kubernetes cluster including AWS EKS, Google GKE, and Azure AKS. It covers masternodes, standby nodes, full nodes, and archive nodes with real-world configurations you can apply directly.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Architecture](#architecture)
4. [Resource Requirements](#resource-requirements)
5. [Quick Start](#quick-start)
6. [Namespace and RBAC](#namespace-and-rbac)
7. [Storage Configuration](#storage-configuration)
8. [ConfigMap: Node Configuration](#configmap-node-configuration)
9. [Secret: Key Management](#secret-key-management)
10. [StatefulSet Deployment](#statefulset-deployment)
11. [Service Definitions](#service-definitions)
12. [Network Policies](#network-policies)
13. [Pod Disruption Budget](#pod-disruption-budget)
14. [Monitoring: Prometheus and Grafana](#monitoring-prometheus-and-grafana)
15. [Backup Strategies](#backup-strategies)
16. [Upgrade Procedures](#upgrade-procedures)
17. [Cloud Provider Examples](#cloud-provider-examples)
18. [Troubleshooting](#troubleshooting)
19. [Security Checklist](#security-checklist)

---

## Overview

Running XDC nodes on Kubernetes provides high availability through pod rescheduling and health checks, scalability for RPC nodes, operational consistency via declarative configuration, and native observability through Prometheus and Grafana integration.

### Node Types Supported

| Type | Purpose | Replicas | Storage | Network Exposure |
|------|---------|----------|---------|-----------------|
| Masternode | Block production and validation | 1 | 2 TB+ SSD | Public IP required |
| Standby Node | Failover candidate | 1-3 | 2 TB+ SSD | Public IP required |
| Full Node | RPC serving and sync | 1-N | 2 TB+ SSD | Internal only |
| Archive Node | Historical state queries | 1 | 4 TB+ SSD | Internal only |

Masternodes and standby nodes require a static public IP address for P2P communication on port 30303. Full nodes and archive nodes can operate with internal cluster IPs.

---

## Prerequisites

### Cluster Requirements

- Kubernetes 1.28 or later
- Container runtime: containerd 1.7+ or Docker 24+
- CNI plugin: Calico, Cilium, or AWS VPC CNI
- CSI driver for block storage: EBS, GCE PD, or Azure Disk
- Metrics Server installed and running

### Tools

```bash
kubectl version --client
helm version
```

### XDC-Specific Requirements

- Coinbase address for masternode rewards
- 10 million XDC staked for mainnet masternodes
- KYC completion for mainnet validator participation
- Static public IP or LoadBalancer for P2P port 30303

---

## Architecture

### Deployment Topology

```
Kubernetes Cluster
  xdc-network Namespace
    Masternode Pod (xdc-masternode-0)
      Persistent Volume Claim: xdc-data-xdc-masternode-0 (2TB)
      Container: xinfin-node
      Ports: 30303 (P2P), 8545 (RPC), 8888 (WS), 6060 (metrics)

    Standby Pod (xdc-standby-0)
      Persistent Volume Claim: xdc-data-xdc-standby-0 (2TB)
      Container: xinfin-node
      Ports: 30303 (P2P), 8545 (RPC), 8888 (WS), 6060 (metrics)

    Full Node Pods (xdc-fullnode-0, xdc-fullnode-1, xdc-fullnode-2)
      Persistent Volume Claims: xdc-data-xdc-fullnode-0/1/2 (2TB each)
      Containers: xinfin-node
      Ports: 30303 (P2P), 8545 (RPC), 8888 (WS), 6060 (metrics)

    Services:
      xdc-masternode (Headless, ClusterIP None)
      xdc-masternode-p2p (LoadBalancer, port 30303)
      xdc-rpc-internal (ClusterIP, port 8545)

    ConfigMaps:
      xdc-config (network, sync mode, RPC settings)

    Secrets:
      xdc-keys (keystore, coinbase address)
```

### Network Flow

- P2P: Port 30303 TCP and UDP for peer discovery and block sync
- RPC: Port 8545 for JSON-RPC API, internal only, exposed via Ingress
- WebSocket: Port 8888 for WebSocket subscriptions
- Metrics: Port 6060 for Prometheus scraping

---

## Resource Requirements

### Minimum per Node

| Resource | Masternode | Standby | Full Node | Archive |
|----------|-----------|---------|-----------|---------|
| CPU | 8 cores | 8 cores | 4 cores | 16 cores |
| Memory | 32 GB | 32 GB | 16 GB | 64 GB |
| Storage | 2 TB SSD | 2 TB SSD | 2 TB SSD | 4 TB SSD |
| IOPS | 10,000 | 10,000 | 5,000 | 15,000 |
| Network | 1 Gbps | 1 Gbps | 500 Mbps | 1 Gbps |

### Recommended per Node

| Resource | Masternode | Standby | Full Node | Archive |
|----------|-----------|---------|-----------|---------|
| CPU | 16 cores | 16 cores | 8 cores | 32 cores |
| Memory | 64 GB | 64 GB | 32 GB | 128 GB |
| Storage | 4 TB NVMe | 4 TB NVMe | 2 TB NVMe | 8 TB NVMe |
| IOPS | 50,000 | 50,000 | 20,000 | 50,000 |
| Network | 10 Gbps | 10 Gbps | 1 Gbps | 10 Gbps |

### Resource Quotas

Apply this ResourceQuota to the xdc-network namespace to prevent resource exhaustion:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: xdc-network-quota
  namespace: xdc-network
spec:
  hard:
    requests.cpu: "64"
    requests.memory: 256Gi
    limits.cpu: "128"
    limits.memory: 512Gi
    persistentvolumeclaims: "10"
    services.loadbalancers: "2"
```

---

## Quick Start

For users who want to deploy immediately, run these commands in order:

```bash
# 1. Create namespace
kubectl create namespace xdc-network

# 2. Apply ConfigMap
kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: xdc-config
  namespace: xdc-network
data:
  NETWORK: "mainnet"
  SYNC_MODE: "snap"
  RPC_ADDR: "0.0.0.0"
  RPC_PORT: "8545"
  RPC_API: "eth,net,web3,txpool,debug"
  WS_ADDR: "0.0.0.0"
  WS_PORT: "8888"
  WS_API: "eth,net,web3,txpool"
  P2P_PORT: "30303"
  MAX_PEERS: "50"
  METRICS: "true"
  METRICS_ADDR: "0.0.0.0"
  METRICS_PORT: "6060"
  LOG_LEVEL: "info"
  CACHE: "4096"
  SNAPSHOT: "true"
EOF

# 3. Create secret (replace with your actual keystore)
kubectl create secret generic xdc-keys \
  --namespace=xdc-network \
  --from-literal=coinbase="xdcYOURADDRESS"

# 4. Apply the full node StatefulSet from Section 10
kubectl apply -f xdc-fullnode-statefulset.yaml

# 5. Check status
kubectl get pods -n xdc-network -w
```

---

## Namespace and RBAC

### Create Namespace

```bash
kubectl create namespace xdc-network
kubectl label namespace xdc-network app.kubernetes.io/name=xdc-network
```

### Service Account

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: xdc-node-sa
  namespace: xdc-network
```

For AWS EKS with IAM Roles for Service Accounts:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: xdc-node-sa
  namespace: xdc-network
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::ACCOUNT:role/xdc-node-role
```

### RBAC

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: xdc-node-role
  namespace: xdc-network
rules:
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get"]
  resourceNames: ["xdc-keys"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: xdc-node-binding
  namespace: xdc-network
subjects:
- kind: ServiceAccount
  name: xdc-node-sa
  namespace: xdc-network
roleRef:
  kind: Role
  name: xdc-node-role
  apiGroup: rbac.authorization.k8s.io
```

---

## Storage Configuration

### AWS EBS gp3

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: xdc-fast-ssd
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "16000"
  throughput: "1000"
  encrypted: "true"
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

### GCE PD SSD

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: xdc-fast-ssd
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-ssd
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

### Azure Disk Premium SSD v2

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: xdc-fast-ssd
provisioner: disk.csi.azure.com
parameters:
  skuName: PremiumV2_LRS
  iops: "16000"
  throughput: "1000"
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

---

## ConfigMap: Node Configuration

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: xdc-config
  namespace: xdc-network
data:
  NETWORK: "mainnet"
  SYNC_MODE: "full"
  RPC_ADDR: "0.0.0.0"
  RPC_PORT: "8545"
  RPC_API: "eth,net,web3,txpool,debug"
  RPC_CORSDOMAIN: "*"
  RPC_VHOSTS: "*"
  WS_ADDR: "0.0.0.0"
  WS_PORT: "8888"
  WS_API: "eth,net,web3,txpool"
  WS_ORIGINS: "*"
  P2P_PORT: "30303"
  MAX_PEERS: "50"
  METRICS: "true"
  METRICS_ADDR: "0.0.0.0"
  METRICS_PORT: "6060"
  LOG_LEVEL: "info"
  GASPRICE: "1"
  CACHE: "4096"
  CACHE_DATABASE: "50"
  CACHE_GC: "25"
  SNAPSHOT: "true"
```

For testnet deployment, change `NETWORK` to `testnet` and adjust `BOOTNODES` if needed.

---

## Secret: Key Management

### Kubernetes Native Secret

```bash
kubectl create secret generic xdc-keys \
  --namespace=xdc-network \
  --from-file=keystore=./keystore/UTC--... \
  --from-literal=coinbase="xdcYOURADDRESS"
```

### External Secrets Operator

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: xdc-keys
  namespace: xdc-network
spec:
  refreshInterval: 1h
  secretStoreRef:
    kind: ClusterSecretStore
    name: aws-secrets-manager
  target:
    name: xdc-keys
    creationPolicy: Owner
  data:
  - secretKey: keystore
    remoteRef:
      key: xdc/mainnet/masternode-1
      property: keystore
  - secretKey: coinbase
    remoteRef:
      key: xdc/mainnet/masternode-1
      property: coinbase
```

### HashiCorp Vault

```yaml
apiVersion: secrets.hashicorp.com/v1beta1
kind: VaultDynamicSecret
metadata:
  name: xdc-keys
  namespace: xdc-network
spec:
  vaultAuthRef: xdc-auth
  mount: kv-v2
  path: xdc/mainnet/masternode-1
  destination:
    create: true
    name: xdc-keys
```

---

## StatefulSet Deployment

### Masternode

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: xdc-masternode
  namespace: xdc-network
  labels:
    app.kubernetes.io/name: xdc-node
    app.kubernetes.io/component: masternode
spec:
  serviceName: xdc-masternode
  replicas: 1
  podManagementPolicy: OrderedReady
  selector:
    matchLabels:
      app.kubernetes.io/name: xdc-node
      app.kubernetes.io/component: masternode
  template:
    metadata:
      labels:
        app.kubernetes.io/name: xdc-node
        app.kubernetes.io/component: masternode
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "6060"
        prometheus.io/path: "/debug/metrics/prometheus"
    spec:
      serviceAccountName: xdc-node-sa
      securityContext:
        runAsUser: 1000
        runAsGroup: 1000
        fsGroup: 1000
        runAsNonRoot: true
        seccompProfile:
          type: RuntimeDefault
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app.kubernetes.io/component
                  operator: In
                  values:
                  - masternode
              topologyKey: kubernetes.io/hostname
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: node-role.kubernetes.io/xdc
                operator: In
                values:
                - "true"
      tolerations:
      - key: "dedicated"
        operator: "Equal"
        value: "xdc-nodes"
        effect: "NoSchedule"
      containers:
      - name: xdc-node
        image: xinfinorg/xinfin-node:latest
        imagePullPolicy: IfNotPresent
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
        ports:
        - name: p2p-tcp
          containerPort: 30303
          protocol: TCP
        - name: p2p-udp
          containerPort: 30303
          protocol: UDP
        - name: rpc
          containerPort: 8545
          protocol: TCP
        - name: ws
          containerPort: 8888
          protocol: TCP
        - name: metrics
          containerPort: 6060
          protocol: TCP
        env:
        - name: NETWORK
          valueFrom:
            configMapKeyRef:
              name: xdc-config
              key: NETWORK
        - name: SYNC_MODE
          valueFrom:
            configMapKeyRef:
              name: xdc-config
              key: SYNC_MODE
        - name: COINBASE
          valueFrom:
            secretKeyRef:
              name: xdc-keys
              key: coinbase
        resources:
          requests:
            cpu: "8"
            memory: "32Gi"
          limits:
            cpu: "16"
            memory: "64Gi"
        volumeMounts:
        - name: xdc-data
          mountPath: /work/xdcchain
        - name: tmp
          mountPath: /tmp
        livenessProbe:
          exec:
            command:
            - /bin/sh
            - -c
            - |
              curl -sf http://localhost:8545 \
                -X POST \
                -H "Content-Type: application/json" \
                -d '{"jsonrpc":"2.0","method":"net_peerCount","params":[],"id":1}' | \
                jq -e '.result | tonumber > 0'
          initialDelaySeconds: 300
          periodSeconds: 30
          timeoutSeconds: 10
          failureThreshold: 3
        readinessProbe:
          exec:
            command:
            - /bin/sh
            - -c
            - |
              curl -sf http://localhost:8545 \
                -X POST \
                -H "Content-Type: application/json" \
                -d '{"jsonrpc":"2.0","method":"eth_syncing","params":[],"id":1}' | \
                jq -e '.result == false'
          initialDelaySeconds: 60
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        startupProbe:
          exec:
            command:
            - /bin/sh
            - -c
            - |
              curl -sf http://localhost:8545 \
                -X POST \
                -H "Content-Type: application/json" \
                -d '{"jsonrpc":"2.0","method":"net_listening","params":[],"id":1}' | \
                jq -e '.result == true'
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 30
      volumes:
      - name: tmp
        emptyDir: {}
  volumeClaimTemplates:
  - metadata:
      name: xdc-data
    spec:
      storageClassName: xdc-fast-ssd
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 2Ti
```

### Full Node

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: xdc-fullnode
  namespace: xdc-network
  labels:
    app.kubernetes.io/name: xdc-node
    app.kubernetes.io/component: fullnode
spec:
  serviceName: xdc-fullnode
  replicas: 3
  podManagementPolicy: Parallel
  selector:
    matchLabels:
      app.kubernetes.io/name: xdc-node
      app.kubernetes.io/component: fullnode
  template:
    metadata:
      labels:
        app.kubernetes.io/name: xdc-node
        app.kubernetes.io/component: fullnode
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "6060"
    spec:
      serviceAccountName: xdc-node-sa
      securityContext:
        runAsUser: 1000
        runAsGroup: 1000
        fsGroup: 1000
        runAsNonRoot: true
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app.kubernetes.io/component
                operator: In
                values:
                - fullnode
            topologyKey: kubernetes.io/hostname
      containers:
      - name: xdc-node
        image: xinfinorg/xinfin-node:latest
        ports:
        - name: p2p-tcp
          containerPort: 30303
          protocol: TCP
        - name: p2p-udp
          containerPort: 30303
          protocol: UDP
        - name: rpc
          containerPort: 8545
          protocol: TCP
        - name: ws
          containerPort: 8888
          protocol: TCP
        - name: metrics
          containerPort: 6060
          protocol: TCP
        env:
        - name: NETWORK
          valueFrom:
            configMapKeyRef:
              name: xdc-config
              key: NETWORK
        - name: SYNC_MODE
          value: "snap"
        resources:
          requests:
            cpu: "4"
            memory: "16Gi"
          limits:
            cpu: "8"
            memory: "32Gi"
        volumeMounts:
        - name: xdc-data
          mountPath: /work/xdcchain
        livenessProbe:
          httpGet:
            path: /
            port: rpc
          initialDelaySeconds: 300
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /
            port: rpc
          initialDelaySeconds: 60
          periodSeconds: 10
  volumeClaimTemplates:
  - metadata:
      name: xdc-data
    spec:
      storageClassName: xdc-fast-ssd
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 2Ti
```

---

## Service Definitions

### Headless Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: xdc-masternode
  namespace: xdc-network
spec:
  type: ClusterIP
  clusterIP: None
  selector:
    app.kubernetes.io/name: xdc-node
    app.kubernetes.io/component: masternode
  ports:
  - name: p2p-tcp
    port: 30303
    targetPort: 30303
    protocol: TCP
  - name: p2p-udp
    port: 30303
    targetPort: 30303
    protocol: UDP
  - name: rpc
    port: 8545
    targetPort: 8545
  - name: ws
    port: 8888
    targetPort: 8888
  - name: metrics
    port: 6060
    targetPort: 6060
```

### LoadBalancer for P2P

```yaml
apiVersion: v1
kind: Service
metadata:
  name: xdc-masternode-p2p
  namespace: xdc-network
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
    service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
spec:
  type: LoadBalancer
  selector:
    app.kubernetes.io/name: xdc-node
    app.kubernetes.io/component: masternode
  ports:
  - name: p2p-tcp
    port: 30303
    targetPort: 30303
    protocol: TCP
  - name: p2p-udp
    port: 30303
    targetPort: 30303
    protocol: UDP
  externalTrafficPolicy: Local
```

### Internal RPC

```yaml
apiVersion: v1
kind: Service
metadata:
  name: xdc-rpc-internal
  namespace: xdc-network
spec:
  type: ClusterIP
  selector:
    app.kubernetes.io/component: fullnode
  ports:
  - name: rpc
    port: 8545
    targetPort: 8545
  - name: ws
    port: 8888
    targetPort: 8888
```

### Ingress with TLS

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: xdc-rpc-ingress
  namespace: xdc-network
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "600"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - rpc.xdc-network.example.com
    secretName: xdc-rpc-tls
  rules:
  - host: rpc.xdc-network.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: xdc-rpc-internal
            port:
              number: 8545
```

---

## Network Policies

### Default Deny

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: xdc-network
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
```

### Allow P2P

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-p2p
  namespace: xdc-network
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: xdc-node
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from: []
    ports:
    - protocol: TCP
      port: 30303
    - protocol: UDP
      port: 30303
  egress:
  - to: []
    ports:
    - protocol: TCP
      port: 30303
    - protocol: UDP
      port: 30303
```

### Allow RPC Internal

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-rpc-internal
  namespace: xdc-network
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: xdc-node
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: monitoring
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 8545
    - protocol: TCP
      port: 8888
    - protocol: TCP
      port: 6060
```

### Allow DNS and External

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-egress-dns-sync
  namespace: xdc-network
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: xdc-node
  policyTypes:
  - Egress
  egress:
  - to:
    - namespaceSelector: {}
      podSelector:
        matchLabels:
          k8s-app: kube-dns
    ports:
    - protocol: UDP
      port: 53
    - protocol: TCP
      port: 53
  - to: []
    ports:
    - protocol: TCP
      port: 443
    - protocol: TCP
      port: 80
```

---

## Pod Disruption Budget

### Masternode

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: xdc-masternode-pdb
  namespace: xdc-network
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: xdc-node
      app.kubernetes.io/component: masternode
```

### Full Nodes

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: xdc-fullnode-pdb
  namespace: xdc-network
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app.kubernetes.io/name: xdc-node
      app.kubernetes.io/component: fullnode
```

---

## Monitoring: Prometheus and Grafana

### ServiceMonitor

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

### Prometheus Rules

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: xdc-node-alerts
  namespace: monitoring
  labels:
    release: prometheus
spec:
  groups:
  - name: xdc-node
    rules:
    - alert: XDCNodeDown
      expr: up{job="xdc-node-metrics"} == 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "XDC node {{ $labels.pod }} is down"
        description: "XDC node {{ $labels.pod }} in namespace {{ $labels.namespace }} has been down for more than 5 minutes."

    - alert: XDCNodeNotSynced
      expr: xdc_eth_syncing{job="xdc-node-metrics"} == 1
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "XDC node {{ $labels.pod }} is not synced"
        description: "XDC node has been out of sync for more than 10 minutes."

    - alert: XDCNodeLowPeers
      expr: xdc_p2p_peers{job="xdc-node-metrics"} < 5
      for: 15m
      labels:
        severity: warning
      annotations:
        summary: "XDC node {{ $labels.pod }} has low peer count"
        description: "Peer count is {{ $value }}, expected at least 5."

    - alert: XDCNodeDiskFull
      expr: |
        (
          kubelet_volume_stats_available_bytes{namespace="xdc-network"}
          /
          kubelet_volume_stats_capacity_bytes{namespace="xdc-network"}
        ) < 0.1
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "XDC node disk is almost full"
        description: "Disk usage is above 90%."
```

### Grafana Dashboard Panels

| Panel | Prometheus Query | Alert Threshold |
|-------|-----------------|-----------------|
| Block Height | `xdc_eth_block_number` | None |
| Peer Count | `xdc_p2p_peers` | < 5 warning, < 2 critical |
| Sync Status | `xdc_eth_syncing` | 1 = syncing |
| Disk Usage | `1 - (available / capacity)` | > 80% warning, > 90% critical |
| Memory Usage | `working_set / limit` | > 80% warning, > 90% critical |
| CPU Usage | `rate(container_cpu_usage_seconds_total[5m])` | > 80% warning |

---

## Backup Strategies

### Volume Snapshots

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: xdc-masternode-backup
  namespace: xdc-network
spec:
  volumeSnapshotClassName: csi-aws-vsc
  source:
    persistentVolumeClaimName: xdc-data-xdc-masternode-0
```

### S3 Chain Data Backup

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: xdc-chain-backup
  namespace: xdc-network
spec:
  schedule: "0 2 * * *"
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: amazon/aws-cli:latest
            command:
            - /bin/sh
            - -c
            - |
              aws s3 sync /work/xdcchain/XDC \
                s3://xdc-backups/mainnet/chain-$(date +%Y%m%d)/ \
                --storage-class STANDARD_IA
            volumeMounts:
            - name: xdc-data
              mountPath: /work/xdcchain
              readOnly: true
          volumes:
          - name: xdc-data
            persistentVolumeClaim:
              claimName: xdc-data-xdc-masternode-0
          restartPolicy: OnFailure
```

---

## Upgrade Procedures

### Rolling Upgrade for Full Nodes

```bash
# Update image
kubectl set image statefulset/xdc-fullnode \
  xdc-node=xinfinorg/xinfin-node:v2.0.0 \
  -n xdc-network

# Watch rollout
kubectl rollout status statefulset/xdc-fullnode -n xdc-network
```

### Masternode Upgrade

```bash
# Cordon node
kubectl cordon $(kubectl get pod xdc-masternode-0 -n xdc-network -o jsonpath='{.spec.nodeName}')

# Graceful shutdown
kubectl exec xdc-masternode-0 -n xdc-network -- \
  /work/xdcchain/bin/XDC attach /work/xdcchain/XDC.ipc --exec admin.stopRPC()

# Wait for shutdown
kubectl wait --for=delete pod/xdc-masternode-0 -n xdc-network --timeout=300s

# Update image
kubectl set image statefulset/xdc-masternode \
  xdc-node=xinfinorg/xinfin-node:v2.0.0 -n xdc-network

# Verify
kubectl rollout status statefulset/xdc-masternode -n xdc-network

# Uncordon
kubectl uncordon $(kubectl get pod xdc-masternode-0 -n xdc-network -o jsonpath='{.spec.nodeName}')
```

### Rollback

```bash
kubectl rollout undo statefulset/xdc-masternode -n xdc-network
```

---

## Cloud Provider Examples

### AWS EKS

```bash
# Create cluster
eksctl create cluster \
  --name xdc-network \
  --region us-east-1 \
  --node-type m6i.2xlarge \
  --nodes 3 \
  --nodes-min 3 \
  --nodes-max 6 \
  --managed

# Add dedicated node group
eksctl create nodegroup \
  --cluster xdc-network \
  --name xdc-nodes \
  --node-type m6i.4xlarge \
  --nodes 3 \
  --node-labels "node-role.kubernetes.io/xdc=true" \
  --node-taints "dedicated=xdc-nodes:NoSchedule"

# Install EBS CSI driver
eksctl create addon --name aws-ebs-csi-driver --cluster xdc-network
```

### Google GKE

```bash
gcloud container clusters create xdc-network \
  --zone us-central1-a \
  --num-nodes 3 \
  --machine-type n2-standard-8

gcloud container node-pools create xdc-nodes \
  --cluster xdc-network \
  --machine-type n2-standard-16 \
  --num-nodes 3 \
  --node-labels node-role.kubernetes.io/xdc=true \
  --node-taints dedicated=xdc-nodes:NoSchedule
```

### Azure AKS

```bash
az aks create \
  --resource-group xdc-network-rg \
  --name xdc-network \
  --node-count 3 \
  --node-vm-size Standard_D8s_v5

az aks nodepool add \
  --cluster-name xdc-network \
  --resource-group xdc-network-rg \
  --name xdcnodes \
  --node-count 3 \
  --node-vm-size Standard_D16s_v5 \
  --labels node-role.kubernetes.io/xdc=true \
  --node-taints dedicated=xdc-nodes:NoSchedule
```

---

## Troubleshooting

### Pod Stuck in Pending

```bash
kubectl describe pod xdc-masternode-0 -n xdc-network
kubectl top nodes
kubectl get pvc -n xdc-network
kubectl get nodes --show-labels
```

Common causes: insufficient CPU or memory, PVC not bound, node affinity requirements not met.

### Node Not Syncing

```bash
# Check sync status
kubectl exec xdc-masternode-0 -n xdc-network -- \
  curl -s http://localhost:8545 -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_syncing","params":[],"id":1}'

# Check peer count
kubectl exec xdc-masternode-0 -n xdc-network -- \
  curl -s http://localhost:8545 -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"net_peerCount","params":[],"id":1}'

# Check logs
kubectl logs xdc-masternode-0 -n xdc-network --tail=100
```

Common fixes: verify NetworkPolicy allows P2P, confirm LoadBalancer has public IP, check firewall rules for port 30303.

### Disk Full

```bash
kubectl exec xdc-masternode-0 -n xdc-network -- df -h /work/xdcchain

# Expand PVC
kubectl patch pvc xdc-data-xdc-masternode-0 -n xdc-network \
  -p '{"spec":{"resources":{"requests":{"storage":"4Ti"}}}}'
```

### High Memory Usage

```bash
kubectl top pod xdc-masternode-0 -n xdc-network

# Reduce cache in ConfigMap
kubectl edit configmap xdc-config -n xdc-network
# Change CACHE from 4096 to 2048

# Restart to apply
kubectl rollout restart statefulset/xdc-masternode -n xdc-network
```

---

## Security Checklist

| Check | Status | Implementation |
|-------|--------|----------------|
| Non-root container | Required | runAsUser: 1000 |
| Read-only root filesystem | Required | readOnlyRootFilesystem: true |
| Drop all capabilities | Required | capabilities: drop: [ALL] |
| No privilege escalation | Required | allowPrivilegeEscalation: false |
| Seccomp profile | Required | RuntimeDefault |
| Encrypted storage | Required | encrypted: true in StorageClass |
| Network policies | Required | Default deny + explicit allow |
| Secrets encryption | Required | KMS or external secrets manager |
| RBAC least privilege | Required | Role scoped to namespace |
| Resource limits | Required | Prevents DoS |
| Image scanning | Required | Trivy or Grype in CI/CD |
| Pod security standards | Required | Enforce restricted |
| Audit logging | Recommended | Enable Kubernetes audit |
| Runtime detection | Recommended | Falco for anomaly detection |

---

## Related Topics

- [Docker Setup](../../xdcchain/developers/node_operators/docker.md): Single-node Docker deployment
- [Node Architecture](../../xdcchain/developers/node_operators/node_architecture.md): XDC node internals
- [Validator Handbook](../../xdcchain/developers/node_operators/validator-handbook.md): Validator operations
- [Helm Charts](../helm/index.md): Helm chart deployment
- [Backup and Recovery](../backup/index.md): Comprehensive backup strategies
- [Incident Response](../runbooks/index.md): Troubleshooting runbooks
- [Infrastructure as Code](../iac/index.md): Terraform and Pulumi examples
- [Monitoring and Observability](../monitoring/index.md): Prometheus and Grafana setup
