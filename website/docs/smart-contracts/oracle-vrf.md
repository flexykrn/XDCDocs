---
title: Verifiable Randomness (VRF)
sidebar_position: 34
description: Verifiable random functions on XDC — why on-chain randomness is insecure, the VRF request/fulfill pattern, and commit-reveal alternatives.
---

# Verifiable Randomness (VRF)

Games, NFT reveals, lotteries, and random selections all need randomness that neither players nor operators can predict or bias. On-chain, that is harder than it looks: everything a contract can read is either public or influenceable by validators. This page explains the problem, the standard VRF solution, and the commit-reveal fallback.

:::warning Verify provider deployments first
The XDC documentation does not document a VRF provider deployment with published coordinator addresses on XDC Mainnet (Chain ID `50`) or Apothem Testnet (Chain ID `51`). All addresses, key hashes, and parameters on this page are placeholders. Confirm with your chosen VRF provider that they operate on XDC and obtain official coordinator addresses and key hashes from the provider's own documentation.
:::

## Why On-Chain Randomness Is Insecure

Anything derived purely from chain state fails for randomness that decides value:

- **`blockhash`** — publicly known to everyone (including the player) before they decide whether to play, and validators can withhold blocks whose hash is unfavorable to them.
- **`block.timestamp`** — influenceable by the validator within a tolerance window and predictable by anyone watching pending transactions.
- **`block.prevrandao`** — an improvement over `block.difficulty`, but still known to the block proposer before they commit the block, so a validator with a stake in the outcome can choose to propose or skip.

If a random draw distributes prizes, assigns NFT rarity, or picks a liquidation order, an attacker who can predict or grind the "random" value will extract that value. Use a verifiable source instead.

## The VRF Request/Fulfill Pattern

Verifiable random functions split randomness across two transactions so no single party sees the result before committing:

1. **Request:** Your contract calls the oracle's coordinator, which records the request and emits an event. The request specifies a key hash (selecting the proving key and gas lane), a subscription ID that funds the service, and gas parameters for the callback.
2. **Fulfill:** The oracle's off-chain node sees the event, generates a random value plus a cryptographic proof, and submits both to the coordinator. The coordinator **verifies the proof on-chain** — this is what makes the randomness verifiable rather than merely trusted — and only then calls your contract's `fulfillRandomWords`.

Because the proof is verified on-chain, the oracle cannot return a biased value without the transaction reverting, and because the seed commits to the request block, the requester cannot know the outcome before requesting.

### Consumer Skeleton (Subscription Model)

The dominant VRF design (Chainlink VRF v2/v2.5 style) uses a prepaid subscription: you fund a subscription balance, and each request draws from it. The interface names below follow that pattern; check your provider's documentation for the exact version they deploy on XDC.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

abstract contract VRFConsumerBase {
    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal virtual;
}

