---
title: Oracle Best Practices — Security and Reliability on XDC
description: Oracle best practices for XDC — stale price handling, circuit breakers, multi-oracle aggregation, and security considerations.
---

# Oracle Best Practices

## Stale Price Handling

Always check price freshness:

```solidity
contract SafePriceConsumer {
    uint256 public constant MAX_PRICE_AGE = 1 hours;
    
    function getSafePrice(address priceFeed) public view returns (uint256) {
        (, int256 price, , uint256 updatedAt, ) = AggregatorV3Interface(priceFeed).latestRoundData();
        
        require(price > 0, "Invalid price");
        require(block.timestamp - updatedAt <= MAX_PRICE_AGE, "Stale price");
        
        return uint256(price);
    }
    
    function getSafePriceWithFallback(address primary, address fallback) 
        external view returns (uint256) 
    {
        try this.getSafePrice(primary) returns (uint256 price) {
            return price;
        } catch {
            return getSafePrice(fallback);
        }
    }
}
```

## Circuit Breakers

Pause functionality on extreme price movements:

```solidity
contract CircuitBreaker {
    uint256 public constant MAX_DEVIATION = 1000; // 10%
    uint256 public lastPrice;
    bool public paused;
    
    modifier whenNotPaused() {
        require(!paused, "Circuit breaker active");
        _;
    }
    
    function updatePrice(uint256 newPrice) external whenNotPaused {
        if (lastPrice > 0) {
            uint256 deviation = _calculateDeviation(lastPrice, newPrice);
            if (deviation > MAX_DEVIATION) {
                paused = true;
                emit CircuitBreakerTriggered(lastPrice, newPrice, deviation);
                return;
            }
        }
        
        lastPrice = newPrice;
        emit PriceUpdated(newPrice);
    }
    
    function resetCircuitBreaker() external onlyOwner {
        paused = false;
    }
    
    event CircuitBreakerTriggered(uint256 oldPrice, uint256 newPrice, uint256 deviation);
    event PriceUpdated(uint256 price);
}
```

## Multi-Oracle Aggregation

Use multiple oracles for critical operations:

```solidity
contract MultiOracleAggregator {
    address[] public oracles;
    uint256 public requiredConfirmations;
    
    function getAggregatedPrice() external view returns (uint256) {
        uint256[] memory prices = new uint256[](oracles.length);
        uint256 validCount = 0;
        
        for (uint256 i = 0; i < oracles.length; i++) {
            try AggregatorV3Interface(oracles[i]).latestRoundData() returns (
                uint80, int256 price, uint256, uint256 updatedAt, uint80
            ) {
                if (price > 0 && block.timestamp - updatedAt <= 1 hours) {
                    prices[validCount] = uint256(price);
                    validCount++;
                }
            } catch {
                continue;
            }
        }
        
        require(validCount >= requiredConfirmations, "Insufficient valid prices");
        return _median(prices, validCount);
    }
    
    function _median(uint256[] memory arr, uint256 len) internal pure returns (uint256) {
        for (uint256 i = 0; i < len; i++) {
            for (uint256 j = i + 1; j < len; j++) {
                if (arr[j] < arr[i]) {
                    uint256 temp = arr[i];
                    arr[i] = arr[j];
                    arr[j] = temp;
                }
            }
        }
        
        if (len % 2 == 0) {
            return (arr[len / 2 - 1] + arr[len / 2]) / 2;
        } else {
            return arr[len / 2];
        }
    }
}
```

## Security Considerations

1. **Oracle Manipulation**: Use TWAP, multi-oracle, or Chainlink
2. **Stale Prices**: Always check `updatedAt` timestamp
3. **Flash Loan Attacks**: Use time-weighted prices
4. **Centralization Risk**: Prefer decentralized oracles
5. **Cost Optimization**: Batch updates when possible

## Testing Procedures

1. **Price Accuracy**: Compare with centralized exchanges
2. **Update Frequency**: Verify heartbeat and deviation triggers
3. **Stale Price Handling**: Test with outdated prices
4. **Circuit Breakers**: Test extreme price movements
5. **Multi-Oracle**: Verify aggregation logic
6. **Gas Costs**: Benchmark all operations
7. **Fallback Mechanisms**: Test primary and backup oracles

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Stale price" | Oracle not updating | Check heartbeat, verify oracle health |
| "Invalid price" | Negative or zero price | Use fallback oracle, pause contract |
| "High gas costs" | Frequent updates | Increase deviation threshold |
| "VRF timeout" | Insufficient callback gas | Increase callbackGasLimit |
| "CCIP failed" | Insufficient fees | Calculate and send correct fees |
| "Custom oracle stale" | Node downtime | Implement multiple nodes |
