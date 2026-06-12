---
title: Custom Oracles — Build Your Own Oracle on XDC
description: Custom oracle implementation guide for XDC — build self-hosted oracles for specific data needs.
---

# Custom Oracles

When existing oracle solutions don't meet your needs, build a custom oracle tailored to your specific requirements.

## When to Build Custom

| Scenario | Solution |
|----------|----------|
| Proprietary data | Build custom oracle |
| Specific API | Custom adapter |
| Cost optimization | Self-hosted nodes |
| Rapid prototyping | Quick custom setup |
| Internal data | Private oracle network |

## Architecture

```
Data Source → Oracle Node → Smart Contract
```

Components:
- **Data Source**: API, database, IoT device
- **Oracle Node**: Off-chain service fetching and signing data
- **Smart Contract**: On-chain verification and storage

## Basic Implementation

### Smart Contract

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract CustomOracle is AccessControl {
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    
    struct DataPoint {
        uint256 value;
        uint256 timestamp;
        address provider;
    }
    
    mapping(bytes32 => DataPoint) public data;
    mapping(bytes32 => uint256) public deviationThreshold;
    mapping(bytes32 => uint256) public heartbeat;
    
    event DataUpdated(bytes32 indexed key, uint256 value, uint256 timestamp, address provider);
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ORACLE_ROLE, msg.sender);
    }
    
    function updateData(bytes32 key, uint256 value) external onlyRole(ORACLE_ROLE) {
        DataPoint storage current = data[key];
        
        if (current.value > 0) {
            uint256 deviation = _calculateDeviation(current.value, value);
            require(deviation >= deviationThreshold[key], "Deviation too small");
        }
        
        require(
            block.timestamp >= current.timestamp + heartbeat[key],
            "Heartbeat not reached"
        );
        
        data[key] = DataPoint({
            value: value,
            timestamp: block.timestamp,
            provider: msg.sender
        });
        
        emit DataUpdated(key, value, block.timestamp, msg.sender);
    }
    
    function getData(bytes32 key) external view returns (uint256 value, uint256 timestamp) {
        DataPoint memory dp = data[key];
        return (dp.value, dp.timestamp);
    }
    
    function setDeviationThreshold(bytes32 key, uint256 threshold) external onlyRole(DEFAULT_ADMIN_ROLE) {
        deviationThreshold[key] = threshold;
    }
    
    function setHeartbeat(bytes32 key, uint256 interval) external onlyRole(DEFAULT_ADMIN_ROLE) {
        heartbeat[key] = interval;
    }
    
    function _calculateDeviation(uint256 oldValue, uint256 newValue) internal pure returns (uint256) {
        if (oldValue == 0) return type(uint256).max;
        uint256 diff = newValue > oldValue ? newValue - oldValue : oldValue - newValue;
        return (diff * 10000) / oldValue;
    }
}
```

### Oracle Node (Node.js)

```javascript
const { ethers } = require('ethers');
const axios = require('axios');

class OracleNode {
    constructor(contractAddress, privateKey, rpcUrl) {
        this.provider = new ethers.JsonRpcProvider(rpcUrl);
        this.wallet = new ethers.Wallet(privateKey, this.provider);
        
        this.contract = new ethers.Contract(
            contractAddress,
            [
                'function updateData(bytes32 key, uint256 value) external',
                'function deviationThreshold(bytes32 key) external view returns (uint256)',
                'function heartbeat(bytes32 key) external view returns (uint256)',
                'function data(bytes32 key) external view returns (uint256 value, uint256 timestamp, address provider)'
            ],
            this.wallet
        );
    }
    
    async fetchData(source) {
        const response = await axios.get(source);
        return response.data;
    }
    
    async updatePrice(key, source) {
        try {
            const price = await this.fetchData(source);
            
            // Check if update is needed
            const [currentValue, lastUpdate] = await this.contract.data(key);
            const heartbeat = await this.contract.heartbeat(key);
            
            if (Date.now() / 1000 - Number(lastUpdate) < Number(heartbeat)) {
                console.log('Heartbeat not reached, skipping');
                return;
            }
            
            const tx = await this.contract.updateData(key, ethers.parseUnits(price.toString(), 8));
            await tx.wait();
            
            console.log(`Updated ${key}: ${price}`);
        } catch (error) {
            console.error(`Failed to update ${key}:`, error);
        }
    }
    
    start(sources, interval = 60000) {
        setInterval(() => {
            for (const [key, source] of Object.entries(sources)) {
                this.updatePrice(key, source);
            }
        }, interval);
    }
}

// Usage
const oracle = new OracleNode(
    '0x...', // Contract address
    '0x...', // Private key
    'https://rpc.xdc.org'
);

oracle.start({
    'XDC/USD': 'https://api.example.com/price/xdc',
    'ETH/USD': 'https://api.example.com/price/eth'
});
```

## Multi-Node Consensus

```solidity
contract ConsensusOracle is AccessControl {
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    uint256 public constant MIN_NODES = 3;
    
    struct Submission {
        uint256 value;
        uint256 timestamp;
    }
    
    mapping(bytes32 => mapping(address => Submission)) public submissions;
    mapping(bytes32 => address[]) public nodes;
    mapping(bytes32 => uint256) public consensusValues;
    
    function submitData(bytes32 key, uint256 value) external onlyRole(ORACLE_ROLE) {
        submissions[key][msg.sender] = Submission(value, block.timestamp);
        
        if (!_isNodeSubmitted(key, msg.sender)) {
            nodes[key].push(msg.sender);
        }
        
        if (nodes[key].length >= MIN_NODES) {
            _reachConsensus(key);
        }
    }
    
    function _reachConsensus(bytes32 key) internal {
        uint256[] memory values = new uint256[](nodes[key].length);
        for (uint256 i = 0; i < nodes[key].length; i++) {
            values[i] = submissions[key][nodes[key][i]].value;
        }
        
        consensusValues[key] = _median(values);
    }
    
    function _median(uint256[] memory arr) internal pure returns (uint256) {
        // Sort and return median
        for (uint256 i = 0; i < arr.length; i++) {
            for (uint256 j = i + 1; j < arr.length; j++) {
                if (arr[j] < arr[i]) {
                    uint256 temp = arr[i];
                    arr[i] = arr[j];
                    arr[j] = temp;
                }
            }
        }
        return arr[arr.length / 2];
    }
    
    function _isNodeSubmitted(bytes32 key, node) internal view returns (bool) {
        for (uint256 i = 0; i < nodes[key].length; i++) {
            if (nodes[key][i] == node) return true;
        }
        return false;
    }
}
```

## Security Considerations

1. **Node Authentication**: Use cryptographic signatures
2. **Data Validation**: Verify source authenticity
3. **Rate Limiting**: Prevent spam
4. **Fallback Mechanisms**: Multiple data sources
5. **Monitoring**: Alert on anomalies

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Update failed" | Insufficient gas | Fund oracle wallet |
| "Stale data" | Node downtime | Implement backup nodes |
| "Wrong values" | API error | Add validation logic |
| "High costs" | Frequent updates | Optimize heartbeat |
