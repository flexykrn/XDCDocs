---
title: "Querying Subgraphs"
sidebar_position: 23
description: "Query an XDC subgraph with GraphQL — entity queries, filters, ordering, pagination, time-travel block queries, and frontend integration with fetch and TypeScript types."
---

# Querying Subgraphs

Once a subgraph is deployed (see [Deploying a Subgraph](/docs/xdc-chain/developers/subgraph-deployment)), it serves a GraphQL API generated from your schema. This page covers the query patterns you will use daily, using the XRC20 `Transfer`/`Account` schema from [Building a Subgraph](/docs/xdc-chain/developers/subgraph-development).

## Entity Queries

Every `@entity` type gets a singular query (by ID) and a plural query (list):

```graphql
{
  account(id: "0xabc123...") {
    balance
  }
  transfers(first: 5) {
    id
    value
    timestamp
  }
}
```

IDs are the exact values your mapping used — for addresses, that means **lowercase `0x`-prefixed bytes**. Convert `xdc`-style or checksummed addresses before querying.

Relations resolve inline. `@derivedFrom` fields behave like normal lists:

```graphql
{
  account(id: "0xabc123...") {
    balance
    transfersReceived(first: 3, orderBy: timestamp, orderDirection: desc) {
      value
      from { id }
    }
  }
}
```

## Filters

The `where` argument supports operators per field type — `_gt`, `_gte`, `_lt`, `_lte`, `_in`, `_not`, `_contains` (strings), and more:

```graphql
{
  transfers(where: {
    to: "0xabc123...",
    value_gt: "1000000000000000000000", # > 1000 tokens (18 decimals), as string
    timestamp_gte: "1720000000"
  }) {
    value
    blockNumber
  }
}
```

Large numbers are passed as **strings** — GraphQL's native integer type cannot hold wei-scale values.

## Ordering and Pagination

Use `orderBy` / `orderDirection` plus `first` / `skip` for pages:

```graphql
{
  transfers(
    first: 100
    skip: 200
    orderBy: timestamp
    orderDirection: desc
  ) {
    id
    value
  }
}
```

Pagination rules that matter in practice:

- **`first` caps at 1000** per query — you cannot pull an unbounded list in one request.
- **`skip` gets slow on deep offsets.** For "stream everything" jobs, paginate by a cursor instead: `where: { timestamp_gt: lastSeen }` with `orderBy: timestamp, orderDirection: asc`.
- Keep `orderBy` fields indexed-friendly (timestamps, block numbers) for predictable performance.

## Time-Travel (Block) Queries

Every query can be evaluated at a historical block, returning the entity state *as of that height*:

```graphql
{
  account(id: "0xabc123...", block: { number: 61234567 }) {
    balance
  }
}
```

Use `block: { hash: "0x..." }` when you need consistency against a specific block hash. Time-travel queries are the right tool for balance snapshots, historical portfolio values, and reconciliations — no need to recompute from transfers. Note that querying state far back requires the underlying node to have archive data; see [Node Architecture](/docs/xdc-chain/developers/node-operators/node-architecture).

## Subscriptions

GraphQL subscriptions (live push updates) are **not supported** by The Graph's query API. For real-time UX, poll on an interval, or subscribe to the chain directly over WebSocket for the events you care about and refetch subgraph data on trigger — see [WebSocket & Real-Time Events](/docs/xdc-chain/developers/websocket-events).

## Frontend Integration

A minimal typed client with `fetch`:

```typescript
const ENDPOINT = "http://localhost:8000/subgraphs/name/mytoken/graphql";

interface Transfer {
  id: string;
  value: string;   // BigInt serialized as string
  timestamp: string;
}

interface TransfersResponse {
  data: { transfers: Transfer[] };
  errors?: { message: string }[];
}

async function getRecentTransfers(to: string): Promise<Transfer[]> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `
        query RecentTransfers($to: Bytes!) {
          transfers(where: { to: $to }, orderBy: timestamp,
                    orderDirection: desc, first: 10) {
            id
            value
            timestamp
          }
        }`,
      variables: { to: to.toLowerCase() },
    }),
  });
  const body = (await res.json()) as TransfersResponse;
  if (body.errors) throw new Error(body.errors[0].message);
  return body.data.transfers;
}
```

Notes:

- **Always check `errors`** — GraphQL returns HTTP 200 with an `errors` array for query failures.
- **Lowercase address variables** before sending; entity IDs and `Bytes` filters are case-sensitive lowercase.
- **Keep `value` as string or `BigInt`** in TypeScript — never `number`.
- For larger apps, generate types from the schema with GraphQL Code Generator instead of hand-writing interfaces.

For the surrounding dApp stack — wallet connection, RPC providers, and contract calls alongside subgraph reads — see [Frontend Integration](/docs/smart-contracts/frontend-integration).

## See Also

- [The Graph & Subgraphs on XDC](/docs/xdc-chain/developers/subgraph-guide) — overview
- [Building a Subgraph](/docs/xdc-chain/developers/subgraph-development) — the schema queried here
- [Deploying a Subgraph](/docs/xdc-chain/developers/subgraph-deployment) — endpoint URLs and node setup
- [Frontend Integration](/docs/smart-contracts/frontend-integration) — full dApp stack
