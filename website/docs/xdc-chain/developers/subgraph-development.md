---
title: "Building a Subgraph"
sidebar_position: 21
description: "Build an XRC20 subgraph end-to-end on XDC — full manifest, schema with Transfer and Account entities, AssemblyScript mappings with derived fields, codegen and build commands, and common pitfalls."
---

# Building a Subgraph

This page extends the example from [The Graph & Subgraphs on XDC](/docs/xdc-chain/developers/subgraph-guide) into a complete, production-shaped XRC20 indexer: it tracks every `Transfer` *and* maintains per-account balances derived from those transfers. Concepts are explained in [Subgraph Concepts](/docs/xdc-chain/developers/subgraph-concepts); deployment is in [Deploying a Subgraph](/docs/xdc-chain/developers/subgraph-deployment).

## Project Layout

```
mytoken-subgraph/
├── subgraph.yaml
├── schema.graphql
├── abis/
│   └── MyToken.json
└── src/
    └── mapping.ts
```

Scaffold with `npm install -g @graphprotocol/graph-cli` and `graph init`, or create the files by hand. Export your contract's ABI from Hardhat/Foundry artifacts into `abis/MyToken.json`.

## subgraph.yaml

```yaml
specVersion: 0.0.5
schema:
  file: ./schema.graphql
dataSources:
  - kind: ethereum
    name: MyToken
    network: xdc-apothem # use xdc for mainnet — must match graph-node config
    source:
      address: "0xYourXRC20ContractAddress"
      abi: MyToken
      startBlock: 50000000 # deployment block — REQUIRED, see Pitfalls
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      entities:
        - Transfer
        - Account
      abis:
        - name: MyToken
          file: ./abis/MyToken.json
      eventHandlers:
        - event: Transfer(indexed address,indexed address,uint256)
          handler: handleTransfer
      file: ./src/mapping.ts
```

The `network` value is a label you choose; it must match the chain name registered in your graph-node config. Use the contract's actual deployment block for `startBlock` — find it on the contract page of [xdcscan.com](https://xdcscan.com) or [testnet.xdcscan.com](https://testnet.xdcscan.com).

## schema.graphql

```graphql
type Transfer @entity {
  id: Bytes! # txHash + logIndex
  from: Account!
  to: Account!
  value: BigInt!
  blockNumber: BigInt!
  timestamp: BigInt!
  transactionHash: Bytes!
}

type Account @entity {
  id: Bytes! # address
  balance: BigInt!
  transfersSent: [Transfer!]! @derivedFrom(field: "from")
  transfersReceived: [Transfer!]! @derivedFrom(field: "to")
}
```

Two things to notice:

- **Relations by reference:** `Transfer.from` stores the `Account` ID (the address bytes). The Graph resolves the join at query time.
- **`@derivedFrom`:** The `transfersSent`/`transfersReceived` arrays are virtual — computed by reverse lookup, not stored. Never set a `@derivedFrom` field in a mapping; doing so is a schema error.

## src/mapping.ts

```typescript
import { BigInt, Address } from "@graphprotocol/graph-ts";
import { Transfer as TransferEvent } from "../generated/MyToken/MyToken";
import { Transfer, Account } from "../generated/schema";

function loadOrCreateAccount(address: Address): Account {
  let account = Account.load(address);
  if (account == null) {
    account = new Account(address);
    account.balance = BigInt.zero();
  }
  return account;
}

export function handleTransfer(event: TransferEvent): void {
  let id = event.transaction.hash.concatI32(event.logIndex.toI32());
  let transfer = new Transfer(id);

  let from = loadOrCreateAccount(event.params.from);
  let to = loadOrCreateAccount(event.params.to);

  transfer.from = from.id;
  transfer.to = to.id;
  transfer.value = event.params.value;
  transfer.blockNumber = event.block.number;
  transfer.timestamp = event.block.timestamp;
  transfer.transactionHash = event.transaction.hash;

  from.balance = from.balance.minus(event.params.value);
  to.balance = to.balance.plus(event.params.value);

  from.save();
  to.save();
  transfer.save();
}
```

The entity ID pattern (`txHash + logIndex`) guarantees uniqueness and idempotency — if a reorg causes the handler to re-run, it overwrites the same row. Note that mint events (`from = 0x0`) still work: the zero address becomes a normal `Account` row with a negative balance, which is standard practice for token indexers.

## Codegen and Build

```bash
npm install          # installs @graphprotocol/graph-ts etc.
graph codegen        # generates typed classes into generated/
graph build          # compiles mappings to WASM, validates everything
```

Run `graph codegen` **after every schema or ABI change** — the generated classes in `generated/schema` and `generated/MyToken/` are what the mapping imports, and stale types cause confusing build errors. `graph build` catches type errors, missing handlers, and schema/manifest mismatches before you deploy.

## Common Pitfalls

- **Missing `startBlock`.** Omitting it forces a scan from block 0 — on XDC mainnet that means hours of backfill and heavy RPC load. Always set it to the deployment block.
- **`BigInt` handling.** Token amounts are `BigInt`, never JS numbers — `Number(value)` overflows past 2^53. Use `BigInt.zero()`, `.plus()`, `.minus()` from `@graphprotocol/graph-ts`, and format decimals in the UI.
- **Lowercase addresses.** The Graph stores addresses as lowercase `0x` bytes. Convert `xdc`-prefixed or checksummed addresses before using them as entity IDs or query variables.
- **Setting `@derivedFrom` fields.** They are read-only reverse lookups; assigning to them fails the build.
- **Nondeterministic handlers.** No `Math.random`, no wall-clock time, no HTTP calls — handlers re-run on reorgs and must produce identical output.
- **Entity IDs that collide.** Using only the transaction hash as an ID breaks when one transaction emits multiple events. Always include `logIndex`.
- **Forgetting to `save()`.** Creating an entity without `.save()` drops it silently.

## Next Steps

Deploy to a local graph-node against Apothem first: [Deploying a Subgraph](/docs/xdc-chain/developers/subgraph-deployment). Then query the `Account` and `Transfer` entities from your dApp: [Querying Subgraphs](/docs/xdc-chain/developers/subgraph-querying).

## See Also

- [The Graph & Subgraphs on XDC](/docs/xdc-chain/developers/subgraph-guide) — overview and indexing options
- [Subgraph Concepts](/docs/xdc-chain/developers/subgraph-concepts) — how the stack works
- [Tokens](/docs/smart-contracts/tokens) — deploying the XRC20 contract to index
