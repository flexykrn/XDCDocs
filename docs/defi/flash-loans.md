---
title: Flash Loans — Arbitrage, Liquidation, and Advanced DeFi Strategies on XDC
description: Flash loan guide for XDC — Aave integration, arbitrage bots, collateral swaps, and liquidation strategies.
---

# Flash Loans

Flash loans allow borrowing without collateral, provided the loan is repaid within the same transaction. This enables advanced DeFi strategies.

## How Flash Loans Work

1. **Borrow**: Request loan from flash loan provider
2. **Execute**: Perform arbitrage, liquidation, or other strategy
3. **Repay**: Return principal + fee within same transaction
4. **Revert**: If repayment fails, entire transaction reverts

## Aave Flash Loan Integration

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@aave/core-v3/contracts/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract FlashLoanArbitrage is FlashLoanSimpleReceiverBase {
    address public owner;
    
    constructor(address _addressProvider) 
        FlashLoanSimpleReceiverBase(IPoolAddressesProvider(_addressProvider)) 
    {
        owner = msg.sender;
    }
    
    function executeFlashLoan(
        address asset,
        uint256 amount,
        bytes calldata params
    ) external {
        require(msg.sender == owner, "Only owner");
        
        POOL.flashLoanSimple(
            address(this),
            asset,
            amount,
            params,
            0 // referralCode
        );
    }
    
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        require(msg.sender == address(POOL), "Invalid caller");
        require(initiator == address(this), "Invalid initiator");
        
        // Execute strategy
        _executeArbitrage(asset, amount, params);
        
        // Repay loan
        uint256 amountOwed = amount + premium;
        IERC20(asset).approve(address(POOL), amountOwed);
        
        return true;
    }
    
    function _executeArbitrage(address asset, uint256 amount, bytes calldata params) internal {
        // Decode params
        (address dexA, address dexB, address tokenOut) = abi.decode(params, (address, address, address));
        
        // Swap on DEX A
        uint256 amountOut = _swap(dexA, asset, tokenOut, amount);
        
        // Swap on DEX B
        uint256 finalAmount = _swap(dexB, tokenOut, asset, amountOut);
        
        // Profit = finalAmount - amount - premium
        require(finalAmount > amount, "Unprofitable arbitrage");
    }
    
    function _swap(address dex, address tokenIn, address tokenOut, uint256 amount) 
        internal returns (uint256) 
    {
        // DEX swap implementation
        return amount;
    }
    
    function withdraw(address asset) external {
        require(msg.sender == owner, "Only owner");
        IERC20(asset).transfer(owner, IERC20(asset).balanceOf(address(this)));
    }
}
```

## Arbitrage Bot

```javascript title="scripts/arbitrage.js"
const hre = require("hardhat");

class ArbitrageBot {
    constructor(dexA, dexB, tokenA, tokenB, minProfit) {
        this.dexA = dexA;
        this.dexB = dexB;
        this.tokenA = tokenA;
        this.tokenB = tokenB;
        this.minProfit = minProfit;
    }
    
    async checkArbitrage(amount) {
        const priceA = await this.dexA.getAmountsOut(amount, [this.tokenA, this.tokenB]);
        const priceB = await this.dexB.getAmountsOut(priceA[1], [this.tokenB, this.tokenA]);
        
        const profit = priceB[1] - amount;
        const profitPercent = (profit * 100) / amount;
        
        return {
            profitable: profit > this.minProfit,
            profit,
            profitPercent,
            path: [this.dexA, this.dexB]
        };
    }
    
    async executeArbitrage(amount, path) {
        const flashLoan = await hre.ethers.getContractAt("IFlashLoan", "FLASH_LOAN_ADDRESS");
        
        const tx = await flashLoan.flashLoan(
            this.tokenA,
            amount,
            this.encodeArbitrageData(path)
        );
        
        return await tx.wait();
    }
    
    encodeArbitrageData(path) {
        return hre.ethers.AbiCoder.defaultAbiCoder().encode(
            ['address[]', 'address[]'],
            [path, [this.tokenA, this.tokenB]]
        );
    }
}

