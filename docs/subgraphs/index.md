# The Graph Subgraph Development Guide for XDC

Subgraphs are open APIs that extract, process, and index blockchain data, making it queryable via GraphQL. For XDC developers, subgraphs eliminate the need for complex direct RPC indexing, enabling efficient data retrieval for decentralized applications at scale.

---

## Overview

### What Is a Subgraph

A subgraph is a custom indexing specification that defines which blockchain events to listen to, how to transform that data, and what GraphQL schema to expose for querying. It acts as a middleware layer between the blockchain and your application, providing structured, indexed data with powerful query capabilities.

**Key Benefits:**

- **Indexed Data:** Query blockchain data in milliseconds instead of scanning blocks
- **GraphQL Interface:** Flexible, typed queries with exactly the data you need
- **Real-Time Updates:** Automatic indexing of new blocks and events
- **Cost Efficiency:** Reduce RPC call volume and infrastructure costs
- **Reliability:** Hosted indexing with redundancy and uptime guarantees
- **Composability:** Multiple subgraphs can be combined for complex dApp requirements

### How Subgraphs Work

The subgraph indexing pipeline follows this architecture:

```
Blockchain Events → Graph Node → Mapping Functions → Store → GraphQL API
```

**Indexing Pipeline:**

1. **Event Detection:** Graph Node monitors XDC blocks for configured events
2. **Data Extraction:** Matching events trigger mapping functions (AssemblyScript)
3. **Transformation:** Mappings process raw event data into entities
4. **Storage:** Transformed entities are stored in a PostgreSQL database
5. **Query Serving:** GraphQL API exposes indexed data with filtering and pagination

### XDC Network Compatibility

The Graph supports XDC Mainnet and Apothem Testnet through the hosted service and Subgraph Studio. XDC's EVM compatibility means Ethereum subgraphs require minimal or no modifications to work on XDC.

**Network Identifiers:**

| Network | Chain ID | Subgraph Network Name |
|---------|----------|----------------------|
| XDC Mainnet | 50 | `xdc` |
| Apothem Testnet | 51 | `apothem` |

---

## Prerequisites

### Development Environment

Before building subgraphs, ensure you have the following tools installed:

**Required:**

- **Node.js:** Version 18 or higher
- **npm or yarn:** Package manager for Graph CLI
- **Git:** Version control for subgraph deployment

**Recommended:**

- **Docker:** For local Graph Node testing
- **PostgreSQL:** Local database for self-hosted indexing
- **IPFS Node:** For local subgraph deployment

### Installing Graph CLI

The Graph CLI is the primary tool for creating, building, and deploying subgraphs.

**Global Installation:**

```bash
npm install -g @graphprotocol/graph-cli
```

**Verify Installation:**

```bash
graph --version
# Expected output: @graphprotocol/graph-cli 0.60.x or higher
```

**Project-Level Installation (Recommended):**

```bash
npm install --save-dev @graphprotocol/graph-cli
```

This ensures consistent CLI versions across team members and CI/CD pipelines.

### XDC Network Access

For indexing XDC, you need reliable RPC access:

**Public RPC Endpoints:**

| Network | HTTP RPC | WebSocket RPC |
|---------|----------|---------------|
| Mainnet | https://rpc.xinfin.network | wss://rpc.xinfin.network |
| Testnet | https://rpc.apothem.network | wss://rpc.apothem.network |

**Recommended:** Use dedicated RPC providers (Ankr, QuickNode, or self-hosted) for production subgraphs to ensure reliability and avoid rate limits.

---

## Subgraph Concepts

### GraphQL Schema Design

The schema defines the data structure that your subgraph will expose. It uses GraphQL schema definition language (SDL) with The Graph-specific directives.

**Entity Definition:**

```graphql
type Transfer @entity {
  id: ID!
  from: Bytes!
  to: Bytes!
  value: BigInt!
  timestamp: BigInt!
  blockNumber: BigInt!
  transactionHash: Bytes!
}
```

**Schema Directives:**

