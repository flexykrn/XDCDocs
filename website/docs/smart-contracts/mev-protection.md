---
title: MEV Protection
sidebar_position: 23
description: How front-running and sandwich attacks work, what MEV looks like on the XDC Network, and how to design contracts, dApps, and user flows that resist it.
---

# MEV Protection: Front-Running & Sandwich Attack Mitigation

Maximal Extractable Value (MEV) is profit that block producers — or anyone who can influence transaction ordering — earn by inserting, reordering, or censoring transactions inside a block. This guide explains the common MEV attack patterns, what the MEV landscape looks like on the XDC Network, and the concrete mitigations you can build into contracts, dApps, and user workflows.

## What Is MEV

Because pending transactions are visible in the public mempool before they are mined, anyone watching the mempool can react to them before they execute. The main attack patterns are:

| Pattern | What Happens |
| ------- | ------------ |
| **Front-running** | An attacker sees your pending transaction and submits their own copy with a higher fee (or direct validator access) so it executes first — stealing an arbitrage, an NFT mint, a liquidation bonus, or an underpriced trade. |
| **Sandwich attack** | An attacker brackets a victim's DEX swap: they buy just before the victim (pushing the price up) and sell immediately after (capturing the slippage the victim created). |
| **Back-running** | An attacker places a transaction immediately *after* a target to capture value the target created — e.g., arbitraging a pool right after a large swap or an oracle update. |
| **Liquidation racing** | When a lending position becomes liquidatable, bots race to be the first to call the liquidation function and claim the bonus. |

### Sandwich Attack Walkthrough

1. A victim submits a swap: buy 10,000 USDC worth of token X with 1% slippage tolerance.
2. A bot watching the mempool sees the swap, calculates the maximum tolerable price impact, and front-runs it by buying token X first, pushing the price up.
3. The victim's swap executes at the inflated price — near the worst case their slippage tolerance allows.
4. The bot immediately sells token X after the victim's trade, capturing the difference as profit. The victim paid more; the pool and the bot split the loss.

## MEV on the XDC Network

XDC's architecture changes the MEV picture compared to Ethereum:

- **XDPoS consensus:** Block production is concentrated in a set of elected masternodes that create blocks in a round-robin manner (see [XDPoS Consensus](/docs/xdc-chain/xdpos)). A block proposer has full control over which transactions it includes and in what order — reordering is possible by design.
- **2-second blocks, near-zero fees:** Fast blocks shrink the window a victim's transaction sits in the mempool, and ~0.25 Gwei gas prices mean there is no meaningful priority-fee auction for bots to outbid each other with.
- **Lower observed MEV activity:** XDC does not have the mature public mempool-sniping infrastructure (searcher networks, bundle relays) seen on Ethereum, and documented MEV extraction on XDC is limited.
- **Not immune:** Lower activity is not the same as safety. Masternode operators — or anyone they collude with — can still reorder, insert, or delay transactions. As DeFi volume on XDC grows, so does the incentive to extract MEV. Design your contracts as if an adversary controls ordering, because eventually one will.

## DApp-Level Mitigations

### Slippage Tolerance

Every swap-style function must take a minimum output amount so the trade reverts instead of executing at a manipulated price:

```solidity
function swap(
    address tokenIn,
    address tokenOut,
    uint256 amountIn,
    uint256 amountOutMin,
    uint256 deadline
) external returns (uint256 amountOut) {
    require(block.timestamp <= deadline, "Transaction expired");
    amountOut = _quote(tokenIn, tokenOut, amountIn);
    require(amountOut >= amountOutMin, "Slippage exceeded");
    _executeSwap(tokenIn, tokenOut, amountIn, amountOut);
}
```

Passing `0` for `amountOutMin` or `type(uint256).max` for `deadline` defeats both protections — never let your UI default to them.

### Deadlines

A `deadline` parameter bounds how long a transaction stays valid. A transaction stuck pending cannot be re-executed hours later at a stale, manipulable price.

### Commit-Reveal Schemes