async function runArbitrage() {
    const bot = new ArbitrageBot(dexA, dexB, tokenA, tokenB, 1000);
    
    setInterval(async () => {
        const opportunity = await bot.checkArbitrage(hre.ethers.parseEther("1"));
        if (opportunity.profitable) {
            console.log(`Arbitrage found! Profit: ${opportunity.profitPercent}%`);
            await bot.executeArbitrage(hre.ethers.parseEther("1"), opportunity.path);
        }
    }, 5000);
}
```

## Liquidation Strategy

```solidity
contract LiquidationBot {
    address public lendingPool;
    address public flashLoanProvider;
    
    function executeLiquidation(
        address borrower,
        address debtToken,
        address collateralToken,
        uint256 debtAmount
    ) external {
        // Flash loan to get debt tokens
        IFlashLoan(flashLoanProvider).flashLoan(
            debtToken,
            debtAmount,
            abi.encode(borrower, debtToken, collateralToken)
        );
    }
    
    function onFlashLoan(
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external {
        (address borrower, address debtToken, address collateralToken) = 
            abi.decode(data, (address, address, address));
        
        // Approve debt tokens for liquidation
        IERC20(debtToken).approve(lendingPool, amount);
        
        // Execute liquidation
        ILendingPool(lendingPool).liquidationCall(
            borrower,
            debtToken,
            collateralToken,
            amount,
            false
        );
        
        // Sell seized collateral (optional)
        uint256 collateralBalance = IERC20(collateralToken).balanceOf(address(this));
        // ... swap collateral for debt token
        
        // Repay flash loan
        uint256 amountOwed = amount + fee;
        IERC20(token).transfer(msg.sender, amountOwed);
        
        // Send profit to owner
        uint256 profit = IERC20(token).balanceOf(address(this));
        IERC20(token).transfer(owner, profit);
    }
}
```

## Collateral Swap

```solidity
contract CollateralSwap {
    address public lendingPool;
    address public flashLoanProvider;
    
    function swapCollateral(
        address oldCollateral,
        address newCollateral,
        uint256 amount
    ) external {
        // Flash loan new collateral
        IFlashLoan(flashLoanProvider).flashLoan(
            newCollateral,
            amount,
            abi.encode(oldCollateral, newCollateral, amount)
        );
    }
    
    function onFlashLoan(
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external {
        (address oldCollateral, address newCollateral, uint256 swapAmount) = 
            abi.decode(data, (address, address, uint256));
        
        // Supply new collateral
        IERC20(newCollateral).approve(lendingPool, amount);
        ILendingPool(lendingPool).supply(newCollateral, amount, address(this), 0);
        
        // Withdraw old collateral
        ILendingPool(lendingPool).withdraw(oldCollateral, swapAmount, address(this));
        
        // Swap old collateral for new collateral (if needed)
        uint256 oldBalance = IERC20(oldCollateral).balanceOf(address(this));
        // ... execute swap
        
        // Repay flash loan
        uint256 amountOwed = amount + fee;
        IERC20(token).transfer(msg.sender, amountOwed);
    }
}
```

## Security Considerations

1. **Reentrancy**: Use ReentrancyGuard on all external functions
2. **Price Manipulation**: Use TWAP or multi-oracle for pricing
3. **Gas Optimization**: Ensure sufficient gas for complex operations
4. **Profit Validation**: Always verify profit before executing
5. **Access Control**: Restrict flash loan execution to authorized callers

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Flash loan failed" | Insufficient repayment | Check fee calculation |
| "Unprofitable arbitrage" | Price convergence | Wait for better opportunity |
| "Liquidation failed" | Health factor > 1 | Verify borrower status |
| "High gas costs" | Complex operations | Optimize contract code |
| "Reentrancy detected" | Missing guard | Add ReentrancyGuard |

## Next Steps

- [DeFi Overview →](./index.md) — General DeFi concepts
- [DEX Integration →](./dex.md) — AMM and liquidity
- [Lending Protocols →](./lending.md) — Collateral and borrowing
- [Oracle Integration →](../oracle/index.md) — Price feeds for arbitrage