contract Raffle is VRFConsumerBase {
    // All placeholders — replace with the provider's published XDC values.
    address public immutable coordinator;  // VRF coordinator contract on XDC
    bytes32 public immutable keyHash;      // gas lane / proving key for XDC
    uint256 public immutable subscriptionId; // your funded subscription

    // Placeholder parameters — tune against the provider's published limits.
    uint32 internal constant CALLBACK_GAS_LIMIT = 200_000;
    uint16 internal constant REQUEST_CONFIRMATIONS = 3;
    uint32 internal constant NUM_WORDS = 1;

    mapping(uint256 => address) public requestToPlayer;

    constructor(address _coordinator, bytes32 _keyHash, uint256 _subscriptionId) {
        coordinator = _coordinator;
        keyHash = _keyHash;
        subscriptionId = _subscriptionId;
    }

    function enterRaffle() external returns (uint256 requestId) {
        // Call the coordinator with the provider's exact signature, e.g.:
        // requestId = IVRFCoordinator(coordinator).requestRandomWords(
        //     keyHash, subscriptionId, REQUEST_CONFIRMATIONS,
        //     CALLBACK_GAS_LIMIT, NUM_WORDS
        // );
        requestId = 0; // placeholder until provider signature is confirmed
        requestToPlayer[requestId] = msg.sender;
    }

    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords)
        internal
        override
    {
        address player = requestToPlayer[requestId];
        delete requestToPlayer[requestId];

        uint256 roll = randomWords[0];
        // Use `roll` here — e.g., pick a winner or assign a trait.
        // Keep this callback under CALLBACK_GAS_LIMIT or fulfillment reverts.
    }
}
```

Parameter notes:

- **`keyHash`** — selects the proving key and the maximum gas price the oracle will pay for fulfillment. Providers publish one per gas lane per network; use the XDC-specific value from their docs.
- **`CALLBACK_GAS_LIMIT`** — the cap on gas your `fulfillRandomWords` may consume. If fulfillment exceeds it, the callback reverts and the randomness is lost for that request. Keep fulfillment logic lean; store results and do heavy work in a separate user-initiated transaction if needed.
- **`REQUEST_CONFIRMATIONS`** — how many blocks the oracle waits before fulfilling, protecting against chain reorgs changing the committed seed. XDC's fast finality makes low values practical, but follow the provider's minimum.
- **Subscription funding** — the subscription balance is typically held in the provider's fee token. Verify which token funds subscriptions on XDC with the provider.

## Commit-Reveal: The Trust-Minimized Alternative

If no VRF provider operates on XDC for your needs, commit-reveal is a workable design for multi-party randomness:

1. **Commit:** Each participant submits `keccak256(abi.encodePacked(secret))` before a deadline.
2. **Reveal:** After the deadline, each participant reveals `secret`; the contract checks the hash matches.
3. **Combine:** The final randomness is the XOR (or hash) of all revealed secrets.

Any single honest participant makes the outcome unpredictable to everyone else. The weaknesses are real, though: the last revealer can compute the outcome and choose to withhold their reveal (aborting or biasing the draw), and liveness depends on all parties returning. Mitigate with reveal-deposits slashed on non-reveal, and never use commit-reveal with a single operator — that degenerates to trusting the operator entirely.

For single-operator, low-stakes cases, a VRF request is strictly better; for high-stakes cases with no VRF available, consider sourcing randomness from a chain where a VRF provider operates and bridging the result — but treat that as a custom-oracle problem with the trust assumptions described in [Custom Oracles](/docs/smart-contracts/custom-oracles).

## Use Cases

- **NFT reveals** — mint tokens with hidden metadata, then use one VRF word as an offset into a shuffled metadata sequence so the project team cannot assign rare traits to themselves.
- **Gaming** — loot drops, match outcomes, and procedural generation where players must be able to verify the house did not rig the roll.
- **Lotteries and raffles** — winner selection where both players and organizers are verifiably excluded from influencing the draw.
- **Random ordering** — fair ordering of liquidation queues, allowlist spots, or validator selection.

## Verification: What "Verifiable" Buys You

The on-chain proof verification step is the entire point. A naive "oracle posts a random number" design requires trusting the oracle not to bias results; a VRF makes bias cryptographically impossible — the coordinator reverts on any value that does not match the proof for the committed seed. When evaluating a VRF provider for XDC, confirm their coordinator verifies proofs on-chain and that the proving keys are publicly registered, so anyone can audit that the key hash in your contract corresponds to the provider's published key.

## See Also

- [Oracle Integration Guide](/docs/smart-contracts/oracles) — oracle landscape and provider verification checklist
- [Oracle Price Feeds](/docs/smart-contracts/oracle-price-feeds) — push and pull price feed patterns
- [Oracle Best Practices](/docs/smart-contracts/oracle-best-practices) — monitoring, circuit breakers, and upgrade paths
- [NFT Tutorial](/docs/smart-contracts/nft-tutorial) — XRC721 minting patterns to pair with random reveals