| Directive | Purpose |
|-----------|---------|
| `@entity` | Marks a type as indexable entity |
| `@id` | Primary key field (mandatory for entities) |
| `@derivedFrom` | Defines reverse lookup relationships |

**Relationship Patterns:**

```graphql
type Token @entity {
  id: ID!
  symbol: String!
  name: String!
  decimals: Int!
  totalSupply: BigInt!
  transfers: [Transfer!]! @derivedFrom(field: "token")
  holders: [Holder!]! @derivedFrom(field: "token")
}

type Holder @entity {
  id: ID!
  address: Bytes!
  token: Token!
  balance: BigInt!
}
```

**Data Types:**

| Type | Description | Example |
|------|-------------|---------|
| `ID` | Unique identifier string | `"0x123..."` |
| `String` | UTF-8 string | `"XDC Token"` |
| `Int` | 32-bit signed integer | `42` |
| `BigInt` | Arbitrary precision integer | `10^18` |
| `Float` | 64-bit floating point | `3.14` |
| `Boolean` | True/false | `true` |
| `Bytes` | Byte array (hex) | `0xabcd...` |
| `BigDecimal` | High precision decimal | `1.0000000001` |

### Subgraph Manifest

The `subgraph.yaml` manifest defines the subgraph configuration, including data sources, entities, and mapping handlers.

**Manifest Structure:**

```yaml
specVersion: 0.0.4
schema:
  file: ./schema.graphql
dataSources:
  - kind: ethereum
    name: XRC20Token
    network: xdc
    source:
      address: "0x1234..."
      abi: XRC20
      startBlock: 12345678
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.6
      language: wasm/assemblyscript
      entities:
        - Transfer
        - Approval
      abis:
        - name: XRC20
          file: ./abis/XRC20.json
      eventHandlers:
        - event: Transfer(indexed address,indexed address,uint256)
          handler: handleTransfer
        - event: Approval(indexed address,indexed address,uint256)
          handler: handleApproval
      file: ./src/mapping.ts
```

**Configuration Fields:**

| Field | Description |
|-------|-------------|
| `specVersion` | Subgraph specification version |
| `schema.file` | Path to GraphQL schema |
| `dataSources` | Array of blockchain data sources |
| `source.address` | Contract address to monitor |
| `source.abi` | ABI reference name |
| `source.startBlock` | Block to start indexing from |
| `mapping.language` | Only `wasm/assemblyscript` supported |
| `eventHandlers` | Event-to-handler mappings |

### AssemblyScript Mappings

Mappings are TypeScript-like functions that transform blockchain events into entities. They run in a WebAssembly sandbox with blockchain-specific APIs.

**Basic Mapping Structure:**

```typescript
import {
  Transfer as TransferEvent,
  Approval as ApprovalEvent
} from "../generated/XRC20Token/XRC20";
import { Transfer, Approval } from "../generated/schema";

export function handleTransfer(event: TransferEvent): void {
  let transfer = new Transfer(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  );
  transfer.from = event.params.from;
  transfer.to = event.params.to;
  transfer.value = event.params.value;
  transfer.timestamp = event.block.timestamp;
  transfer.blockNumber = event.block.number;
  transfer.transactionHash = event.transaction.hash;
  transfer.save();
}
```

**Available APIs:**

| API | Purpose |
|-----|---------|
| `ethereum.Event` | Event parameters and metadata |
| `ethereum.Block` | Block header information |
| `ethereum.Transaction` | Transaction details |
| `store.get/load` | Entity retrieval |
| `store.set/save` | Entity persistence |
| `log.info/debug/error` | Logging for debugging |
| `ipfs.cat/map` | IPFS data access |
| `crypto.keccak256` | Cryptographic hashing |

### Indexing Mechanics

**Block Processing:**

1. Graph Node receives new block from XDC network
2. Scans block for events matching manifest filters
3. Executes corresponding mapping handlers
4. Stores resulting entities in database
5. Updates indexing progress marker

