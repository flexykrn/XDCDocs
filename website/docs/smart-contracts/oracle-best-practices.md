---
title: Oracle Best Practices
sidebar_position: 36
description: Security rules for oracle consumers on XDC — staleness thresholds, decimals, circuit breakers, TWAP, flash-loan resistance, and monitoring.
---

# Oracle Best Practices

Oracle failures are among the most expensive bug classes in DeFi — stale prices, manipulated spot feeds, and decimal mismatches have each caused eight-figure losses. This page consolidates the rules that apply to every oracle integration on XDC, whether you consume a decentralized network feed or operate a custom signer.

## Verify the Deployment Before Anything Else

No first-party oracle feed addresses are published in these docs, and provider deployments vary per network. Before integrating any feed on XDC Mainnet (Chain ID `50`) or Apothem (Chain ID `51`), confirm the contract addresses in the provider's own documentation — never from a block explorer search, a community post, or a copied config from another chain. Re-verify every address when moving from Apothem to mainnet.

## Staleness Thresholds: Match the Asset

Always reject data older than a threshold — but pick the threshold deliberately:

| Asset type | Suggested staleness tolerance | Rationale |
|---|---|---|
| Stablecoin pairs (USDC/USD) | Hours to 24 h | Low volatility; feeds update on tight deviation thresholds, so long heartbeats are normal |
| Major assets (XDC/USD, ETH/USD) | Feed heartbeat + margin (e.g., 1 h) | Moderate volatility; stale data for minutes is tolerable for lending, not for perps |
| Volatile/long-tail assets | Minutes | Price can move double-digit percentages in an hour; stale data is directly exploitable |
| Pull oracles (Pyth-style) | Seconds | Updates are posted per-transaction; anything older indicates a relaying failure |

Also validate the round itself (`answeredInRound >= roundId`, `updatedAt != 0`) — see the full consumer in [Oracle Price Feeds](/docs/smart-contracts/oracle-price-feeds).

## Handle Decimals Explicitly

Feeds commonly return 8-decimal answers, tokens use 18, and some providers use 18 natively. The mistakes are always the same: hardcoding the feed's decimals (they differ across pairs and chains), and mixing scales in arithmetic.

- Read `decimals()` from the feed contract at runtime — never hardcode.
- Normalize every external value to a single internal scale (18 decimals is the convention) immediately at the boundary.
- Document the scale of every intermediate value in comments; a `price` variable with unstated decimals is a future exploit.
- When chaining conversions (XDC/USD feed → XRC20 token pair), check for overflow: multiplying two 18-decimal values needs a division by `1e18` in the same expression.

## Circuit Breakers and Pause Patterns

Feeds malfunction: answers go to zero, jump 10x between rounds, or freeze entirely. Defend the consumer, not just the reader:

```solidity
uint256 internal constant MAX_DEVIATION_BPS = 2000; // 20%
uint256 public lastAcceptedPrice;

function guardedPrice() internal returns (uint256) {
    uint256 price = getValidatedPrice(); // staleness + round checks
    if (lastAcceptedPrice != 0) {
        uint256 diff = price > lastAcceptedPrice
            ? price - lastAcceptedPrice
            : lastAcceptedPrice - price;
        require(diff * 10_000 <= lastAcceptedPrice * MAX_DEVIATION_BPS, "Circuit breaker");
    }
    lastAcceptedPrice = price;
    return price;
}
```

- Revert on zero/negative answers and on moves beyond a sanity bound between consecutive reads.
- For protocols custodying funds, wire oracle anomalies into a **pause** that halts the affected actions (borrowing, liquidations) while leaving withdrawals of unencumbered funds open — see [Security Best Practices & Audit Checklist](/docs/smart-contracts/security-best-practices).
- Decide deliberately whether a breaker trips fail-closed (revert) or fail-open (use last good price). For lending and liquidations, fail-closed is almost always correct.

## DEX Prices: TWAP, Never Spot

A single DEX pool's spot price can be moved arbitrarily within one transaction by a flash loan, and XDC pool liquidity is thinner than on larger chains, making manipulation cheaper. If you must source prices on-chain from a DEX:

- Use a **time-weighted average price (TWAP)** over a window long enough (commonly 30 minutes) that manipulating it costs more than the attack profits.
- Never use spot reserves (`getReserves` ratios) or instantaneous pool prices for lending, minting, or liquidation logic.
- Prefer decentralized oracle medians over any DEX-derived price when a feed exists.

See [DeFi Integration Patterns](/docs/smart-contracts/defi-integration) for TWAP implementation patterns and [Flash Loans](/docs/smart-contracts/flash-loans) for how single-transaction manipulation works and how protocols defend against it.

## Flash-Loan Resistance Checklist

- Oracle reads and the state changes they authorize happen in the same transaction — so any price the contract acts on must be manipulation-resistant within a single block.
- Large liquidity movements (adding/removing DEX liquidity) must not change a price your protocol consumes in the same window.
- Delay sensitive actions (liquidation bonuses, large mints) by a block or use commit-style flows when the input price is not fully manipulation-proof.

## Monitor Feeds Off-Chain

On-chain checks catch bad data at consumption time; off-chain monitoring catches problems before users do:

- Track each feed's `updatedAt` and alert when it approaches your staleness threshold — a feed that stops updating is often the first sign of provider issues or deprecation.
- Alert on round-over-round deviation beyond your circuit-breaker bound, even if the contract would have caught it.
- Compare the feed against an independent reference (a second provider, a CEX index) and alert on sustained divergence.
- For custom oracles, monitor signer and relayer uptime and the subscription/fee-token balance of any VRF or pull-oracle accounts — a depleted balance silently bricks requests.

## Plan the Oracle Upgrade Path

Feed addresses change: providers deprecate feeds, migrate versions, or launch native XDC deployments after you integrated a bridged one. Hardcoding an immutable feed address means a deprecation forces a full redeploy and migration.

- Store oracle addresses in upgradeable storage (a registry or setter guarded by governance/timelock), or behind a proxy.
- If consumers are themselves proxies, a feed swap can be an implementation upgrade — see [Upgradeable Contracts](/docs/smart-contracts/upgradeable-contracts).
- Emit events on oracle address changes and enforce a timelock, so users can exit before a new feed goes live; an instantly-swappable oracle address is an admin-key attack vector.
- Test the new feed on Apothem against the same validation logic before switching mainnet — see the [Smart Contract Testing Guide](/docs/smart-contracts/testing-guide).

## See Also

- [Oracle Integration Guide](/docs/smart-contracts/oracles) — landscape and provider verification
- [Oracle Price Feeds](/docs/smart-contracts/oracle-price-feeds) — consumer implementations with full safety checks
- [Verifiable Randomness (VRF)](/docs/smart-contracts/oracle-vrf) — secure randomness patterns
- [Custom Oracles](/docs/smart-contracts/custom-oracles) — signed-data feeds and their trust assumptions
- [Security Best Practices & Audit Checklist](/docs/smart-contracts/security-best-practices) — full pre-deployment checklist
