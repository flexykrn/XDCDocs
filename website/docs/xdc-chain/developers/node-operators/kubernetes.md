---
title: Kubernetes Deployment Guide
sidebar_position: 14
description: Run an XDC validator or standby node on Kubernetes with a StatefulSet, persistent storage, secrets-managed keys, and an optional Helm chart template.
---

## When Kubernetes Makes Sense

Kubernetes is a good fit for XDC node operations when your team already runs production workloads on Kubernetes, you operate multiple nodes and want uniform rollout and observability, or you need infrastructure-level HA features (automated rescheduling, volume snapshots, declarative config).

For a **single validator or standby node**, Kubernetes is usually overkill. The [Docker setup](/docs/xdc-chain/developers/node-operators/docker) (docker-compose from the XinFin-Node repository) is simpler, well-tested by the community, and easier to debug. A misconfigured cluster is a bigger slashing risk than a simple VM.

## Architecture

| Concern | Kubernetes primitive | Notes |
|---|---|---|
| Stable network identity | **StatefulSet** | Stable pod hostname and DNS |
| Chain data | **PersistentVolumeClaim** | 1 TB SSD/NVMe per the [hardware requirements](/docs/xdc-chain/developers/node-operators/validator-node) |
| P2P traffic (port 30303) | **Service** (LoadBalancer or NodePort) | Must be publicly reachable, no NAT |
| RPC / WS (ports 8545/8546) | **ClusterIP Service only** | Never expose RPC publicly |
| Node keys / keystore password | **Secret** | Manage via sealed-secrets or external-secrets, not plain Git |

:::danger Double-signing risk
**Never run more than one replica with the same keys.** Two pods signing blocks with the same coinbase private key simultaneously can produce conflicting signatures — treated as equivocation by the network and a direct path to slashing. Keep `replicas: 1` at all times, including during upgrades.
:::

## Full Manifest Example

The manifests below replicate the docker-compose setup from the [Docker guide](/docs/xdc-chain/developers/node-operators/docker) using the same image (`xinfinorg/xdposchain:v2.7.0`).

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: xdc-node-secrets
  namespace: xdc
type: Opaque
stringData:
  # Mounted at /work/.pwd (keystore unlock password)
  password: "change-me"
  # Node identity from the .env file in XinFin-Node
  INSTANCE_NAME: My_K8s_Node
  CONTACT_DETAILS: ops@example.com
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: xdc-chain-data
  namespace: xdc
spec:
  accessModes: ["ReadWriteOnce"]
  storageClassName: ssd
  resources:
    requests:
      storage: 1Ti
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: xdc-node
  namespace: xdc
spec:
  serviceName: xdc-node
  replicas: 1
  updateStrategy:
    type: OnDelete
  selector:
    matchLabels:
      app: xdc-node
  template:
    metadata:
      labels:
        app: xdc-node
    spec:
      containers:
        - name: xdc
          image: xinfinorg/xdposchain:v2.7.0
          ports:
            - containerPort: 30303
            - containerPort: 8545
          envFrom:
            - secretRef:
                name: xdc-node-secrets
          resources:
            requests:
              cpu: "4"
              memory: 16Gi
            limits:
              cpu: "6"
              memory: 20Gi
          volumeMounts:
            - name: chain-data
              mountPath: /work/xdcchain
            - name: secrets
              mountPath: /work/.pwd
              subPath: password
      volumes:
        - name: chain-data
          persistentVolumeClaim:
            claimName: xdc-chain-data
        - name: secrets
          secret:
            secretName: xdc-node-secrets
---
apiVersion: v1
kind: Service
metadata:
  name: xdc-node-p2p
  namespace: xdc
spec:
  type: LoadBalancer
  selector:
    app: xdc-node
  ports:
    - name: p2p-tcp
      port: 30303
      targetPort: 30303
    - name: p2p-udp
      port: 30303
      targetPort: 30303
      protocol: UDP
