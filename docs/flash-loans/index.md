---
title: Flash Loans — Overview
description: Flash loan overview for XDC — concepts, use cases, risks, and XDC-specific considerations.
related_pages:
  - ./flash-loans/aave-integration.md
  - ./flash-loans/arbitrage-bots.md
  - ./flash-loans/liquidation.md
  - ./flash-loans/collateral-swaps.md
  - ./flash-loans/security.md
---

# Flash Loans — Overview

Flash loans allow borrowing without collateral, provided the loan is repaid within the same transaction. This enables advanced DeFi strategies.

## What Are Flash Loans

- **Uncollateralized**: No collateral required
- **Atomic**: Must be repaid in same transaction
- **Zero Risk**: If repayment fails, entire transaction reverts
- **Fee-based**: Small fee (typically 0.09%) charged

## Use Cases

| Use Case | Description | Example |
|----------|-------------|---------|
| **Arbitrage** | Profit from price differences | Buy low on DEX A, sell high on DEX B |
| **Liquidation** | Repay debt for under-collateralized loans | Flash loan to repay, seize collateral |
| **Collateral Swap** | Change collateral without closing position | Swap ETH collateral for WBTC |
| **Debt Refinancing** | Move debt to better rates | Refinance from high-rate to low-rate protocol |
| **Self-Liquidation** | Prevent liquidation by self-liquidating | Flash loan to repay own debt |

## How It Works

1. **Borrow**: Request loan from flash loan provider
2. **Execute**: Perform arbitrage, liquidation, or other strategy
3. **Repay**: Return principal + fee within same transaction
4. **Revert**: If repayment fails, entire transaction reverts

## Risks and Considerations

| Risk | Description | Mitigation |
|------|-------------|------------|
| **Reentrancy** | Recursive calls drain funds | Use ReentrancyGuard |
| **Price Manipulation** | Oracle attacks affect profits | Use TWAP, multi-oracle |
| **Gas Costs** | Complex operations may exceed gas | Optimize contract code |
| **Unprofitable** | Price convergence before execution | Monitor opportunities |
| **MEV** | Front-running by bots | Use private mempools |

## XDC-Specific Aspects

- **Low Gas Costs**: Profitable for smaller arbitrage opportunities
- **Fast Finality**: 2-second blocks enable quick execution
- **Growing Ecosystem**: Limited flash loan providers currently
- **Enterprise Focus**: Institutional-grade security

## Next Steps

- [Aave Integration →](./aave-integration.md) — Aave flash loan contracts
- [Arbitrage Bots →](./arbitrage-bots.md) — Build arbitrage bots
- [Liquidation Strategies →](./liquidation.md) — Liquidation tools
- [Collateral Swaps →](./collateral-swaps.md) — Swap collateral
- [Security →](./security.md) — Flash loan security best practices
