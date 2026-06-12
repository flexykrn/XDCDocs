---
title: Automation — Chainlink Keepers and Scheduled Tasks on XDC
description: Chainlink Keepers integration for XDC — automate smart contract execution with scheduled and conditional triggers.
---

# Automation (Keepers)

Chainlink Keepers (now Automation) enables smart contracts to be executed automatically based on time or custom conditions.

## Why Automation?

Smart contracts cannot self-execute. They require:
- **External triggers** to run functions
- **Scheduled execution** for recurring tasks
- **Conditional logic** for complex workflows

Keepers solve this by providing:
- **Decentralized execution** network
- **Custom conditions** via `checkUpkeep`
- **Gas-efficient** execution
- **Reliable** uptime

## Basic Implementation

### Time-Based Execution

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface KeeperCompatibleInterface {
    function checkUpkeep(bytes calldata checkData) external returns (bool upkeepNeeded, bytes memory performData);
    function performUpkeep(bytes calldata performData) external;
}

contract AutomatedHarvest is KeeperCompatibleInterface {
    uint256 public lastHarvestTime;
    uint256 public harvestInterval = 24 hours;
    
    event Harvested(uint256 timestamp, uint256 amount);
    
    function checkUpkeep(bytes calldata) external view override returns (bool upkeepNeeded, bytes memory) {
        upkeepNeeded = (block.timestamp - lastHarvestTime) >= harvestInterval;
        return (upkeepNeeded, "");
    }
    
    function performUpkeep(bytes calldata) external override {
        require((block.timestamp - lastHarvestTime) >= harvestInterval, "Too soon");
        
        uint256 amount = _harvest();
        lastHarvestTime = block.timestamp;
        
        emit Harvested(block.timestamp, amount);
    }
    
    function _harvest() internal returns (uint256) {
        // Implementation specific
        return 0;
    }
}
```

### Conditional Execution

```solidity
contract AutomatedLiquidation is KeeperCompatibleInterface {
    address[] public borrowers;
    mapping(address => uint256) public healthFactors;
    
    function checkUpkeep(bytes calldata) external view override returns (bool upkeepNeeded, bytes memory performData) {
        address[] memory liquidatable = new address[](borrowers.length);
        uint256 count = 0;
        
        for (uint256 i = 0; i < borrowers.length; i++) {
            if (healthFactors[borrowers[i]] < 1e18) {
                liquidatable[count] = borrowers[i];
                count++;
            }
        }
        
        upkeepNeeded = count > 0;
        performData = abi.encode(liquidatable, count);
        
        return (upkeepNeeded, performData);
    }
    
    function performUpkeep(bytes calldata performData) external override {
        (address[] memory liquidatable, uint256 count) = abi.decode(performData, (address[], uint256));
        
        for (uint256 i = 0; i < count; i++) {
            _liquidate(liquidatable[i]);
        }
    }
    
    function _liquidate(address borrower) internal {
        // Implementation
    }
}
```

## Advanced Patterns

### Dynamic Intervals

```solidity
contract DynamicKeeper is KeeperCompatibleInterface {
    uint256 public baseInterval = 1 hours;
    uint256 public lastUpkeep;
    uint256 public urgencyLevel; // 1-10
    
    function checkUpkeep(bytes calldata) external view override returns (bool, bytes memory) {
        uint256 interval = baseInterval / urgencyLevel;
        bool needed = (block.timestamp - lastUpkeep) >= interval;
        return (needed, "");
    }
    
    function performUpkeep(bytes calldata) external override {
        lastUpkeep = block.timestamp;
        urgencyLevel = _calculateUrgency();
    }
    
    function _calculateUrgency() internal view returns (uint256) {
        // Dynamic urgency based on market conditions
        return 5;
    }
}
```

### Batch Processing

```solidity
contract BatchProcessor is KeeperCompatibleInterface {
    uint256 public batchSize = 100;
    uint256 public currentIndex;
    address[] public queue;
    
    function checkUpkeep(bytes calldata) external view override returns (bool, bytes memory) {
        return (currentIndex < queue.length, "");
    }
    
    function performUpkeep(bytes calldata) external override {
        uint256 end = currentIndex + batchSize;
        if (end > queue.length) end = queue.length;
        
        for (uint256 i = currentIndex; i < end; i++) {
            _process(queue[i]);
        }
        
        currentIndex = end;
    }
    
    function _process(address item) internal {
        // Implementation
    }
}
```

## Security Considerations

1. **Idempotency**: `performUpkeep` should be safe to run multiple times
2. **Gas Limits**: Keep within reasonable gas bounds
3. **Access Control**: Verify caller is the keeper network
4. **State Validation**: Re-check conditions in `performUpkeep`
5. **Economic Incentives**: Ensure keeper rewards cover gas costs

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Upkeep not triggered" | checkUpkeep returns false | Verify condition logic |
| "High gas costs" | Complex performUpkeep | Optimize batch size |
| "Failed execution" | Insufficient gas | Increase gas limit |
| "Stale state" | Race condition | Re-validate in performUpkeep |