**Reorganization Handling:**

If the XDC chain reorganizes, the Graph Node automatically:

1. Detects the reorganization depth
2. Rolls back affected entities
3. Reprocesses blocks from the common ancestor
4. Ensures data consistency

**Indexing Status:**

Monitor indexing progress via the Graph CLI or Subgraph Studio dashboard. Full indexing time depends on:

- Number of events to process
- Complexity of mapping logic
- Network block time
- Graph Node resources

---

## Development Workflow

### Project Initialization

**Create New Subgraph:**

```bash
graph init --product subgraph-studio xdc-token-indexer
```

**From Contract Example:**

```bash
graph init \
  --product subgraph-studio \
  --from-contract 0xContractAddress \
  --network xdc \
  --abi ./path/to/abi.json \
  xdc-token-indexer
```

**Project Structure:**

```
xdc-token-indexer/
├── abis/
│   └── XRC20.json          # Contract ABI
├── src/
│   └── mapping.ts          # Mapping logic
├── tests/
│   └── .gitkeep            # Unit tests (optional)
├── schema.graphql          # GraphQL schema
├── subgraph.yaml           # Subgraph manifest
├── package.json            # Dependencies
└── tsconfig.json           # TypeScript config
```

### Schema Definition

Define your data model in `schema.graphql`:

```graphql
type Token @entity {
  id: ID!
  symbol: String!
  name: String!
  decimals: Int!
  totalSupply: BigInt!
  transferCount: BigInt!
  holderCount: BigInt!
}

type Account @entity {
  id: ID!
  balances: [TokenBalance!]! @derivedFrom(field: "account")
  sentTransfers: [Transfer!]! @derivedFrom(field: "from")
  receivedTransfers: [Transfer!]! @derivedFrom(field: "to")
}

type TokenBalance @entity {
  id: ID!
  token: Token!
  account: Account!
  balance: BigInt!
}

type Transfer @entity {
  id: ID!
  token: Token!
  from: Account!
  to: Account!
  value: BigInt!
  timestamp: BigInt!
  blockNumber: BigInt!
  transactionHash: Bytes!
}
```

### ABI Preparation

Obtain the contract ABI from:

- Compiler output (Hardhat, Foundry, Remix)
- Verified contract on XDCScan
- Etherscan equivalent for EVM-compatible contracts

**ABI Format:**

```json
[
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "from", "type": "address" },
      { "indexed": true, "name": "to", "type": "address" },
      { "indexed": false, "name": "value", "type": "uint256" }
    ],
    "name": "Transfer",
    "type": "event"
  }
]
```

### Mapping Implementation

Implement transformation logic in `src/mapping.ts`:

```typescript
import {
  Transfer as TransferEvent,
  XRC20
} from "../generated/XRC20Token/XRC20";
import {
  Token,
  Account,
  TokenBalance,
  Transfer
} from "../generated/schema";
import { Address, BigInt } from "@graphprotocol/graph-ts";

function getOrCreateAccount(address: Address): Account {
  let account = Account.load(address.toHex());
  if (!account) {
    account = new Account(address.toHex());
    account.save();
  }
  return account;
}

function getOrCreateTokenBalance(
  token: Token,
  account: Account
): TokenBalance {
  let id = token.id + "-" + account.id;
  let balance = TokenBalance.load(id);
  if (!balance) {
    balance = new TokenBalance(id);
    balance.token = token.id;
    balance.account = account.id;
    balance.balance = BigInt.zero();
    token.holderCount = token.holderCount.plus(BigInt.fromI32(1));
    token.save();
  }
  return balance;
}

export function handleTransfer(event: TransferEvent): void {
  let token = Token.load(event.address.toHex());
  if (!token) return;

  let fromAccount = getOrCreateAccount(event.params.from);
  let toAccount = getOrCreateAccount(event.params.to);

  // Update balances
  if (event.params.from.toHex() != "0x0000000000000000000000000000000000000000") {
    let fromBalance = getOrCreateTokenBalance(token, fromAccount);
    fromBalance.balance = fromBalance.balance.minus(event.params.value);
    fromBalance.save();
  }

  let toBalance = getOrCreateTokenBalance(token, toAccount);
  toBalance.balance = toBalance.balance.plus(event.params.value);
  toBalance.save();

  // Create transfer record
  let transfer = new Transfer(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  );
  transfer.token = token.id;
  transfer.from = fromAccount.id;
  transfer.to = toAccount.id;
  transfer.value = event.params.value;
  transfer.timestamp = event.block.timestamp;
  transfer.blockNumber = event.block.number;
  transfer.transactionHash = event.transaction.hash;
  transfer.save();

  // Update token stats
  token.transferCount = token.transferCount.plus(BigInt.fromI32(1));
  token.save();
}
```

