---
title: Liquidation Strategies — Automated Liquidation Tools on XDC
description: Liquidation guide for XDC — flash loan liquidation, self-liquidation, and monitoring tools.
---

# Liquidation Strategies

## Flash Loan Liquidation

```solidity
contract LiquidationBot {
    address public lendingPool;
    address public flashLoanProvider;
    address public owner;
    
    constructor(address _lendingPool, address _flashLoanProvider) {
        lendingPool = _lendingPool;
        flashLoanProvider = _flashLoanProvider;
        owner = msg.sender;
    }
    
    function executeLiquidation(
        address borrower,
        address debtToken,
        address collateralToken,
        uint256 debtAmount
    ) external {
        require(msg.sender == owner, "Only owner");
        
        // Flash loan to get debt tokens
        IFlashLoanProvider(flashLoanProvider).flashLoan(
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

## Self-Liquidation

```solidity
contract SelfLiquidation {
    address public lendingPool;
    
    function selfLiquidate(address debtToken, address collateralToken, uint256 debtAmount) external {
        // Flash loan to repay own debt
        IFlashLoanProvider(FLASH_LOAN).flashLoan(
            debtToken,
            debtAmount,
            abi.encode(msg.sender, debtToken, collateralToken)
        );
    }
    
    function onFlashLoan(address token, uint256 amount, uint256 fee, bytes calldata data) external {
        (address user, address debtToken, address collateralToken) = 
            abi.decode(data, (address, address, address));
        
        // Repay debt
        IERC20(debtToken).approve(lendingPool, amount);
        ILendingPool(lendingPool).repay(debtToken, amount, user);
        
        // Withdraw collateral
        ILendingPool(lendingPool).withdraw(collateralToken, type(uint256).max, address(this));
        
        // Swap collateral for debt token (if needed)
        uint256 collateralBalance = IERC20(collateralToken).balanceOf(address(this));
        // ... execute swap
        
        // Repay flash loan
        uint256 amountOwed = amount + fee;
        IERC20(token).transfer(msg.sender, amountOwed);
        
        // Return remaining to user
        uint256 remaining = IERC20(token).balanceOf(address(this));
        IERC20(token).transfer(user, remaining);
    }
}
```

## Monitoring Tools

```javascript title="scripts/liquidation-monitor.js"
const hre = require("hardhat");

class LiquidationMonitor {
    constructor(lendingPool) {
        this.lendingPool = lendingPool;
    }
    
    async scanForLiquidations() {
        const borrowers = await this.lendingPool.getAllBorrowers();
        const liquidatable = [];
        
        for (const borrower of borrowers) {
            const health = await this.lendingPool.getAccountHealth(borrower);
            if (health < 1e18) {
                const debts = await this.lendingPool.getBorrowedAssets(borrower);
                const collaterals = await this.lendingPool.getCollateralAssets(borrower);
                
                liquidatable.push({
                    borrower,
                    health: health / 1e18,
                    debts,
                    collaterals
                });
            }
        }
        
        return liquidatable;
    }
    
    async monitor(interval = 10000) {
        setInterval(async () => {
            const opportunities = await this.scanForLiquidations();
            if (opportunities.length > 0) {
                console.log(`Found ${opportunities.length} liquidatable positions`);
                // Alert or execute
            }
        }, interval);
    }
}

// Usage
const monitor = new LiquidationMonitor(lendingPool);
monitor.monitor();
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Liquidation failed" | Health factor > 1 | Verify borrower status |
| "No profit" | High collateral price | Wait for better opportunity |
| "Gas too high" | Complex collateral | Use simpler collateral |
| "Flash loan failed" | Insufficient liquidity | Use larger pool |

## Next Steps

- [Aave Integration →](./aave-integration.md) — Flash loan contracts
- [Arbitrage Bots →](./arbitrage-bots.md) — Build arbitrage bots
- [Security →](./security.md) — Flash loan security
