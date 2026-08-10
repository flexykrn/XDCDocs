---
title: Flash Loans
sidebar_position: 24
description: Understand flash loans on the XDC Network — how atomic uncollateralized loans work, the ERC-3156 lender and borrower patterns, arbitrage and liquidation strategies, and how to defend your protocol against flash-loan attacks.
---

# Flash Loans: Arbitrage, Liquidation, and DeFi Strategies on XDC

Flash loans let anyone borrow unlimited liquidity with zero collateral — as long as the loan is repaid within the same transaction. They power arbitrage, liquidations, and collateral refinancing across DeFi, and they are also the weapon behind many famous exploits. This page explains the mechanics, shows the ERC-3156 lender and borrower patterns, and covers both legitimate strategies and the defenses your own contracts need.

## What Is a Flash Loan?

A flash loan is an **uncollateralized loan that must be borrowed and repaid inside a single blockchain transaction**. The lender transfers funds to the borrower, the borrower runs arbitrary logic, and then the borrower repays the principal plus a fee — all in one atomic transaction.

- **Atomicity:** If the repayment check fails, the whole transaction reverts. State rolls back, so from the chain's perspective the loan never happened. The lender never carries default risk.
- **Fee model:** Lenders typically charge a small percentage (e.g., 0.05–0.09% on Ethereum protocols). The borrower only proceeds if the strategy's profit exceeds fee plus gas.
- **No capital required:** The borrower's only cost is gas and the fee. Strategies that previously needed large treasuries become accessible to anyone who can deploy a contract.

## Mechanics: Borrow → Use → Repay

Every flash loan follows the same sequence inside one transaction:

1. Borrower contract calls `flashLoan(amount)` on the lender.
2. Lender transfers `amount` of the token to the borrower.
3. Lender calls back into the borrower (`onFlashLoan`).
4. Borrower executes its strategy — swaps, liquidations, repayments.
5. Callback returns; lender checks it received back `amount + fee` (via transfer or allowance).
6. If the check fails, the lender reverts — unwinding steps 2–5.

Because everything happens in one transaction, the lender's pool is never at risk: either the repayment check passes and the lender earns the fee, or nothing happened at all.

## Building a Flash Loan Source: ERC-3156

**ERC-3156** is the standard interface for flash lenders. If you are deploying a lending pool or AMM on XDC, implementing it makes your liquidity available to flash borrowers with a single, well-known entry point:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC3156FlashBorrower {
    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external returns (bytes32);
}