### Local Testing

**Generate Code:**

```bash
graph codegen
```

This generates TypeScript types from your schema and ABI.

**Build Subgraph:**

```bash
graph build
```

Compiles mappings to WebAssembly and validates the manifest.

**Local Graph Node (Docker):**

```yaml
version: "3"
services:
  graph-node:
    image: graphprotocol/graph-node
    ports:
      - "8000:8000"
      - "8001:8001"
      - "8020:8020"
      - "8030:8030"
      - "8040:8040"
    environment:
      postgres_host: postgres
      postgres_user: graph-node
      postgres_pass: let-me-in
      postgres_db: graph-node
      ipfs: "ipfs:5001"
      ethereum: "xdc:https://rpc.xinfin.network"
      RUST_LOG: info
  
  ipfs:
    image: ipfs/kubo:latest
    ports:
      - "5001:5001"
  
  postgres:
    image: postgres:latest
    environment:
      POSTGRES_USER: graph-node
      POSTGRES_PASSWORD: let-me-in
      POSTGRES_DB: graph-node
```

**Deploy Locally:**

```bash
graph create xdc-token-indexer --node http://localhost:8020
graph deploy xdc-token-indexer \
  --ipfs http://localhost:5001 \
  --node http://localhost:8020
```

---

## Deployment

### Subgraph Studio

Subgraph Studio is the recommended platform for creating, testing, and publishing subgraphs to The Graph Network.

**Setup:**

1. Visit https://thegraph.com/studio/
2. Connect your wallet (MetaMask or WalletConnect)
3. Create a new subgraph
4. Note your deployment key

**Authenticate CLI:**

```bash
graph auth --studio YOUR_DEPLOY_KEY
```

**Deploy:**

```bash
graph deploy --studio xdc-token-indexer
```

**Version Management:**

- Each deployment creates a new version
- Versions are identified by IPFS hash
- Query URL remains stable across versions
- Previous versions remain accessible

### Hosted Service

The hosted service provides free subgraph indexing with API access.

**Create Subgraph:**

1. Visit https://thegraph.com/hosted-service/
2. Sign in with GitHub
3. Click "Add Subgraph"
4. Enter name and description

**Authenticate:**

```bash
graph auth --product hosted-service YOUR_ACCESS_TOKEN
```

**Deploy:**

```bash
graph deploy --product hosted-service YOUR_GITHUB_USERNAME/xdc-token-indexer
```

**XDC Network Configuration:**

Ensure your `subgraph.yaml` specifies:

```yaml
network: xdc
```

For testnet deployment:

```yaml
network: apothem
```

### Decentralized Network

Publishing to The Graph Network requires GRT tokens and follows a curation model.

**Requirements:**

- GRT tokens for curation signaling
- Subgraph published to Subgraph Studio
- Indexers available for XDC network

**Publish:**

```bash
graph publish --studio xdc-token-indexer
```

**Signal Curation:**

- Deposit GRT to signal quality to indexers
- Higher curation attracts more indexers
- Earn query fee rewards from usage

### XDC-Specific Configuration

**Network Names:**

| Environment | Network Value |
|-------------|--------------|
| Mainnet | `xdc` |
| Testnet | `apothem` |

