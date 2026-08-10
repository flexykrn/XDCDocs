---
title: "The Graph & Subgraphs on XDC"
sidebar_position: 17
description: Index XDC on-chain data with a self-hosted graph-node pointed at an XDC RPC endpoint — subgraph anatomy, a full XRC20 Transfer indexing example, deployment, querying from a dApp, and custom indexer alternatives.
---

# The Graph & Subgraphs on XDC

Querying historical events and aggregated state over raw JSON-RPC does not scale: scanning `eth_getLogs` across millions of blocks is slow, and RPC cannot express queries like "all token holders sorted by balance." An indexer replays blocks once, decodes events into a database, and serves them through a query API. This page covers running a subgraph on XDC with [The Graph](https://thegraph.com/), plus a lightweight custom-indexer alternative.

## When Do You Need an Indexer?

| Use case | Tool |
|---|---|
| Live notifications for one contract | [WebSocket subscriptions](/docs/xdc-chain/developers/websocket-events) — no indexer needed |
| Historical queries over many events | Indexer (subgraph or custom) |
| Aggregations (balances, volumes, holders) | Indexer |
| Complex filters/joins across entities | Subgraph with GraphQL |

## Indexing Options on XDC

**Self-hosted graph-node.** The Graph's open-source `graph-node` indexes any EVM-compatible chain over standard JSON-RPC, so it works against an XDC endpoint. This is the full subgraph stack: manifest, GraphQL schema, AssemblyScript mappings, PostgreSQL, and IPFS.

**The Graph's hosted network.** The Graph's decentralized network and Subgraph Studio support a fixed list of chains; XDC is not listed among the officially supported networks at the time of writing. Check The Graph's [supported networks page](https://thegraph.com/docs/en/developing/supported-networks/) for current status — do not assume your subgraph can be published there.

**Custom indexer.** A small script that backfills with `eth_getLogs` and tails new blocks over WebSocket. Sufficient for a single contract at modest scale, with no extra infrastructure beyond a database.

## Subgraph Anatomy

A subgraph has three parts:

- **`subgraph.yaml`** — the manifest: which contract, which network, from which block, and which handlers run for which events.
- **`schema.graphql`** — entity definitions; The Graph generates a queryable GraphQL API from these.
- **`src/mapping.ts`** — AssemblyScript handlers that transform events into entity rows.

## Example: Indexing XRC20 Transfers on Apothem

Scaffold with `npm install -g @graphprotocol/graph-cli` and `graph init`, or create the three files below.

`subgraph.yaml`:

```yaml
specVersion: 0.0.5
schema:
  file: ./schema.graphql
dataSources:
  - kind: ethereum
    name: MyToken
    network: xdc-apothem
    source:
      address: "0xYourXRC20ContractAddress"
      abi: MyToken
      startBlock: 50000000 # deployment block — see Production Notes
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      entities:
        - Transfer
      abis:
        - name: MyToken
          file: ./abis/MyToken.json
      eventHandlers:
        - event: Transfer(indexed address,indexed address,uint256)
          handler: handleTransfer
      file: ./src/mapping.ts
```

The `network` value is a label you choose; it must match the chain name you register in your graph-node config (below).

`schema.graphql`:

```graphql
type Transfer @entity {
  id: Bytes!
  from: Bytes!
  to: Bytes!
  value: BigInt!
  blockNumber: BigInt!
  timestamp: BigInt!
}
```

`src/mapping.ts`:

```typescript
import { Transfer as TransferEvent } from "../generated/MyToken/MyToken";
import { Transfer } from "../generated/schema";

export function handleTransfer(event: TransferEvent): void {
  let entity = new Transfer(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.from = event.params.from;
  entity.to = event.params.to;
  entity.value = event.params.value;
  entity.blockNumber = event.block.number;
  entity.timestamp = event.block.timestamp;
  entity.save();
}
```

## Running graph-node Locally

The standard stack is `graph-node` + PostgreSQL + IPFS. The Graph publishes an official [`docker-compose.yml`](https://github.com/graphprotocol/graph-node/tree/master/docker); point its `ethereum` environment variable at your XDC endpoint:

```yaml
# excerpt from docker-compose.yml
services:
  graph-node:
    image: graphprotocol/graph-node
    environment:
      ethereum: "xdc-apothem:https://rpc.apothem.network"
```

The chain name (`xdc-apothem`) must match the `network` field in `subgraph.yaml`. For mainnet use `https://erpc.xinfin.network` — see [Mainnet RPC Endpoints](/docs/xdc-chain/developers/mainnetrpc). A graph node that backfills from an early `startBlock` generates heavy RPC load; prefer your own archive node over public RPCs.

Build, create, and deploy:

```bash
graph codegen && graph build
graph create --node http://localhost:8020/ mytoken
graph deploy --node http://localhost:8020/ \
  --ipfs http://localhost:5001 mytoken
```

Then query at `http://localhost:8000/subgraphs/name/mytoken/graphql` (GraphiQL is served at the same URL).

## Querying from a dApp

```graphql
query RecentTransfers($to: Bytes!) {
  transfers(
    where: { to: $to }
    orderBy: timestamp
    orderDirection: desc
    first: 10
  ) {
    from
    value
    timestamp
  }
}
```

```typescript
const res = await fetch("http://localhost:8000/subgraphs/name/mytoken/graphql", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    query: `query RecentTransfers($to: Bytes!) { ... }`,
    variables: { to: userAddress.toLowerCase() },
  }),
});
const { data } = await res.json();
```

Addresses are stored lowercase `0x`-prefixed; convert `xdc`-style addresses first. See [Frontend Integration](/docs/smart-contracts/frontend-integration) for the surrounding dApp stack.

## Alternative: Lightweight Custom Indexer

For one contract and modest scale, skip the Graph stack entirely:

```typescript
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider("https://rpc.apothem.network");
const iface = new ethers.Interface(["event Transfer(address,address,uint256)"]);

async function backfill(from: number, to: number) {
  for (let start = from; start <= to; start += 5000) {
    const logs = await provider.getLogs({
      address: CONTRACT,
      topics: [iface.getEvent("Transfer")!.topicHash],
      fromBlock: start,
      toBlock: Math.min(start + 4999, to),
    });
    // decode logs and insert into Postgres/SQLite
  }
}
```

Backfill in block-range chunks with `eth_getLogs`, then tail new blocks with a WebSocket subscription — see [WebSocket & Real-Time Events](/docs/xdc-chain/developers/websocket-events). Persist rows to Postgres or SQLite and serve them with any API framework.

## Production Notes

- **`startBlock` matters.** Set it to the contract's deployment block; omitting it forces a full-chain scan.
- **Reorgs.** XDC finality is fast, but graph-node tracks chain reorganization automatically; a custom indexer must handle reorgs itself — re-check block hashes or only treat blocks older than N confirmations as final.
- **Pruning and state.** Querying historical *state* (not just logs) requires an archive node — full nodes keep only recent state. See [Node Architecture](/docs/xdc-chain/developers/node-operators/node-architecture) and the full-vs-archive node comparison in the [masternode guide](/docs/xdc-chain/developers/node-operators/masternode).
- **RPC load.** Backfills hammer `eth_getLogs`; run your own RPC/archive node rather than exhausting public endpoint rate limits. Event handlers must be deterministic and idempotent — The Graph may re-run them after reorgs.

## See Also

- [JSON-RPC Reference](/docs/api-reference/json-rpc) — `eth_getLogs` and subscription methods
- [WebSocket & Real-Time Events](/docs/xdc-chain/developers/websocket-events) — live event subscriptions
- [Frontend Integration](/docs/smart-contracts/frontend-integration) — connecting a dApp UI to XDC
