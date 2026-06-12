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

