---
title: Collateral Swaps — Change Collateral Without Closing Position on XDC
description: Collateral swap guide for XDC — flash loan collateral swaps, refinancing, and debt management.
---

# Collateral Swaps

## Flash Loan Collateral Swap

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
        IFlashLoanProvider(flashLoanProvider).flashLoan(
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

## Debt Refinancing

```solidity
contract DebtRefinancing {
    address public oldLendingPool;
    address public newLendingPool;
    address public flashLoanProvider;
    
    function refinance(
        address debtToken,
        address collateralToken,
        uint256 debtAmount
    ) external {
        // Flash loan to repay old debt
        IFlashLoanProvider(flashLoanProvider).flashLoan(
            debtToken,
            debtAmount,
            abi.encode(debtToken, collateralToken, debtAmount)
        );
    }
    
    function onFlashLoan(
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external {
        (address debtToken, address collateralToken, uint256 debtAmount) = 
            abi.decode(data, (address, address, uint256));
        
        // Repay old debt
        IERC20(debtToken).approve(oldLendingPool, amount);
        ILendingPool(oldLendingPool).repay(debtToken, amount, address(this));
        
        // Withdraw collateral from old pool
        ILendingPool(oldLendingPool).withdraw(collateralToken, type(uint256).max, address(this));
        
        // Supply collateral to new pool
        uint256 collateralBalance = IERC20(collateralToken).balanceOf(address(this));
        IERC20(collateralToken).approve(newLendingPool, collateralBalance);
        ILendingPool(newLendingPool).supply(collateralToken, collateralBalance, address(this), 0);
        
        // Borrow from new pool
        ILendingPool(newLendingPool).borrow(debtToken, debtAmount, 2, 0, address(this));
        
        // Repay flash loan
        uint256 amountOwed = amount + fee;
        IERC20(token).transfer(msg.sender, amountOwed);
    }
}
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Swap failed" | Insufficient liquidity | Use larger flash loan |
| "High slippage" | Large swap | Split into smaller swaps |
| "Gas too high" | Multiple operations | Optimize contract |
| "Refinancing unprofitable" | Higher rates | Compare rates first |

## Next Steps

- [Aave Integration →](./aave-integration.md) — Flash loan contracts
- [Arbitrage Bots →](./arbitrage-bots.md) — Build arbitrage bots
- [Liquidation Strategies →](./liquidation.md) — Liquidation tools
- [Security →](./security.md) — Flash loan security