---
apiVersion: v1
kind: Service
metadata:
  name: xdc-node-rpc
  namespace: xdc
spec:
  type: ClusterIP
  selector:
    app: xdc-node
  ports:
    - name: rpc
      port: 8545
```

Apply with:

```bash
kubectl create namespace xdc
kubectl apply -n xdc -f xdc-node.yaml
```

**Key handling:** the `stringData` secret is shown for illustration. In production, manage secrets with [sealed-secrets](https://github.com/bitnami-labs/sealed-secrets) or the [External Secrets Operator](https://external-secrets.io/) so plaintext keys never touch Git — the same rule as never committing `.env` files (see [key management](/docs/xdc-chain/developers/node-operators/validator-node)).

**RPC security:** the RPC service is `ClusterIP` on purpose. An exposed RPC endpoint on a validator leaks the unlocked coinbase account. Reach it only from workloads inside the cluster.

## Helm Chart Template

There is **no official XDC Helm chart**. The sketch below is a community-style template you can adapt and host yourself. Package the StatefulSet, Services, and PVC from the manifest above as chart templates parameterized by this `values.yaml`:

```yaml
image: { repository: xinfinorg/xdposchain, tag: v2.7.0 }
network: mainnet               # mainnet | apothem (testnet)
persistence: { size: 1Ti, storageClass: ssd }
resources:
  requests: { cpu: "4", memory: 16Gi }
  limits:   { cpu: "6", memory: 20Gi }
service:
  p2p: { type: LoadBalancer }
  rpc: { type: ClusterIP }     # keep internal
node:
  instanceName: My_K8s_Node
  contactDetails: ops@example.com
secrets:
  existingSecret: xdc-node-secrets   # reference, never inline keys
```

```bash
helm install xdc-node ./xdc-node-chart --namespace xdc --create-namespace -f values.yaml
```

Keep one release per node — never two releases sharing the same keystore.

## Operations

**Logs and console:**

```bash
kubectl -n xdc logs -f statefulset/xdc-node
kubectl -n xdc exec -it xdc-node-0 -- /bin/sh
```

Attach to the client console (equivalent of `bash xdc-attach.sh`) and query:

```javascript
> eth.syncing
> eth.blockNumber
> net.peerCount
```

`eth.syncing` returns `false` when fully synced; compare `eth.blockNumber` against [XDCScan](https://xdcscan.com).

**Upgrades:** a validator is a single-writer workload, so do **not** use a rolling update strategy. With `updateStrategy: OnDelete`, the pod is replaced only when you delete it, giving a controlled maintenance window:

```bash
kubectl -n xdc set image statefulset/xdc-node xdc=xinfinorg/xdposchain:<new-tag>
kubectl -n xdc delete pod xdc-node-0
```

Verify the new pod syncs and resumes signing before considering the upgrade complete — missed signing within an epoch leads to slashing (see the [Slashing Mechanism](/docs/xdc-chain/developers/node-operators/slashing)).

**Backups:** use your CSI driver's volume snapshot support to snapshot the `xdc-chain-data` PVC before upgrades, and back up the keystore and `.pwd` secret offline immediately after setup. See [Backup and Recovery](/docs/xdc-chain/developers/node-operators/backup-recovery) for the full procedure.

## Monitoring Integration

Annotate the pod template so Prometheus discovers the node, and pair with a node exporter DaemonSet for host metrics:

```yaml
# inside the StatefulSet pod template metadata
annotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "6060"     # adjust to your client's metrics endpoint
  prometheus.io/path: "/metrics"
```

For alert rules covering stalled block height, low peer count, and disk pressure, see [Node Monitoring and Observability](/docs/xdc-chain/developers/node-operators/monitoring).

## See Also

- [Setup XDC Masternode using Docker](/docs/xdc-chain/developers/node-operators/docker)
- [Validator/Standby Node](/docs/xdc-chain/developers/node-operators/validator-node)
