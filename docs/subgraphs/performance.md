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

