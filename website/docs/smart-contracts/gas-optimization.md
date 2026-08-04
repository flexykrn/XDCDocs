---
title: Gas Optimization Strategies
sidebar_position: 11
description: Practical techniques for reducing gas usage in XDC Network smart contracts, from storage packing to design-level patterns.
---

# Gas Optimization Strategies for XDC Smart Contracts

Gas fees on the XDC Network are a fraction of a cent — a typical gas price of 0.25 Gwei makes even complex transactions nearly free compared to Ethereum. But cheap gas is not free gas. Optimization still matters for complex DeFi protocols, enterprise contracts that process thousands of operations, and any contract that approaches the block gas limit. This guide covers practical techniques to reduce gas usage in your XDC smart contracts, from storage layout to design-level patterns.

## Why Optimize on XDC

- **Fees are low, not zero:** At 0.25 Gwei, a contract deployment costs roughly ~$0.001–0.05 and an XRC20 transfer about ~$0.00012 (see [Gas & Fees](/docs/learn/gas-fees)). Individually trivial, but a contract serving thousands of daily users multiplies those costs.
- **Block gas limits still apply:** Every block caps total gas. Inefficient contracts limit how many of your users' transactions fit in a block and can make single operations fail outright.
- **Complex contracts hit limits first:** DeFi routers, batch processors, and enterprise settlement contracts are the most likely to run into out-of-gas failures — optimization is what keeps them callable.
- **Cheap attacks cut both ways:** Low fees make it inexpensive for bots to call your contract repeatedly, so wasteful code paths get exercised (and paid for by your users) constantly.

## Measure First

Never optimize blind. Measure gas usage before and after every change.

- **hardhat-gas-reporter:** Add the plugin to your Hardhat project and it prints a per-function gas table every time your tests run.
- **Foundry snapshots:** Run `forge snapshot` to record gas costs to a file, then use `forge snapshot --diff` after changes to see exactly what you saved.
- **Foundry gas reports:** Run `forge test --gas-report` for a detailed per-function breakdown with min/mean/max across test calls.

See the [Smart Contract Testing Guide](/docs/smart-contracts/testing-guide) for setting up Hardhat and Foundry on XDC.

## Storage Optimization

Storage is the most expensive resource in the EVM: a new `SSTORE` costs 20,000 gas, an update 5,000 gas, and an `SLOAD` 800 gas. Most optimization wins come from touching storage less.

### Pack Variables Into Slots

Each storage slot holds 32 bytes. Variables declared consecutively that fit in a slot share it:

```solidity
// Bad: uses 3 storage slots
uint256 a;
uint256 b;
uint256 c;

// Good: a and b share one slot — 2 slots total
uint128 a;
uint128 b;
uint256 c;
```

Order matters — group smaller types together so the compiler can pack them.

### Use memory and calldata Over storage

- **`calldata` for read-only parameters:** External function arguments you only read should be `calldata`, avoiding a copy to memory.
- **Cache storage in memory:** If you read a storage variable more than once in a function, load it into a memory variable first.

### immutable and constant

Values set once at deployment (`immutable`) or at compile time (`constant`) are embedded in the bytecode and never touch storage:

```solidity
uint256 public constant MAX_SUPPLY = 1_000_000 * 1e18;
address public immutable owner;

constructor() {
    owner = msg.sender;
}
```

### Mappings vs Arrays

- **Mappings:** Constant-cost lookups regardless of size. Prefer them for balances, allowlists, and registries.
- **Arrays:** Cheap to append, but iterating or searching costs gas proportional to length. Never iterate unbounded arrays on-chain.

### Delete for Refunds

Setting a storage slot back to zero with `delete` earns a gas refund. When a user fully exits a position, `delete` the struct instead of zeroing fields one by one.

## Computation Optimization

### unchecked Blocks for Safe Loops

Solidity 0.8 checks every arithmetic operation for overflow. In loops where the counter cannot overflow, skip the check:

```solidity
for (uint256 i = 0; i < length; ) {
    // loop body
    unchecked {
        ++i;
    }
}
```

