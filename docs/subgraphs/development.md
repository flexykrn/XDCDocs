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

