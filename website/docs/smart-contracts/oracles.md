---
title: Oracle Integration Guide
sidebar_position: 20
description: Integrating oracles on the XDC Network — price feeds, verifiable randomness, and custom signed-data oracles.
---

# Oracle Integration Guide

Smart contracts on the XDC Network execute deterministically — they cannot make HTTP requests or read data from the outside world. Oracles bridge that gap by bringing off-chain data (prices, randomness, API results) on-chain in a way contracts can consume. This guide covers the oracle landscape on XDC, the standard price-feed and randomness patterns, a lightweight custom oracle design, and the security rules that apply to all of them.

## Deep-Dive Guides

- [Oracle Price Feeds](/docs/smart-contracts/oracle-price-feeds) — AggregatorV3Interface consumers with full safety checks, Band/API3/Pyth patterns, and median aggregation
- [Verifiable Randomness (VRF)](/docs/smart-contracts/oracle-vrf) — request/fulfill randomness, commit-reveal, and why on-chain pseudo-randomness fails
- [Custom Oracles](/docs/smart-contracts/custom-oracles) — ECDSA signed-data feeds with replay protection and off-chain signers
- [Oracle Best Practices](/docs/smart-contracts/oracle-best-practices) — staleness thresholds, circuit breakers, TWAP, and monitoring

## Why Contracts Need Oracles

The EVM is intentionally isolated: every node must be able to replay every transaction and reach the identical state. If contracts could call external APIs directly, different nodes would see different responses and consensus would break. Oracles solve this by having an off-chain party observe the world and publish the result on-chain as ordinary transaction data.

Common use cases:

- **Price feeds** — lending, stablecoins, and DeFi protocols need asset prices denominated in USD or other assets.
- **Verifiable randomness** — games, NFT reveals, and lotteries need randomness that neither players nor operators can predict or bias.
- **External APIs** — weather data for parametric insurance, shipment events for trade finance, sports results, and more.

## Oracle Landscape on XDC

The XDC documentation does not currently document a Chainlink deployment on XDC Mainnet (Chain ID `50`) or Apothem Testnet (Chain ID `51`), and no first-party oracle feed addresses are published in these docs. Before building, verify with your chosen oracle provider:

1. Whether they operate a deployment on XDC Mainnet and/or Apothem.
2. The official feed/registry contract addresses, published in the provider's own documentation.

The integration patterns below are the industry-standard aggregator and request/fulfill interfaces used across EVM chains. Because XDC is fully EVM-compatible, any oracle that supports these patterns on other EVM networks works the same way on XDC — only the contract addresses differ. All addresses in this guide are placeholders; never deploy against an address you have not confirmed with the provider.

## Reading a Price Feed (Aggregator Pattern)

The de-facto standard interface for push-based price feeds is `AggregatorV3Interface`. Your contract reads the latest round of data from a feed contract that the oracle network updates on a schedule or when the price deviates beyond a threshold.

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

