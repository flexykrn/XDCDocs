---
title: "Subgraph Concepts"
sidebar_position: 20
description: "How The Graph works under the hood — manifest, schema, and mapping anatomy, AssemblyScript constraints, grafting and pruning, and hosted vs self-hosted indexing on XDC."
---

# Subgraph Concepts

[The Graph & Subgraphs on XDC](/docs/xdc-chain/developers/subgraph-guide) shows a working example; this page explains the machinery behind it so you can reason about performance, debugging, and infrastructure choices before writing any code.

## How The Graph Works

At a high level, a graph-node watches a chain, runs your handlers for matching events, and stores the results in PostgreSQL behind a GraphQL API:

```
XDC chain (JSON-RPC)
        │  eth_getLogs / block receipts
        ▼
   graph-node ──► finds blocks ≥ startBlock matching your dataSource
        │
        ▼
  mapping.ts (compiled to WASM) ──► one handler call per matching event
        │  entity.save()
        ▼
   PostgreSQL ◄── schema.graphql defines the tables
        │
        ▼
  GraphQL API (:8000) ──► your dApp queries entities
```

Three files define the whole pipeline:

- **`subgraph.yaml` (manifest):** Declares data sources — contract address, network label, `startBlock`, the ABI, and which handler function runs for which event signature. This is the node's filter: only matching events ever reach your code.
- **`schema.graphql` (schema):** Entity definitions with `@entity` types. The Graph generates both the database tables and the queryable GraphQL API from this file, so field types here dictate what queries are possible later.
- **`src/mapping.ts` (mappings):** AssemblyScript handlers compiled to WebAssembly. Each handler receives a typed event object and creates or updates entity rows.

The practical consequence: changing the schema or mappings requires redeploying and re-indexing from `startBlock`, so design entities before you deploy, not after.

## AssemblyScript Constraints

Mappings are written in AssemblyScript — a TypeScript-like language that compiles to WASM — and it is *not* JavaScript:

- **No floating point.** Use `BigInt` (from `@graphprotocol/graph-ts`) for all token amounts and compute decimals off-chain or in the UI.
- **No `Date`, `Math.random`, or nondeterministic APIs.** Handlers must be deterministic — The Graph may re-run them after reorgs, and divergent output corrupts the store. Use `event.block.timestamp` for time.
- **No network access.** Handlers cannot call external APIs. All data must come from the event, the block, or `ethereum.bind()` contract calls.
- **Typed generics everywhere.** `Array<T>`, `Map<K,V>`, and nullable handling differ subtly from TypeScript; `graph codegen` generates typed entity classes and event classes — always build on those rather than hand-writing types.
- **Idempotency is your job.** If two events can create the same entity ID, decide whether the second should overwrite, merge, or be ignored.

## Grafting and Pruning

**Grafting** lets a new subgraph version start from the indexed state of an older version at a specific block instead of re-indexing from scratch:

```yaml
graft:
  base: QmOldSubgraphDeploymentID
  block: 61234567
```

Use it when a mapping fix only affects blocks after a known height — you inherit history and index only the new range. Grafting is a deployment-time feature of self-hosted nodes and Subgraph Studio, not something the manifest does automatically for every change.

**Pruning** concerns the underlying node, not the subgraph: graph-node needs block receipts and logs, and for `ethereum.bind()` contract calls at historical blocks it needs archive state. Pointing a subgraph with historical contract calls at a pruned full node will fail mid-sync — see the full-vs-archive comparison in [Node Architecture](/docs/xdc-chain/developers/node-operators/node-architecture).

## Sync Behavior and Reorgs

graph-node tracks the chain head and processes blocks in order. On XDC, finality is fast (epochs of 900 blocks with checkpoint finalization), but short reorgs can still occur:

- The node detects a reorg by comparing block hashes and **rolls back affected entities automatically**, then re-runs handlers on the new canonical blocks.
- This is why handler determinism and idempotent entity IDs matter — the same event may be processed more than once.
- Queries see recently indexed blocks immediately; if your UI depends on absolute finality, filter by `blockNumber` with a confirmation margin or use time-travel queries (see [Querying Subgraphs](/docs/xdc-chain/developers/subgraph-querying)).

## Hosted vs Self-Hosted on XDC

As covered in [The Graph & Subgraphs on XDC](/docs/xdc-chain/developers/subgraph-guide), the honest status:

- **The Graph's hosted network / Subgraph Studio** supports a fixed list of chains, and XDC is not among the officially supported networks at the time of writing. Check The Graph's [supported networks page](https://thegraph.com/docs/en/developing/supported-networks/) before planning around it.
- **Self-hosted graph-node** works against any EVM JSON-RPC endpoint, including XDC mainnet and Apothem. You run graph-node + PostgreSQL + IPFS yourself — see [Deploying a Subgraph](/docs/xdc-chain/developers/subgraph-deployment) for the full setup.
- A **custom indexer** is a reasonable alternative for a single contract at modest scale — no Graph stack at all, just `eth_getLogs` plus a database.

If XDC gains hosted support later, a well-structured self-hosted subgraph (manifest + schema + mappings) ports over unchanged — the three files are the same artifact either way.

## See Also

- [The Graph & Subgraphs on XDC](/docs/xdc-chain/developers/subgraph-guide) — overview and XRC20 example
- [Building a Subgraph](/docs/xdc-chain/developers/subgraph-development) — end-to-end XRC20 walkthrough
- [Deploying a Subgraph](/docs/xdc-chain/developers/subgraph-deployment) — local graph-node on XDC
- [Querying Subgraphs](/docs/xdc-chain/developers/subgraph-querying) — GraphQL patterns
