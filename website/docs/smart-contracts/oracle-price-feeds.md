---
title: Oracle Price Feeds
sidebar_position: 33
description: Reading oracle price feeds on XDC — AggregatorV3Interface safety checks, multi-provider patterns (Band, API3, Pyth), and median aggregation.
---

# Oracle Price Feeds

Price feeds are the most common oracle integration: lending protocols, stablecoins, and DEX tooling all need asset prices on-chain. This page covers the standard aggregator consumer with full safety checks, alternative provider interfaces, pull-oracle patterns, and combining multiple feeds with median aggregation.

:::warning Verify provider deployments first
The XDC documentation does not document a Chainlink, Band, API3, or Pyth deployment with published feed addresses on XDC Mainnet (Chain ID `50`) or Apothem Testnet (Chain ID `51`). Every address on this page is a placeholder. Before integrating, confirm with your chosen provider that they operate on XDC and obtain official contract addresses from the provider's own documentation.
:::

## AggregatorV3Interface Consumer (Push Pattern)

The de-facto standard for push-based feeds is `AggregatorV3Interface`. The oracle network writes new rounds on a schedule or when the price deviates past a threshold; your contract reads the latest round. A production consumer must validate the answer, the round, and freshness — never trust `latestRoundData()` blindly.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

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

contract SafePriceConsumer {
    // Placeholder — replace with the provider's published XDC feed address.
    AggregatorV3Interface internal constant FEED =
        AggregatorV3Interface(0x0000000000000000000000000000000000000000);

    uint256 internal constant MAX_STALENESS = 1 hours;

    /// @notice Returns the price normalized to 18 decimals.
    function getPrice() public view returns (uint256) {
        (
            uint80 roundId,
            int256 answer,
            ,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = FEED.latestRoundData();

        require(answer > 0, "Invalid price");
        require(answeredInRound >= roundId, "Incomplete round");
        require(updatedAt != 0, "Round not complete");
        require(block.timestamp - updatedAt <= MAX_STALENESS, "Stale price");

        // Normalize: feed decimals (commonly 8) -> 18 decimals.
        uint8 feedDecimals = FEED.decimals();
        uint256 price = uint256(answer);
        if (feedDecimals < 18) {
            price *= 10 ** (18 - feedDecimals);
        } else if (feedDecimals > 18) {
            price /= 10 ** (feedDecimals - 18);
        }
        return price;
    }
}
```

Key points:

- **`decimals()`:** Feeds typically scale answers by 8 decimals. Read `decimals()` from the feed at runtime — never hardcode it — and normalize to a single scale (18 decimals is the common convention) before combining with token amounts.
- **`updatedAt`:** Tells you when the answer was last written. Revert if older than your staleness threshold; pick the threshold per feed heartbeat, not arbitrarily.
- **`answeredInRound >= roundId`:** Rejects answers from rounds that were never fully completed by the oracle network.
- **Negative/zero answers:** A malfunctioning or discontinued feed can return non-positive values. Reject them explicitly.

## Alternative Provider Interfaces

Different oracle providers expose different read interfaces. All work identically on XDC because the network is fully EVM-compatible — only addresses and (sometimes) fee tokens differ.

### Band Protocol (IStdReference)

Band exposes a single reference contract that serves many pairs by symbol:

```solidity
interface IStdReference {
    struct ReferenceData {
        uint256 rate;        // price scaled by 1e18
        uint256 lastUpdatedBase;
        uint256 lastUpdatedQuote;
    }
    function getReferenceData(string memory base, string memory quote)
        external view returns (ReferenceData memory);
}

contract BandConsumer {
    // Placeholder — replace with Band's published XDC StdReference address.
    IStdReference internal constant REF =
        IStdReference(0x0000000000000000000000000000000000000000);

    uint256 internal constant MAX_STALENESS = 1 hours;

    function getXdcUsdPrice() external view returns (uint256) {
        IStdReference.ReferenceData memory data = REF.getReferenceData("XDC", "USD");
        require(data.rate > 0, "Invalid rate");
        require(block.timestamp - data.lastUpdatedBase <= MAX_STALENESS, "Stale");
        return data.rate; // already 18 decimals
    }
}
```

### API3 (dAPI Proxy)

API3 data feeds are read through a proxy exposing an aggregator-like interface:

```solidity
interface IApi3Proxy {
    function read() external view returns (int224 value, uint32 timestamp);
}

contract Api3Consumer {
    // Placeholder — replace with the API3 proxy address for the feed on XDC.
    IApi3Proxy internal constant PROXY =
        IApi3Proxy(0x0000000000000000000000000000000000000000);

    uint256 internal constant MAX_STALENESS = 1 hours;

    function getPrice() external view returns (uint256) {
        (int224 value, uint32 timestamp) = PROXY.read();
        require(value > 0, "Invalid value");
        require(block.timestamp - timestamp <= MAX_STALENESS, "Stale");
        return uint256(uint224(value)); // API3 feeds are 18 decimals
    }
}
```

### Pyth (Pull Oracle)

Pyth inverts the flow: instead of the oracle pushing updates on-chain, your transaction carries a signed price update and pays a small fee to post it before reading. This gives you the freshest possible price at the moment of execution.

```solidity
interface IPyth {
    struct Price {
        int64 price;
        uint64 conf;
        int32 expo;
        uint256 publishTime;
    }
    function getUpdateFee(bytes[] calldata updateData) external view returns (uint256);
    function updatePriceFeeds(bytes[] calldata updateData) external payable;
    function getPrice(bytes32 id) external view returns (Price memory);
}

contract PythConsumer {
    // Placeholders — replace with Pyth's published XDC contract and price feed ID.
    IPyth internal constant PYTH = IPyth(0x0000000000000000000000000000000000000000);
    bytes32 internal constant XDC_USD_ID = bytes32(0);

    uint256 internal constant MAX_STALENESS = 60 seconds;

    /// @param priceUpdate Signed price update data fetched off-chain from Pyth's
    /// price service (e.g., Hermes) immediately before sending this transaction.
    function swapWithFreshPrice(bytes[] calldata priceUpdate) external payable returns (uint256) {
        uint256 fee = PYTH.getUpdateFee(priceUpdate);
        PYTH.updatePriceFeeds{value: fee}(priceUpdate);

        IPyth.Price memory p = PYTH.getPrice(XDC_USD_ID);
        require(p.price > 0, "Invalid price");
        require(block.timestamp - p.publishTime <= MAX_STALENESS, "Stale");

        // Pyth prices carry a signed exponent (expo); normalize to 18 decimals
        // and treat p.conf as a confidence interval you can bound against.
        return uint256(uint64(p.price));
    }
}
```

Practical notes for pull oracles:

- Fetch `priceUpdate` from the provider's off-chain price service in your frontend or keeper immediately before submitting the transaction — updates expire quickly.
- The `conf` (confidence interval) field is unique to Pyth; reject prices where `conf` is too wide relative to `price`, as it signals thin or volatile markets.
- Any unused `msg.value` beyond the update fee is not refunded by all implementations — forward exactly `getUpdateFee()` or handle the refund.

## Push vs Pull Oracles

| | Push (Chainlink-style) | Pull (Pyth-style) |
|---|---|---|
| Update trigger | Oracle network writes on a heartbeat or deviation threshold | Consumer's transaction posts the update |
| Freshness | Bounded by heartbeat/deviation (minutes) | As fresh as the block your tx lands in |
| Gas cost | Reading is cheap (a `staticcall`) | Caller pays the update fee plus write gas |
| Failure mode | Stale feed between heartbeats | Expired update data; requires off-chain fetch |
| Integration | Read-only interface, no calldata needed | Frontend/keeper must fetch signed updates |
| Best for | Lending, liquidations, background state | Perps, high-frequency settlement, low-latency apps |

## Multi-Oracle Median Aggregation

For high-value protocols, reading a single feed is a single point of failure. Query several independent feeds and take the median, tolerating individual feed failures via `try/catch` and requiring a minimum number of valid answers.

```solidity
contract MedianPriceOracle {
    AggregatorV3Interface[] public feeds;
    uint256 public immutable minValid;
    uint256 internal constant MAX_STALENESS = 1 hours;

    constructor(AggregatorV3Interface[] memory _feeds, uint256 _minValid) {
        require(_feeds.length >= _minValid && _minValid > 0, "Bad config");
        feeds = _feeds;
        minValid = _minValid;
    }

    function getMedianPrice() external view returns (uint256) {
        uint256 n = feeds.length;
        uint256[] memory valid = new uint256[](n);
        uint256 count;

        for (uint256 i; i < n; ++i) {
            try feeds[i].latestRoundData() returns (
                uint80 roundId,
                int256 answer,
                uint256,
                uint256 updatedAt,
                uint80 answeredInRound
            ) {
                if (
                    answer > 0 &&
                    answeredInRound >= roundId &&
                    block.timestamp - updatedAt <= MAX_STALENESS
                ) {
                    valid[count++] = uint256(answer);
                }
            } catch {
                // Feed reverted or does not exist — skip it.
            }
        }

        require(count >= minValid, "Too few valid feeds");

        // Sort the valid prefix and take the median.
        for (uint256 i = 1; i < count; ++i) {
            uint256 key = valid[i];
            uint256 j = i;
            while (j > 0 && valid[j - 1] > key) {
                valid[j] = valid[j - 1];
                --j;
            }
            valid[j] = key;
        }
        return valid[count / 2]; // for even counts, average valid[count/2 - 1] and valid[count/2]
    }
}
```

Median aggregation defends against a single feed returning an outlier or going dark, but it does not defend against correlated failure — if all your feeds source the same underlying exchange data, they can all be wrong together. Diversify providers and underlying data sources where possible.

## See Also

- [Oracle Integration Guide](/docs/smart-contracts/oracles) — the oracle landscape on XDC and verification checklist
- [Oracle Best Practices](/docs/smart-contracts/oracle-best-practices) — staleness thresholds, circuit breakers, and flash-loan resistance
- [Custom Oracles](/docs/smart-contracts/custom-oracles) — signed-data feeds for single-source use cases
- [DeFi Integration Patterns](/docs/smart-contracts/defi-integration) — composing price feeds with DEXes safely