**RPC Configuration:**

For self-hosted Graph Nodes, configure XDC RPC:

```bash
ethereum="xdc:https://rpc.xinfin.network"
```

For WebSocket support:

```bash
ethereum="xdc:wss://rpc.xinfin.network"
```

**Block Time Considerations:**

XDC's 2-second block time requires Graph Node tuning:

- Reduce `ETHEREUM_POLLING_INTERVAL` for faster detection
- Increase `GRAPH_ETHEREUM_TARGET_TRIGGERS_PER_BLOCK` for throughput
- Monitor `eth_getLogs` batch sizes for RPC provider limits

---

## Querying Subgraphs

### GraphQL Queries

Subgraphs expose a GraphQL endpoint for flexible data retrieval.

**Query Structure:**

```graphql
query GetTransfers($first: Int!, $skip: Int!) {
  transfers(
    first: $first
    skip: $skip
    orderBy: timestamp
    orderDirection: desc
  ) {
    id
    from {
      id
    }
    to {
      id
    }
    value
    timestamp
    transactionHash
  }
}
```

**Variables:**

```json
{
  "first": 10,
  "skip": 0
}
```

### Pagination

Use `first` and `skip` for offset-based pagination:

```graphql
query PaginatedTransfers($first: Int!, $skip: Int!) {
  transfers(first: $first, skip: $skip) {
    id
    value
  }
}
```

**Best Practice:** Limit `first` to 1000 maximum. For large datasets, use cursor-based pagination with `id` filtering:

```graphql
query CursorPagination($lastId: ID!) {
  transfers(
    first: 1000
    where: { id_gt: $lastId }
    orderBy: id
    orderDirection: asc
  ) {
    id
    value
  }
}
```

### Filtering

Apply `where` clauses for precise data selection:

```graphql
query FilteredTransfers {
  transfers(
    where: {
      value_gt: "1000000000000000000"
      timestamp_gt: "1700000000"
    }
  ) {
    id
    from {
      id
    }
    to {
      id
    }
    value
  }
}
```

**Available Operators:**

| Operator | Description |
|----------|-------------|
| `_eq` | Equal |
| `_gt` | Greater than |
| `_lt` | Less than |
| `_gte` | Greater than or equal |
| `_lte` | Less than or equal |
| `_in` | In array |
| `_not_in` | Not in array |
| `_contains` | Contains substring |
| `_starts_with` | Starts with |
| `_ends_with` | Ends with |

### Sorting

Order results with `orderBy` and `orderDirection`:

```graphql
query SortedTransfers {
  transfers(
    orderBy: timestamp
    orderDirection: desc
    first: 50
  ) {
    id
    timestamp
    value
  }
}
```

### Time-Travel Queries

Query historical state at a specific block:

```graphql
query HistoricalState {
  token(id: "0x...", block: { number: 50000000 }) {
    totalSupply
    holderCount
  }
}
```

### Real-Time Subscriptions

WebSocket subscriptions for live data updates:

```javascript
import { createClient } from 'graphql-ws';

const client = createClient({
  url: 'wss://api.thegraph.com/subgraphs/name/username/xdc-token-indexer'
});

const subscription = client.subscribe(
  {
    query: `
      subscription OnNewTransfer {
        transfers(orderBy: timestamp, orderDirection: desc, first: 1) {
          id
          from { id }
          to { id }
          value
        }
      }
    `
  },
  {
    next: (data) => console.log('New transfer:', data),
    error: (err) => console.error(err),
    complete: () => console.log('Done')
  }
);
```

---

## Performance Optimization

### Indexing Optimization

**Selective Indexing:**

Set `startBlock` to the contract deployment block to avoid processing unnecessary history:

```yaml
source:
  startBlock: 61580000  # Contract deployment block
```

**Event Filtering:**

Index only relevant events. Avoid indexing common events like `Approval` if not needed.

**Batch Processing:**

Process multiple entities in a single handler when possible:

