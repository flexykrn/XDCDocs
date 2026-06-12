---
title: Aave Integration — Flash Loan Contracts on XDC
description: Aave flash loan integration for XDC — receiver interface, repayment logic, and implementation examples.
---

# Aave Integration

## Flash Loan Receiver Interface

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

## Custom Flash Loan Provider

```solidity
contract FlashLoanProvider {
    mapping(address => uint256) public fees; // Fee per token (basis points)
    
    event FlashLoan(address indexed borrower, address indexed asset, uint256 amount, uint256 fee);
    
    function flashLoan(address asset, uint256 amount, bytes calldata data) external {
        uint256 fee = (amount * fees[asset]) / 10000;
        uint256 amountOwed = amount + fee;
        
        // Transfer tokens to borrower
        IERC20(asset).transfer(msg.sender, amount);
        
        // Execute borrower's logic
        IFlashLoanReceiver(msg.sender).executeOperation(asset, amount, fee, data);
        
        // Verify repayment
        require(IERC20(asset).balanceOf(address(this)) >= amountOwed, "Repayment failed");
        
        emit FlashLoan(msg.sender, asset, amount, fee);
    }
    
    function setFee(address asset, uint256 fee) external onlyOwner {
        fees[asset] = fee;
    }
}

interface IFlashLoanReceiver {
    function executeOperation(address asset, uint256 amount, uint256 fee, bytes calldata data) external;
}
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Flash loan failed" | Insufficient repayment | Check fee calculation |
| "Invalid caller" | Wrong contract calling | Ensure only POOL calls |
| "Unprofitable arbitrage" | Price convergence | Wait for better opportunity |
| "High gas costs" | Complex operations | Optimize contract code |

## Next Steps

- [Arbitrage Bots →](./arbitrage-bots.md) — Build arbitrage bots
- [Liquidation Strategies →](./liquidation.md) — Liquidation tools
- [Security →](./security.md) — Flash loan security