Only use `unchecked` where overflow is provably impossible — see [Security Best Practices](/docs/smart-contracts/security-best-practices).

### Cache Storage Reads

```solidity
// Bad: three SLOADs of the same slot
function total(uint256 a, uint256 b) public view returns (uint256) {
    return totalSupply + a + b - totalSupply + totalSupply;
}

// Good: one SLOAD
function total(uint256 a, uint256 b) public view returns (uint256) {
    uint256 supply = totalSupply;
    return supply + a + b;
}
```

### Short-Circuit Conditions

Order `require` and `if` conditions cheapest-first. Put a cheap comparison before an expensive storage read or external call so failures revert early:

```solidity
require(amount > 0 && amount <= balances[msg.sender], "Invalid amount");
```

### external vs public

Functions only called from outside should be `external`, not `public`. Arguments to `external` functions are read directly from calldata instead of being copied to memory.

## Design-Level Optimization

- **Events instead of stored history:** Logs are far cheaper than storage. If data is only needed off-chain (history, analytics, audit trails), emit events and index them instead of writing arrays to storage.
- **Merkle proofs for allowlists:** Storing thousands of whitelisted addresses costs thousands of `SSTORE`s at setup. Store one 32-byte Merkle root instead and have users submit proofs.
- **Minimal proxies (EIP-1167):** Deploying many copies of the same contract (wallets, vaults, clones)? Deploy one implementation and cheap ~45-byte proxy clones that delegate to it, cutting deployment cost dramatically.
- **Batch operations:** Let users combine multiple actions in one transaction (multi-transfers, batch approvals) so the fixed 21,000-gas transaction base cost is paid once instead of per operation.

## Data Types

- **bytes32 over string:** If text fits in 32 bytes (symbols, short codes, identifiers), use `bytes32` — it occupies one slot and avoids dynamic-type overhead. Reserve `string` for genuinely variable-length data.
- **Bitmaps for booleans:** A single `uint256` can hold 256 flags. Toggle and read individual bits with shifts and masks instead of storing 256 separate `bool` values or a `mapping(uint8 => bool)`.

## Anti-Patterns That Cost More

- **Unbounded loops:** Looping over a user-grown array will eventually exceed the block gas limit and brick the function. Use pull patterns or paginate.
- **Storage writes inside loops:** Each `SSTORE` costs thousands of gas. Accumulate in a memory variable inside the loop and write to storage once at the end.
- **Redundant SSTORE of the same value:** Writing a value a slot already holds still costs gas. Check before writing, or structure logic so writes only happen on change.
- **Public getters for everything:** Every `public` state variable generates a getter, adding to deployment size. Mark internal-only variables `internal` or `private`.

## XDC-Specific Notes

- **Legacy gas model on mainnet:** XDC mainnet currently uses the legacy gas model; EIP-1559 is being rolled out on Apothem Testnet (see the [FAQ](/docs/xdc-chain/faq#gas--fees)). There is no volatile base fee to time around — a typical gas price of 0.25 Gwei is consistently sufficient.
- **Deployment vs runtime tradeoffs:** Contract deployment costs only ~$0.001–0.05 at typical prices, so the usual "shrink bytecode at all costs" pressure is weaker on XDC. Still keep runtime costs down for high-frequency functions your users call often, but don't contort your architecture solely to shave deployment size.
- **Keep the block gas limit in mind:** Even with negligible fees, a single transaction cannot exceed the block gas limit — the real ceiling for batch sizes and loop bounds on XDC.

## See Also

- [Gas & Fees on XDC Network](/docs/learn/gas-fees) — gas prices, operation costs, and fee tables
- [Smart Contract Testing Guide](/docs/smart-contracts/testing-guide) — Hardhat and Foundry setup with gas measurement
- [Security Best Practices](/docs/smart-contracts/security-best-practices) — safe patterns and pre-deployment checklist
- [Smart Contracts FAQ](/docs/xdc-chain/faq#smart-contracts) — network details and common questions