contract PriceConsumer {
    // Placeholder — replace with the provider's published XDC feed address.
    AggregatorV3Interface internal constant FEED =
        AggregatorV3Interface(0x0000000000000000000000000000000000000000);

    uint256 internal constant MAX_STALENESS = 1 hours;

    function getLatestPrice() public view returns (int256) {
        (
            uint80 roundId,
            int256 answer,
            ,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = FEED.latestRoundData();

        require(answer > 0, "Invalid price");
        require(answeredInRound >= roundId, "Stale round");
        require(block.timestamp - updatedAt <= MAX_STALENESS, "Stale price");

        return answer;
    }
}
```

Key points:

- **`decimals()`:** Feeds typically return prices scaled by 8 decimals (e.g., `answer = 251234000000` means $2,512.34). Always read `decimals()` from the feed — never hardcode it — and normalize before combining with token amounts that use 18 decimals.
- **Staleness checks:** `updatedAt` tells you when the answer was last written. Revert if it is older than your threshold (`MAX_STALENESS`), and require `answeredInRound >= roundId` to reject incomplete rounds.
- **Addresses:** Obtain feed addresses from the oracle provider's published XDC deployment documentation. The zero address above is a deliberate placeholder.

You can test the reading logic on [Apothem Testnet](https://faucet.apothem.network) against whatever feeds your provider operates there — see the [Smart Contract Testing Guide](/docs/smart-contracts/testing-guide) for fork-testing patterns.

## Verifiable Randomness (VRF Pattern)

Verifiable randomness uses a request/fulfill flow split across two transactions:

1. Your contract calls the oracle's coordinator, emitting a request with a fee and a key hash (which selects the gas price lane and proving key).
2. The oracle's off-chain node generates a random value plus a cryptographic proof, then calls back your contract's `fulfillRandomWords` function, which the coordinator verifies on-chain before delivering.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

// Interface names follow the common VRF v2 consumer pattern.
abstract contract VRFConsumerBase {
    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal virtual;
}

contract RandomConsumer is VRFConsumerBase {
    address public immutable coordinator; // provider's XDC coordinator address
    bytes32 public immutable keyHash;     // provider-published key hash for XDC

    mapping(uint256 => address) public requestToSender;

    constructor(address _coordinator, bytes32 _keyHash) {
        coordinator = _coordinator;
        keyHash = _keyHash;
    }

    function requestRandomWords() external returns (uint256 requestId) {
        // Call coordinator.requestRandomWords(keyHash, numWords, ...) here.
        // The exact signature depends on the provider's VRF version.
        requestId = 0; // placeholder
        requestToSender[requestId] = msg.sender;
    }

    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords)
        internal
        override
    {
        address user = requestToSender[requestId];
        // Use randomWords[0] here — e.g., pick a winner, mint a trait.
    }
}
```

**Never substitute on-chain pseudo-randomness.** Values derived from `blockhash`, `block.timestamp`, or `block.prevrandao` are visible to or influenceable by validators and miners. Any randomness that decides value distribution (prizes, NFT rarity, liquidations) must come from a verifiable source.

## Building a Lightweight Custom Oracle

For narrow, low-value use cases — a single data source you control — a signed-message oracle is a pragmatic design. An off-chain signer you operate signs a data payload; anyone can submit the payload on-chain, and the contract recovers the signer with ECDSA.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract SignedPriceOracle {
    using ECDSA for bytes32;

    address public immutable signer;
    uint256 public price;
    uint256 public updatedAt;

    constructor(address _signer) {
        signer = _signer;
    }

    function updatePrice(uint256 _price, uint256 _timestamp, bytes calldata signature) external {
        require(_timestamp > updatedAt, "Stale update");
        require(block.timestamp - _timestamp <= 10 minutes, "Expired quote");

        bytes32 digest = keccak256(abi.encodePacked(address(this), _price, _timestamp))
            .toEthSignedMessageHash();
        require(digest.recover(signature) == signer, "Bad signature");

        price = _price;
        updatedAt = _timestamp;
    }
}
```

The chain ID and contract address are bound into the signed digest (via `address(this)`) to prevent replay across chains or contracts. This pattern is acceptable only when:

- The data comes from a **single authoritative source** you already trust (your own backend).
- The **value at risk is low** — a compromised or offline signer must not be catastrophic.
- You can tolerate liveness risk: if your signer goes down, the feed goes stale.

For anything custodying significant funds, use a decentralized oracle network instead of a single signer.

## Security Rules for Oracle Consumers

- **Always check staleness.** A feed that stopped updating returns the last answer forever. Reject data older than your threshold, and treat the [oracle manipulation checklist item](/docs/smart-contracts/security-best-practices) as mandatory.
- **Handle decimals explicitly.** Normalize feed answers (commonly 8 decimals) and token amounts (commonly 18) to a common scale before arithmetic; document the scale of every intermediate value.
- **Add circuit breakers.** Revert or pause when a price moves more than a sanity bound between reads, or when a feed returns zero/negative values.
- **Prefer flash-loan-resistant sources.** On-chain spot prices from a single DEX pool can be manipulated within one transaction. Use oracle network medians or time-weighted average prices (TWAP), never raw pool spot prices, for lending or liquidation logic — see [DeFi Integration Patterns](/docs/smart-contracts/defi-integration).
- **Test on Apothem first.** Testnet oracle addresses, liquidity, and update cadence differ from mainnet; re-validate every address and threshold before deploying. See [Deployment & Verification](/docs/smart-contracts/deployment-verification).

## See Also

- [Security Best Practices & Audit Checklist](/docs/smart-contracts/security-best-practices) — oracle manipulation resistance and the full pre-deployment checklist
- [DeFi Integration Patterns](/docs/smart-contracts/defi-integration) — composing tokens, DEXes, and price feeds safely
- [Tokens Built On XDC](/docs/smart-contracts/tokens) — XRC20, XRC721, and XRC404 token standards
- [Smart Contract Testing Guide](/docs/smart-contracts/testing-guide) — fork testing against live Apothem state
- [Deployment & Verification](/docs/smart-contracts/deployment-verification) — deploy and verify oracle consumers on XDCScan
