---
title: Custom Oracles
sidebar_position: 35
description: Building signed-data oracles on XDC — ECDSA signed-price feeds with replay protection, off-chain signers, and when a custom oracle is acceptable.
---

# Custom Oracles

When no existing oracle network serves your data — an internal price, a proprietary index, an off-chain event only your backend observes — you can operate a small custom oracle. The standard design is a signed-data feed: an off-chain signer you control signs a payload, anyone relays it on-chain, and the contract verifies the signature with ECDSA before accepting the data.

This page gives a complete implementation with replay protection and expiry, the off-chain signer sketch, and an honest assessment of when this pattern is acceptable — and when it is not.

## On-Chain: Signed-Price Feed

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract SignedPriceOracle {
    using ECDSA for bytes32;

    address public immutable signer;
    uint256 public price;
    uint256 public updatedAt;

    // Replay protection: each signed nonce can be used exactly once.
    mapping(uint256 => bool) public usedNonces;

    event PriceUpdated(uint256 price, uint256 timestamp, uint256 nonce);

    constructor(address _signer) {
        require(_signer != address(0), "Zero signer");
        signer = _signer;
    }

    /// @param _price The signed price (define and document the decimals scale).
    /// @param _timestamp When the signer produced the quote (not submission time).
    /// @param _deadline After this timestamp the quote is rejected — bounds how
    ///                  long a held-back signature stays valid.
    /// @param _nonce Unique per signature; prevents replaying the same quote.
    /// @param signature The signer's EIP-191 signature over the payload.
    function updatePrice(
        uint256 _price,
        uint256 _timestamp,
        uint256 _deadline,
        uint256 _nonce,
        bytes calldata signature
    ) external {
        require(block.timestamp <= _deadline, "Quote expired");
        require(_timestamp > updatedAt, "Stale update");
        require(!usedNonces[_nonce], "Nonce used");

        // Bind chain, contract, and every parameter into the digest so the
        // signature cannot be replayed on another chain, contract, or payload.
        bytes32 digest = keccak256(
            abi.encode(
                block.chainid,
                address(this),
                _price,
                _timestamp,
                _deadline,
                _nonce
            )
        ).toEthSignedMessageHash();

        require(digest.recover(signature) == signer, "Bad signature");

        usedNonces[_nonce] = true;
        price = _price;
        updatedAt = _timestamp;

        emit PriceUpdated(_price, _timestamp, _nonce);
    }

    /// @notice Consumers should call this rather than reading `price` directly.
    function getPrice(uint256 maxStaleness) external view returns (uint256) {
        require(price > 0, "No price yet");
        require(block.timestamp - updatedAt <= maxStaleness, "Stale feed");
        return price;
    }
}
```

Design decisions:

- **`block.chainid` + `address(this)` in the digest** — prevents replaying a signature on a different chain or a redeployed copy of the contract. `abi.encode` (not `encodePacked`) is used because all fields are dynamic-free fixed-size values, eliminating ambiguity collisions.
- **`_deadline`** — distinct from staleness. A relayer holding a valid signature cannot sit on it indefinitely; after the deadline the quote is worthless. Signers should set deadlines minutes out, not hours.
- **`_nonce`** — strictly prevents signature reuse. An incrementing nonce from the signer is simplest; the `usedNonces` mapping tolerates out-of-order submission.
- **`_timestamp > updatedAt`** — guarantees the stored price moves only forward in time, so an old quote cannot overwrite a newer one even if relayed late.

## Off-Chain: The Signer

The signer is a small service that observes your data source and produces signatures on a cadence (or on request from relayers):

```javascript
import { Wallet, AbiCoder, keccak256, getBytes } from "ethers";

const signer = new Wallet(process.env.ORACLE_SIGNER_KEY);
const abiCoder = AbiCoder.defaultAbiCoder();

const CHAIN_ID = 50; // XDC Mainnet; use 51 for Apothem
const ORACLE_ADDRESS = "0x0000000000000000000000000000000000000000"; // deployed oracle