```typescript
export function handleBatchTransfer(event: BatchTransferEvent): void {
  let recipients = event.params.recipients;
  let amounts = event.params.amounts;
  
  for (let i = 0; i < recipients.length; i++) {
    // Process each transfer in batch
    createTransfer(recipients[i], amounts[i]);
  }
}
```

### Query Optimization

**Field Selection:**

Request only needed fields to reduce response size:

```graphql
# Good: Minimal fields
query {
  transfers(first: 10) {
    id
    value
  }
}

# Avoid: Unnecessary nested data
query {
  transfers(first: 10) {
    id
    from { id balances { id token { id symbol name decimals } } }
    to { id balances { id token { id symbol name decimals } } }
  }
}
```

**Query Complexity:**

The Graph limits query complexity. Deep nesting and large `first` values may be rejected.

### Caching Strategies

**Client-Side Caching:**

```javascript
import { ApolloClient, InMemoryCache } from '@apollo/client';

const client = new ApolloClient({
  uri: 'https://api.thegraph.com/subgraphs/name/username/xdc-indexer',
  cache: new InMemoryCache()
});
```

**CDN Caching:**

Configure cache headers for repeated queries:

```javascript
fetch(subgraphUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'max-age=60'
  },
  body: JSON.stringify({ query })
});
```

---

## Example Subgraphs

### XRC20 Token Tracker

A complete subgraph for indexing any XRC20 token with holder balances and transfer history.

**Schema:**

```graphql
type Token @entity {
  id: ID!
  symbol: String!
  name: String!
  decimals: Int!
  totalSupply: BigInt!
  transferCount: BigInt!
  holderCount: BigInt!
}

type Account @entity {
  id: ID!
  balances: [TokenBalance!]! @derivedFrom(field: "account")
}

type TokenBalance @entity {
  id: ID!
  token: Token!
  account: Account!
  balance: BigInt!
}

type Transfer @entity {
  id: ID!
  token: Token!
  from: Account!
  to: Account!
  value: BigInt!
  timestamp: BigInt!
  blockNumber: BigInt!
}
```

**Mapping:**

```typescript
import { Transfer } from "../generated/XRC20/XRC20";
import { Token, Account, TokenBalance, Transfer as TransferEntity } from "../generated/schema";

export function handleTransfer(event: Transfer): void {
  // Implementation as shown in previous sections
}
```

### NFT Marketplace Indexer

Index NFT mints, transfers, sales, and marketplace listings.

**Key Entities:**

- `Collection`: NFT contract metadata
- `Token`: Individual NFT with metadata
- `Transfer`: Ownership changes
- `Sale`: Marketplace transactions with price
- `Listing`: Active marketplace listings

### DeFi Protocol Tracker

Index liquidity pools, swaps, deposits, and yield farming positions.

**Key Entities:**

- `Pool`: Liquidity pool with reserves
- `Swap`: Token exchange transactions
- `LiquidityPosition`: User LP token balances
- `YieldPosition`: Staking and farming positions

---

## Testing Procedures

### Unit Testing

The Graph provides a Matchstick testing framework for AssemblyScript mappings.

**Installation:**

```bash
npm install --save-dev matchstick-as
```

**Test Example:**

```typescript
import { assert, test, describe } from "matchstick-as";
import { handleTransfer } from "../src/mapping";
import { createTransferEvent } from "./utils";

describe("Transfer Handler", () => {
  test("Should create transfer entity", () => {
    let event = createTransferEvent(
      "0x123...",
      "0x456...",
      "1000000000000000000"
    );
    
    handleTransfer(event);
    
    assert.fieldEquals(
      "Transfer",
      event.transaction.hash.toHex() + "-0",
      "value",
      "1000000000000000000"
    );
  });
});
```

**Run Tests:**

```bash
graph test
```

### Integration Testing

**Local Deployment Testing:**

1. Deploy to local Graph Node
2. Query indexed data via GraphQL playground
3. Verify entity counts and relationships
4. Test edge cases (zero transfers, self-transfers)

