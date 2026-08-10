---
title: "Deploying a Subgraph"
sidebar_position: 22
description: "Run a local graph-node against XDC mainnet and Apothem — docker-compose stack, chain configuration, graph create/deploy flow, versioning and upgrades, and query endpoint URLs."
---

# Deploying a Subgraph

This page covers running your own graph-node pointed at XDC and deploying the subgraph built in [Building a Subgraph](/docs/xdc-chain/developers/subgraph-development). Background on why self-hosting is the path for XDC today is in [The Graph & Subgraphs on XDC](/docs/xdc-chain/developers/subgraph-guide) and [Subgraph Concepts](/docs/xdc-chain/developers/subgraph-concepts).

## The Local Stack

A graph-node deployment needs three services: the node itself, PostgreSQL (entity storage), and IPFS (subgraph artifact storage). The Graph publishes an official [`docker-compose.yml`](https://github.com/graphprotocol/graph-node/tree/master/docker); the XDC-specific part is the `ethereum` environment variable:

```yaml
# excerpt from docker-compose.yml
services:
  graph-node:
    image: graphprotocol/graph-node
    ports:
      - "8000:8000" # GraphQL query API
      - "8020:8020" # admin/deploy API
      - "5001:5001" # IPFS (proxied through graph-node's ipfs service)
    environment:
      postgres_host: postgres
      ipfs: "ipfs:5001"
      ethereum: "xdc-apothem:https://rpc.apothem.network"
    depends_on:
      - postgres
      - ipfs

  postgres:
    image: postgres
    environment:
      POSTGRES_PASSWORD: let-me-in

  ipfs:
    image: ipfs/kubo
```

Start it with `docker compose up`. First start takes a few minutes while graph-node initializes its schema.

## Chain Configuration: Mainnet and Apothem

The `ethereum` variable maps network labels to RPC endpoints. Register both chains at once by space-separating entries:

```yaml
environment:
  ethereum: "xdc:https://erpc.xinfin.network xdc-apothem:https://rpc.apothem.network"
```

- `xdc` → mainnet, RPC `https://erpc.xinfin.network` (see [Mainnet RPC Endpoints](/docs/xdc-chain/developers/mainnetrpc) for alternatives)
- `xdc-apothem` → Apothem testnet, RPC `https://rpc.apothem.network` (see [Apothem RPC](/docs/xdc-chain/developers/apothemrpc))

The label on the left **must match the `network` field in `subgraph.yaml`**, or deployment fails with an unknown-network error. Public RPCs work for testing, but a subgraph backfilling from an early `startBlock` hammers `eth_getLogs` — for anything serious, point the node at your own archive endpoint; see [Node Architecture](/docs/xdc-chain/developers/node-operators/node-architecture).

## Create and Deploy

From your subgraph project directory (after `graph codegen && graph build`):

```bash
# 1. Register a subgraph name on the node (once per subgraph)
graph create --node http://localhost:8020/ mytoken

# 2. Upload to IPFS and point the node at the deployment
graph deploy --node http://localhost:8020/ \
  --ipfs http://localhost:5001 \
  mytoken
```

Watch indexing progress in the graph-node logs (`docker compose logs -f graph-node`) — you will see the block cursor advance from `startBlock` toward the chain head. Sync time depends on how far back `startBlock` is and how many matching events exist.

## Query Endpoint URLs

Once deployed, the subgraph is reachable at:

- **GraphQL API + GraphiQL:** `http://localhost:8000/subgraphs/name/mytoken/graphql`
- **By deployment hash:** `http://localhost:8000/subgraphs/id/<QmDeploymentHash>/graphql`

Open the GraphQL URL in a browser for the interactive GraphiQL explorer — it auto-completes against your schema, which is the fastest way to prototype queries before wiring them into a dApp. Query patterns are covered in [Querying Subgraphs](/docs/xdc-chain/developers/subgraph-querying).

## Versioning and Upgrades

Redeploying to the same name replaces the live deployment **after the new version finishes syncing**:

```bash
graph deploy --node http://localhost:8020/ \
  --ipfs http://localhost:5001 \
  --version-label v0.0.2 \
  mytoken
```

Practical upgrade workflow:

1. Fix the schema or mappings, bump `startBlock` only if the change invalidates old data.
2. `graph codegen && graph build`, then `graph deploy` with a new `--version-label`.
3. Let the new version sync while the old one keeps serving queries.
4. The node switches the `subgraphs/name/` endpoint to the new version once synced; the old deployment stays queryable by its `/id/<hash>` URL until you remove it.

For fixes that only affect recent blocks, graft onto the existing deployment to skip re-indexing history — see the grafting section in [Subgraph Concepts](/docs/xdc-chain/developers/subgraph-concepts).

## Production Notes

- **Persistence:** The Compose file above is for development. In production, give PostgreSQL a real volume, back it up, and pin image versions.
- **RPC load:** Backfills are bursty and heavy. Prefer a dedicated archive node over public endpoints; respect rate limits on shared RPCs.
- **Reorgs:** graph-node handles chain reorganizations automatically — no manual intervention needed, but expect the block cursor to occasionally step back a few blocks.
- **Multiple subgraphs:** One node hosts many subgraphs; just `graph create` / `graph deploy` under different names.

## See Also

- [The Graph & Subgraphs on XDC](/docs/xdc-chain/developers/subgraph-guide) — overview and indexing options
- [Building a Subgraph](/docs/xdc-chain/developers/subgraph-development) — the subgraph being deployed here
- [Querying Subgraphs](/docs/xdc-chain/developers/subgraph-querying) — using the deployed endpoint
- [Mainnet RPC Endpoints](/docs/xdc-chain/developers/mainnetrpc) — endpoint options for the chain config