For auctions, token sales, or any first-come-first-served logic, hide the intent until ordering no longer matters. Users first commit a hash, then reveal after the commit window closes:

```solidity
mapping(address => bytes32) public commitments;

function commit(bytes32 hash) external {
    commitments[msg.sender] = hash;
}

function reveal(uint256 bidAmount, bytes32 salt) external {
    require(
        commitments[msg.sender] == keccak256(abi.encodePacked(bidAmount, salt)),
        "Invalid reveal"
    );
    delete commitments[msg.sender];
    _processBid(msg.sender, bidAmount);
}
```

A front-runner sees only the hash — copying it is useless without the preimage.

### Batch Auctions

Instead of executing orders in mempool order, collect orders over a window and settle them all at one uniform clearing price. With no ordering advantage inside the batch, sandwiching is eliminated by construction.

### Private Transaction Relays

On Ethereum, Flashbots-style private relays let users send transactions directly to block producers, bypassing the public mempool entirely. No documented equivalent exists on XDC today — but it is a category to watch, and for high-value flows you can negotiate direct submission with masternode operators as a manual analogue.

## Contract Design Principles

- **Avoid ordering-dependent logic:** If calling your function first versus last changes who profits, someone will pay to control that ordering. First-come-first-served mints, `initialize()` functions, and unprotected liquidations are all targets.
- **Use TWAP prices, not spot prices:** A spot price read from a pool can be moved by a single sandwich. A time-weighted average price over multiple blocks costs far more to manipulate. See the [Oracles guide](/docs/smart-contracts/oracles) for feed options on XDC.
- **Anti-sandwich parameters:** Cap per-transaction trade size, enforce minimum holding windows, or add fees on same-block buy-then-sell round trips so the attacker's exit leg is unprofitable.
- **Rate-limit sensitive state changes:** Oracle updates, fee changes, and liquidation thresholds should move gradually, not in a single transaction.

## User-Level Protections

- **Set tight slippage:** Default 0.5% or lower for stable pairs. Wide slippage (5%+) is an open invitation to sandwich bots — it defines exactly how much they can extract.
- **Split large trades:** One large swap moves the pool visibly; several smaller ones move it less and give attackers less margin to work with.
- **Don't leave transactions pending:** XDC's 2-second blocks make this rare, but a stuck transaction is stale-price exposure. Replace or cancel it promptly.

## Validator & Node-Level Considerations

Honesty note: masternode operators on XDC control transaction ordering for the blocks they produce and are technically capable of extracting MEV — inserting their own transactions, reordering for profit, or selling that ordering right. The mitigation today is economic and reputational rather than technical: masternodes are known, KYC'd, staked entities whose block production is publicly observable. Operators and community members should monitor block contents for suspicious ordering patterns — see [Node Operator Monitoring](/docs/xdc-chain/developers/node-operators/monitoring) — and slashing/governance pressure provides accountability for provable misbehavior.

## Testing for MEV Resistance

Don't assume your protections work — attack your own contracts:

- **Fork-based adversarial simulation:** Fork Apothem or mainnet state locally with Hardhat or Foundry, then script an attacker that inserts transactions before and after a victim swap. Assert the victim's received amount never falls below the configured slippage floor.
- **Fuzz the ordering:** Randomize transaction order across multiple callers and assert invariants (total value, per-user minimums) hold regardless of sequence.
- **Test edge parameters:** Verify that `amountOutMin = 0` and expired deadlines behave the way your docs claim.

The [Smart Contract Testing Guide](/docs/smart-contracts/testing-guide) covers Hardhat and Foundry setup on XDC, including forking and fuzz configuration.

## See Also

- [Security Best Practices](/docs/smart-contracts/security-best-practices) — broader vulnerability classes and the pre-deployment audit checklist
- [DeFi Integration](/docs/smart-contracts/defi-integration) — swap routing, liquidity, and slippage handling in practice
- [Gas & Fees on XDC Network](/docs/learn/gas-fees) — why XDC's fee model changes the MEV economics
- [XDPoS Consensus](/docs/xdc-chain/xdpos) — how masternodes produce and order blocks