async function signPrice(price, nonce) {
  const timestamp = Math.floor(Date.now() / 1000);
  const deadline = timestamp + 300; // valid for 5 minutes

  // Must match keccak256(abi.encode(...)) on-chain exactly.
  const digest = keccak256(
    abiCoder.encode(
      ["uint256", "address", "uint256", "uint256", "uint256", "uint256"],
      [CHAIN_ID, ORACLE_ADDRESS, price, timestamp, deadline, nonce]
    )
  );

  // EIP-191 personal-sign over the payload digest — must match
  // toEthSignedMessageHash() on-chain.
  const signature = await signer.signMessage(getBytes(digest));

  return { price, timestamp, deadline, nonce, signature };
}
```

Operational requirements for the signer:

- **Key management** — the signer key is the entire security of the oracle. Keep it in a KMS/HSM or at minimum an environment-isolated secret, never in source control, and plan a rotation path (deploy a new oracle pointing at a new signer, migrate consumers).
- **Deterministic scale** — pick the price decimals once (e.g., 8 or 18), document it, and never change it without redeploying; consumers will silently misprice otherwise.
- **Monotonic nonces** — persist the last nonce durably; reusing a nonce after a restart bricks that quote (rejected as used) but is not exploitable, while skipping is harmless.

## Relayers and Uptime

Anyone can submit a valid signature — the contract does not care who relays. In practice, your own backend is the relayer, which makes the signer's uptime your feed's uptime:

- If the signer or relayer goes down, `getPrice` starts reverting once the last update exceeds `maxStaleness`. That fail-closed behavior is correct — but consumers of your oracle must tolerate the feed halting, or you must run redundant relayers.
- Decouple signer and relayer if uptime matters: the signer can be a cold, rarely-online key producing batches of short-deadline quotes, while a hot, keyless relayer service submits them. A compromised relayer can then only withhold or reorder quotes, never forge one.
- Monitor `updatedAt` off-chain and alert before staleness thresholds trip — see [Oracle Best Practices](/docs/smart-contracts/oracle-best-practices).

## When This Pattern Is Acceptable

A single-signer oracle is a pragmatic choice only when all of the following hold:

- The data comes from a **single authoritative source** you already trust — typically your own backend (an internal index, an off-chain event you are the sole witness to).
- The **value at risk is low** — a compromised or coerced signer must not be able to drain meaningful funds. Quantify it: what does an attacker gain by signing a false price?
- Consumers can tolerate **liveness risk** — the feed halts if your infrastructure halts.

## Bridging to Decentralized Oracles Later

Design for migration from day one. Consumers should read your oracle through an interface you control (like `getPrice(maxStaleness)` above, or better, the standard `AggregatorV3Interface` shape from [Oracle Price Feeds](/docs/smart-contracts/oracle-price-feeds)) rather than reading storage directly. When a decentralized oracle network later serves your pair on XDC, you can:

1. Deploy an adapter contract implementing the same interface, sourcing from the decentralized feed.
2. Point consumers at the adapter via an upgradeable proxy or a registry — see [Upgradeable Contracts](/docs/smart-contracts/upgradeable-contracts).
3. Decommission the signer.

A natural intermediate step is a **multi-signer** variant: require M-of-N signatures over the same payload (verify each with `ecrecover` and count distinct signers). This raises the compromise bar from one key to M keys without waiting for a full oracle network.

## See Also

- [Oracle Integration Guide](/docs/smart-contracts/oracles) — the oracle landscape on XDC
- [Oracle Price Feeds](/docs/smart-contracts/oracle-price-feeds) — standard feed interfaces to migrate toward
- [Oracle Best Practices](/docs/smart-contracts/oracle-best-practices) — monitoring, staleness, and circuit breakers
- [Upgradeable Contracts](/docs/smart-contracts/upgradeable-contracts) — upgrade patterns for swapping oracle sources
