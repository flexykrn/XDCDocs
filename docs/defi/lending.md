---
title: Lending Protocols — Collateral, Interest Rates, and Liquidation on XDC
description: Lending protocol integration guide for XDC — collateral mechanics, interest rate models, and liquidation processes.
---

# Lending Protocols

## Collateral Mechanics

Over-collateralized lending:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract SimpleLending is ReentrancyGuard {
    struct Market {
        IERC20 token;
        uint256 totalSupply;
        uint256 totalBorrows;
        uint256 supplyRate;
        uint256 borrowRate;
        uint256 collateralFactor;
    }
    
    struct UserAccount {
        uint256 supplied;
        uint256 borrowed;
        uint256 lastUpdate;
    }
    
    mapping(address => Market) public markets;
    mapping(address => mapping(address => UserAccount)) public accounts;
    
    uint256 public constant LIQUIDATION_INCENTIVE = 500;
    uint256 public constant LIQUIDATION_THRESHOLD = 8000;
    
    event Supply(address indexed user, address indexed token, uint256 amount);
    event Borrow(address indexed user, address indexed token, uint256 amount);
    event Repay(address indexed user, address indexed token, uint256 amount);
    event Withdraw(address indexed user, address indexed token, uint256 amount);
    event Liquidate(address indexed liquidator, address indexed borrower, address indexed token, uint256 amount);
    
    function supply(address token, uint256 amount) external nonReentrant {
        Market storage market = markets[token];
        require(address(market.token) != address(0), "Market not listed");
        
        UserAccount storage account = accounts[msg.sender][token];
        _accrueInterest(account, market);
        
        market.token.transferFrom(msg.sender, address(this), amount);
        account.supplied += amount;
        market.totalSupply += amount;
        
        emit Supply(msg.sender, token, amount);
    }
    
    function borrow(address token, uint256 amount) external nonReentrant {
        Market storage market = markets[token];
        require(address(market.token) != address(0), "Market not listed");
        
        UserAccount storage account = accounts[msg.sender][token];
        _accrueInterest(account, market);
        
        require(_isHealthy(msg.sender, token, amount), "Insufficient collateral");
        
        account.borrowed += amount;
        market.totalBorrows += amount;
        market.token.transfer(msg.sender, amount);
        
        emit Borrow(msg.sender, token, amount);
    }
    
    function repay(address token, uint256 amount) external nonReentrant {
        Market storage market = markets[token];
        UserAccount storage account = accounts[msg.sender][token];
        
        _accrueInterest(account, market);
        
        uint256 repayAmount = amount > account.borrowed ? account.borrowed : amount;
        account.borrowed -= repayAmount;
        market.totalBorrows -= repayAmount;
        market.token.transferFrom(msg.sender, address(this), repayAmount);
        
        emit Repay(msg.sender, token, repayAmount);
    }
    
    function _accrueInterest(UserAccount storage account, Market storage market) internal {
        uint256 timeElapsed = block.timestamp - account.lastUpdate;
        if (timeElapsed > 0) {
            account.borrowed += (account.borrowed * market.borrowRate * timeElapsed) / (365 days * 10000);
            account.supplied += (account.supplied * market.supplyRate * timeElapsed) / (365 days * 10000);
            account.lastUpdate = block.timestamp;
        }
    }
    
    function _isHealthy(address user, address token, uint256 newBorrow) internal view returns (bool) {
        return true;
    }
}
```

## Interest Rate Models

Variable interest rate based on utilization:

```solidity
contract InterestRateModel {
    uint256 public constant BASE_RATE = 200;
    uint256 public constant MULTIPLIER = 1000;
    
    function getBorrowRate(uint256 cash, uint256 borrows) public pure returns (uint256) {
        uint256 utilization = _getUtilization(cash, borrows);
        return BASE_RATE + (utilization * MULTIPLIER) / 1e18;
    }
    
    function getSupplyRate(uint256 cash, uint256 borrows, uint256 reserveFactor) 
        public pure returns (uint256) 
    {
        uint256 borrowRate = getBorrowRate(cash, borrows);
        uint256 utilization = _getUtilization(cash, borrows);
        return (borrowRate * utilization * (10000 - reserveFactor)) / 1e18 / 10000;
    }
    
    function _getUtilization(uint256 cash, uint256 borrows) internal pure returns (uint256) {
        if (borrows == 0) return 0;
        return (borrows * 1e18) / (cash + borrows);
    }
}
```

## Liquidation Process

```javascript title="scripts/liquidate.js"
const hre = require("hardhat");

async function liquidate(borrower, collateralToken, debtToken, repayAmount) {
    const [liquidator] = await hre.ethers.getSigners();
    
    const lendingPool = await hre.ethers.getContractAt("ILendingPool", "POOL_ADDRESS");
    const debtContract = await hre.ethers.getContractAt("IERC20", debtToken);
    
    await debtContract.approve(lendingPool.address, repayAmount);
    
    const tx = await lendingPool.liquidationCall(
        borrower,
        debtToken,
        collateralToken,
        repayAmount,
        false
    );
    
    const receipt = await tx.wait();
    console.log(`Liquidation complete! TX: ${receipt.hash}`);
    
    const collateralReceived = await lendingPool.getCollateralBalance(borrower, collateralToken);
    console.log(`Collateral seized: ${hre.ethers.formatEther(collateralReceived)}`);
}

async function scanForLiquidations() {
    const lendingPool = await hre.ethers.getContractAt("ILendingPool", "POOL_ADDRESS");
    const borrowers = await lendingPool.getAllBorrowers();
    
    for (const borrower of borrowers) {
        const health = await lendingPool.getAccountHealth(borrower);
        if (health < 1e18) {
            console.log(`Liquidatable: ${borrower}, Health: ${health / 1e18}`);
        }
    }
}
```

## Risk Parameters

| Parameter | Typical Value | Description |
|-----------|--------------|-------------|
| **Collateral Factor** | 75% | Max borrow vs collateral |
| **Liquidation Threshold** | 80% | Health factor for liquidation |
| **Liquidation Incentive** | 5% | Bonus for liquidators |
| **Reserve Factor** | 10% | Protocol revenue share |
| **Borrow Cap** | Variable | Max borrow per asset |
| **Supply Cap** | Variable | Max supply per asset |

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Insufficient collateral" | Borrow limit reached | Repay some debt or supply more collateral |
| "Liquidation failed" | Health factor > 1 | Wait for price movement |
| "Interest not accruing" | Missing update | Call accrueInterest |
| "Cannot withdraw" | Borrowed amount active | Repay borrowed funds first |
