---
title: Price Feeds — Chainlink, Band, API3, Pyth on XDC
description: Price feed integration guide for XDC — Chainlink, Band Protocol, API3, Pyth Network, and multi-oracle aggregation.
---

# Price Feeds

Price feeds are the most common oracle use case. This guide covers integrating multiple price feed providers on XDC.

## Chainlink Price Feeds

### Basic Consumer

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface AggregatorV3Interface {
    function decimals() external view returns (uint8);
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
}

contract ChainlinkPriceConsumer {
    AggregatorV3Interface public priceFeed;
    
    constructor(address _priceFeed) {
        priceFeed = AggregatorV3Interface(_priceFeed);
    }
    
    function getLatestPrice() public view returns (int256) {
        (, int256 answer, , uint256 updatedAt, ) = priceFeed.latestRoundData();
        require(updatedAt > 0, "Round not complete");
        require(answer > 0, "Invalid price");
        return answer;
    }
    
    function getPriceWithDecimals() public view returns (uint256) {
        int256 price = getLatestPrice();
        uint8 decimals = priceFeed.decimals();
        return uint256(price) * (10 ** (18 - decimals));
    }
}
```

### Stale Price Check

```solidity
contract SafePriceConsumer {
    uint256 public constant MAX_PRICE_AGE = 1 hours;
    
    function getSafePrice(address priceFeed) public view returns (uint256) {
        (, int256 price, , uint256 updatedAt, ) = AggregatorV3Interface(priceFeed).latestRoundData();
        require(price > 0, "Invalid price");
        require(block.timestamp - updatedAt <= MAX_PRICE_AGE, "Stale price");
        return uint256(price);
    }
}
```

## Band Protocol

```solidity
interface IStdReference {
    struct ReferenceData {
        uint256 rate;
        uint256 lastUpdatedBase;
        uint256 lastUpdatedQuote;
    }
    function getReferenceData(string memory _base, string memory _quote) external view returns (ReferenceData memory);
}

contract BandPriceConsumer {
    IStdReference public bandRef;
    
    constructor(address _bandRef) {
        bandRef = IStdReference(_bandRef);
    }
    
    function getPrice(string memory base, string memory quote) external view returns (uint256 price, uint256 lastUpdated) {
        IStdReference.ReferenceData memory data = bandRef.getReferenceData(base, quote);
        return (data.rate, data.lastUpdatedBase);
    }
}
```

## API3

```solidity
interface IAPI3Proxy {
    function read() external view returns (uint224 value, uint32 timestamp);
}

contract API3PriceConsumer {
    mapping(address => address) public proxies;
    
    function setProxy(address token, address proxy) external {
        proxies[token] = proxy;
    }
    
    function getPrice(address token) external view returns (uint256 price, uint256 timestamp) {
        address proxy = proxies[token];
        require(proxy != address(0), "Proxy not set");
        (uint224 value, uint32 _timestamp) = IAPI3Proxy(proxy).read();
        return (uint256(value), uint256(_timestamp));
    }
}
```

## Pyth Network

```solidity
interface IPyth {
    struct Price {
        int64 price;
        uint64 conf;
        int32 expo;
        uint256 publishTime;
    }
    function getPrice(bytes32 id) external view returns (Price memory);
    function updatePriceFeeds(bytes[] calldata updateData) external payable;
}

contract PythPriceConsumer {
    IPyth public pyth;
    mapping(bytes32 => bytes32) public priceIds;
    
    constructor(address _pyth) {
        pyth = IPyth(_pyth);
    }
    
    function getPrice(bytes32 asset) external view returns (int64 price, uint64 conf, int32 expo) {
        bytes32 priceId = priceIds[asset];
        require(priceId != bytes32(0), "Price ID not set");
        IPyth.Price memory p = pyth.getPrice(priceId);
        return (p.price, p.conf, p.expo);
    }
    
    function updateAndGetPrice(bytes32 asset, bytes[] calldata updateData) external payable returns (int64 price, uint64 conf, int32 expo) {
        pyth.updatePriceFeeds{value: msg.value}(updateData);
        return this.getPrice(asset);
    }
}
```

## Multi-Oracle Aggregation

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

## Contract Addresses

### XDC Mainnet

| Oracle | Contract | Address | Status |
|--------|----------|---------|--------|
| Chainlink XDC/USD | Price Feed | `0x...` | Pending |
| Band Protocol | StdReference | `0x...` | Pending |
| API3 | Proxy | `0x...` | Pending |
| Pyth Network | Pyth | `0x...` | Pending |

### XDC Apothem Testnet

| Oracle | Contract | Address | Status |
|--------|----------|---------|--------|
| Chainlink | Price Feed | `0x...` | Pending |
| Band Protocol | StdReference | `0x...` | Pending |

> 💡 **Note**: XDC oracle ecosystem is developing. Verify contract addresses with official documentation before deployment.

## Price Feed List

| Asset Pair | Deviation | Heartbeat | Decimals |
|------------|-----------|-----------|----------|
| XDC/USD | 0.5% | 1 hour | 8 |
| XDC/USDT | 0.5% | 1 hour | 8 |
| ETH/USD | 0.5% | 1 hour | 8 |
| BTC/USD | 0.5% | 1 hour | 8 |
