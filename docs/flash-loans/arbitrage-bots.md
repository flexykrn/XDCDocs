---
title: Arbitrage Bots — Build Profitable Trading Bots on XDC
description: Arbitrage bot guide for XDC — price monitoring, execution strategies, and automation.
---

# Arbitrage Bots

## Price Monitoring

```javascript title="scripts/arbitrage-monitor.js"
const hre = require("hardhat");

class ArbitrageMonitor {
    constructor(dexA, dexB, tokenA, tokenB) {
        this.dexA = dexA;
        this.dexB = dexB;
        this.tokenA = tokenA;
        this.tokenB = tokenB;
    }
    
    async checkArbitrage(amount) {
        const priceA = await this.dexA.getAmountsOut(amount, [this.tokenA, this.tokenB]);
        const priceB = await this.dexB.getAmountsOut(priceA[1], [this.tokenB, this.tokenA]);
        
        const profit = priceB[1] - amount;
        const profitPercent = (profit * 100) / amount;
        
        return {
            profitable: profit > 0,
            profit,
            profitPercent,
            path: [this.dexA, this.dexB]
        };
    }
    
    async monitor(interval = 5000) {
        setInterval(async () => {
            const opportunity = await this.checkArbitrage(hre.ethers.parseEther("1"));
            if (opportunity.profitable) {
                console.log(`Arbitrage found! Profit: ${opportunity.profitPercent}%`);
                // Execute or alert
            }
        }, interval);
    }
}

// Usage
const monitor = new ArbitrageMonitor(dexA, dexB, tokenA, tokenB);
monitor.monitor();
```

## Execution Strategy

```solidity
contract ArbitrageExecutor {
    address public owner;
    uint256 public minProfit;
    
    constructor(uint256 _minProfit) {
        owner = msg.sender;
        minProfit = _minProfit;
    }
    
    function executeArbitrage(
        address[] calldata path,
        uint256 amount,
        uint256 minReturn
    ) external {
        require(msg.sender == owner, "Only owner");
        
        // Flash loan
        IFlashLoanProvider flashLoan = IFlashLoanProvider(FLASH_LOAN_ADDRESS);
        flashLoan.flashLoan(path[0], amount, abi.encode(path, minReturn));
    }
    
    function onFlashLoan(address asset, uint256 amount, uint256 fee, bytes calldata data) external {
        (address[] memory path, uint256 minReturn) = abi.decode(data, (address[], uint256));
        
        // Execute swaps
        uint256 currentAmount = amount;
        for (uint256 i = 0; i < path.length - 1; i++) {
            currentAmount = _swap(path[i], path[i + 1], currentAmount);
        }
        
        // Verify profit
        require(currentAmount >= minReturn, "Insufficient profit");
        
        // Repay flash loan
        uint256 amountOwed = amount + fee;
        IERC20(asset).transfer(msg.sender, amountOwed);
        
        // Send profit to owner
        uint256 profit = IERC20(asset).balanceOf(address(this));
        IERC20(asset).transfer(owner, profit);
    }
    
    function _swap(address dex, address tokenIn, address tokenOut, uint256 amount) 
        internal returns (uint256) 
    {
        // DEX swap implementation
        return amount;
    }
}
```

## Gas Optimization

- **Batch operations**: Combine multiple checks
- **Efficient paths**: Minimize hops
- **Priority fees**: Use appropriate gas prices
- **Simulation**: Test before execution

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| "No profitable opportunities" | Efficient market | Monitor more pairs |
| "Transaction failed" | Gas limit | Optimize code |
| "Front-run" | MEV bots | Use private mempool |
| "Stale prices" | Node lag | Use faster RPC |

## Next Steps

- [Aave Integration →](./aave-integration.md) — Flash loan contracts
- [Liquidation Strategies →](./liquidation.md) — Liquidation tools
- [Security →](./security.md) — Flash loan security