**Staging Deployment:**

1. Deploy to Subgraph Studio
2. Monitor indexing progress
3. Run query validation suite
4. Compare results with direct RPC calls

---

## Troubleshooting

### Common Issues

**Indexing Failures:**

| Symptom | Cause | Solution |
|---------|-------|----------|
| "Failed to run hosted service" | Invalid manifest | Validate YAML syntax |
| "ABI mismatch" | Wrong ABI version | Regenerate ABI from deployment |
| "Entity not found" | Missing `save()` call | Ensure all entities are saved |
| "Null pointer" | Uninitialized entity | Check for null before accessing |
| "Out of gas" | Infinite loop in mapping | Add iteration limits |

**Slow Indexing:**

- Reduce `startBlock` to contract deployment
- Remove unnecessary event handlers
- Optimize mapping logic complexity
- Upgrade to paid Graph Node resources

**Query Timeouts:**

- Reduce `first` parameter
- Simplify nested queries
- Add filtering to limit result sets
- Implement client-side pagination

### Debugging Mappings

**Logging:**

```typescript
import { log } from "@graphprotocol/graph-ts";

log.info("Processing transfer from {} to {}", [
  event.params.from.toHex(),
  event.params.to.toHex()
]);

log.debug("Transfer value: {}", [event.params.value.toString()]);
```

View logs in Subgraph Studio or Graph Node console.

**Local Debugging:**

Use `console.log` equivalent and run tests with Matchstick for rapid iteration.

### Migration from Direct RPC

**Comparison:**

| Approach | Latency | Cost | Complexity | Real-Time |
|----------|---------|------|------------|-----------|
| Direct RPC | High | High | Low | Yes |
| Subgraph | Low | Low | Medium | Yes |
| Database | Low | Medium | High | No |

**Migration Steps:**

1. Identify all RPC queries in your application
2. Design subgraph schema to serve equivalent data
3. Implement mappings for required events
4. Deploy and index historical data
5. Replace RPC calls with GraphQL queries
6. Implement fallback to RPC for unindexed data

---

## Best Practices

### Schema Design

1. **Normalize Entities:** Separate concerns into distinct entities with relationships
2. **Use IDs Strategically:** Composite IDs prevent collisions (e.g., `token-address`)
3. **Index Frequently Queried Fields:** Add `@index` directive for performance
4. **Avoid Deep Nesting:** Limit entity relationships to 2-3 levels
5. **Document Fields:** Add comments explaining non-obvious fields

### Mapping Development

1. **Handle Edge Cases:** Zero values, self-transfers, reverted transactions
2. **Validate Inputs:** Check addresses and values before processing
3. **Minimize Storage:** Only store data your application needs
4. **Use Constants:** Define magic numbers as named constants
5. **Test Thoroughly:** Unit tests for all event handlers

### Deployment

1. **Version Control:** Tag subgraph versions for reproducibility
2. **Monitor Indexing:** Track sync status and error rates
3. **Backup Manifests:** Store subgraph.yaml in version control
4. **Document Changes:** Maintain changelog for schema updates
5. **Plan Migrations:** Schema changes require new deployments

### Querying

1. **Paginate Results:** Never request unbounded lists
2. **Cache Responses:** Implement client-side caching for static data
3. **Batch Requests:** Combine multiple queries when possible
4. **Handle Errors:** Implement retry logic for failed queries
5. **Optimize Complexity:** Simplify queries to reduce load

---

## Related Topics

- [Smart Contract Development](../smartcontract/index.md): Building contracts to emit indexed events
- [XDC3.js SDK](../sdks/xdc3js.md): JavaScript SDK for contract interaction
- [API Reference](../api/index.md): Direct RPC API documentation
- [Block Explorer Guide](../explorers/index.md): Verifying indexed data on explorers
- [Token Standards](../smartcontract/tokens/index.md): XRC20, XRC721, and XRC1155 specifications
- [Developer Quick Start](../xdcchain/developers/quick-guide.md): Getting started with XDC development