interface IERC3156FlashLender {
    function maxFlashLoan(address token) external view returns (uint256);
    function flashFee(address token, uint256 amount) external view returns (uint256);
    function flashLoan(
        IERC3156FlashBorrower receiver,
        address token,
        uint256 amount,
        bytes calldata data
    ) external returns (bool);
}
```

A minimal lender transfers funds, invokes the callback, and enforces repayment by comparing balances:

```solidity
contract SimpleFlashLender is IERC3156FlashLender {
    bytes32 public constant CALLBACK_SUCCESS =
        keccak256("ERC3156FlashBorrower.onFlashLoan");
    uint256 public constant FEE_BPS = 5; // 0.05%

    mapping(address => uint256) public poolBalance;

    function maxFlashLoan(address token) external view returns (uint256) {
        return poolBalance[token];
    }

    function flashFee(address, uint256 amount) external pure returns (uint256) {
        return (amount * FEE_BPS) / 10_000;
    }

    function flashLoan(
        IERC3156FlashBorrower receiver,
        address token,
        uint256 amount,
        bytes calldata data
    ) external returns (bool) {
        require(amount <= poolBalance[token], "insufficient liquidity");
        uint256 fee = (amount * FEE_BPS) / 10_000;
        uint256 balanceBefore = IERC20(token).balanceOf(address(this));

        IERC20(token).transfer(address(receiver), amount);
        require(
            receiver.onFlashLoan(msg.sender, token, amount, fee, data) ==
                CALLBACK_SUCCESS,
            "invalid callback"
        );
        require(
            IERC20(token).balanceOf(address(this)) >= balanceBefore + fee,
            "repayment shortfall"
        );
        poolBalance[token] += fee;
        return true;
    }
}
```

In production, add reentrancy protection and only lend tokens your pool actually custodies — see [Security Best Practices & Audit Checklist](/docs/smart-contracts/security-best-practices).

## Borrower Side: The Receiver Contract

The borrower implements `onFlashLoan`, where the strategy runs. It must approve the lender to pull back `amount + fee` (or repay directly) and return the magic value:

```solidity
contract FlashStrategy is IERC3156FlashBorrower {
    bytes32 private constant CALLBACK_SUCCESS =
        keccak256("ERC3156FlashBorrower.onFlashLoan");
    address public immutable lender;

    constructor(address _lender) {
        lender = _lender;
    }

    function execute(address token, uint256 amount, bytes calldata data) external {
        IERC3156FlashLender(lender).flashLoan(this, token, amount, data);
    }

    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external returns (bytes32) {
        require(msg.sender == lender, "untrusted lender");
        require(initiator == address(this), "untrusted initiator");

        // --- strategy logic goes here ---
        // e.g., swap on DEX A, swap back on DEX B,
        // leaving amount + fee + profit in this contract.

        IERC20(token).approve(lender, amount + fee);
        return CALLBACK_SUCCESS;
    }
}
```

Key details: verify `msg.sender` is your trusted lender (anyone can call `onFlashLoan`), and make sure the strategy always ends holding at least `amount + fee`, or the lender's repayment check reverts everything.

## Common Strategies (Educational)

These patterns explain why flash loans exist. They are competitive, MEV-style activities — actual profitability requires infrastructure, monitoring, and usually gets competed away.

- **Arbitrage between two AMMs:** If token X trades cheaper on DEX A than DEX B, borrow X's pair asset, buy X on A, sell on B, repay the loan, keep the spread. Profit = `(priceB − priceA) × amount − fee − gas`.
- **Collateral swap:** A user with a lending position in collateral A but wanting collateral B flash-borrows to repay the debt, withdraws A, swaps A→B, redeposits B, and re-borrows to repay the flash loan — rebalancing a position in one transaction without closing it.
- **Self-liquidation:** When a position nears liquidation, the owner flash-borrows the debt asset, repays the loan, withdraws collateral, sells enough to cover the flash loan, and keeps the remainder — avoiding the liquidation penalty a third-party liquidator would take.
- **Refinancing:** Move debt from a high-rate lending protocol to a low-rate one: flash-borrow, repay protocol A, withdraw collateral, deposit into protocol B, borrow from B, repay the flash loan.

## Liquidation Bot Pattern

Lending protocols (see the lending concepts in the [DeFi Integration Guide](/docs/smart-contracts/defi-integration)) allow anyone to liquidate undercollateralized positions in exchange for discounted collateral — the **liquidation bonus**. A flash-loan liquidation bot works like this:

1. Monitor health factors off-chain (or via subgraph/events) for positions approaching `healthFactor < 1`.
2. When one crosses the threshold, flash-borrow the debt asset.
3. Call the lending protocol's `liquidate` function: repay part of the debt, receive discounted collateral.
4. Swap the collateral back to the debt asset on a DEX.
5. Repay the flash loan plus fee; the remainder (the liquidation bonus minus fees and gas) is profit.

Flash loans remove the capital barrier — the bot needs no inventory, only gas. XDC's 0.25 Gwei gas price and 2-second finality make small-margin liquidations viable that would be uneconomical on high-fee chains.

## Flash Loan Status on XDC

This documentation does not currently catalog a major deployed flash-loan liquidity source on XDC mainnet — there is no documented Aave- or dYdX-style pool offering flash loans, and the [DeFi ecosystem page](/docs/ecosystem/platforms/defi) is still a stub. Treat this page as a **pattern guide for protocol builders**: if you deploy a lending market or AMM on XDC, implementing ERC-3156 (above) makes your pool a flash-loan source from day one. XDC's fee model is favorable for the strategy side too — at 0.25 Gwei standard gas (see [Gas & Fees](/docs/learn/gas-fees)), even thin-margin arbitrage and liquidations remain profitable at sizes that would not clear gas costs elsewhere.

## Security: Flash-Loan Attacks and Defenses

Flash loans are also the classic attack amplifier — they give an attacker enormous temporary capital for a single transaction. The most common pattern is **oracle manipulation**: an attacker flash-borrows a large sum, skews an AMM pool's price, triggers logic in a victim protocol that reads that pool as its price source (over-borrowing, unfair liquidations, mispriced mints), then unwinds and repays — all in one transaction.

Defending *your* protocol:

- **Never price from a single AMM's spot reserves.** Use a TWAP or a dedicated oracle — see the [Oracles guide](/docs/smart-contracts/oracles) and the pricing section of the [DeFi Integration Guide](/docs/smart-contracts/defi-integration).
- **Guard against reentrancy.** Flash loans call back into arbitrary code; apply checks-effects-interactions and `nonReentrant` where state changes span external calls — worked examples in [Security Best Practices](/docs/smart-contracts/security-best-practices).
- **Sample state across blocks.** Any critical value (prices, exchange rates, totalSupply-based accounting) that can be moved within one transaction should be averaged or snapshotted across blocks.
- **Assume unlimited attacker capital.** If your invariant only holds "because nobody would have that much money," it does not hold.

## Testing Flash Loan Strategies

Simulate strategies before deploying: fork Apothem (or mainnet state) with Hardhat or Foundry, deploy the lender and your receiver contract, and assert that the full borrow → strategy → repay cycle either profits or reverts cleanly. The [Smart Contract Testing Guide](/docs/smart-contracts/testing-guide) covers fork configuration and Apothem rehearsal. Test the failure path too — a strategy that cannot repay must revert atomically, leaving no partial state.

## See Also

- [DeFi Integration Guide](/docs/smart-contracts/defi-integration) — AMM swaps, liquidity, and lending patterns on XDC.
- [Security Best Practices & Audit Checklist](/docs/smart-contracts/security-best-practices) — reentrancy, oracle manipulation, and pre-deployment checks.
- [Oracles](/docs/smart-contracts/oracles) — manipulation-resistant price feeds for lending and settlement.
- [Smart Contract Testing Guide](/docs/smart-contracts/testing-guide) — fork testing and Apothem deployment.
- [Gas & Fees](/docs/learn/gas-fees) — XDC's fee model and per-operation costs.
