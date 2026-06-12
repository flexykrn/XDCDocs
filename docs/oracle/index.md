---
title: Oracle Integration Guide — Overview
description: Overview of oracle integration on XDC — why oracles are needed, types, and best practices.
---

# Oracle Integration Guide — Overview

Oracles bridge the gap between blockchains and the real world. This guide covers integrating price feeds, randomness, and external data into XDC smart contracts.

## Why Oracles Are Needed

Blockchains are deterministic and isolated. They cannot:
- Access external APIs
- Fetch real-time prices
- Generate true randomness
- Verify real-world events

Oracles solve this by providing **verified external data** on-chain.

## Oracle Types

| Type | Use Case | Examples |
|------|----------|----------|
| **Price Feeds** | Asset pricing, DeFi | Chainlink, Band, API3 |
| **VRF** | Randomness, gaming, NFTs | Chainlink VRF |
| **Automation** | Scheduled execution | Chainlink Keepers |
| **Cross-Chain** | Inter-chain messaging | Chainlink CCIP |
| **Custom** | Specific data needs | Self-built |

## Decentralized vs Centralized

| Feature | Decentralized | Centralized |
|---------|-------------|-------------|
| Trust | Distributed | Single point |
| Cost | Higher | Lower |
| Speed | Slower | Faster |
| Security | Manipulation-resistant | Vulnerable |

## Update Mechanisms

- **Deviation threshold**: Update when price changes > X%
- **Heartbeat**: Update every X blocks
- **Request-based**: Update only when requested

## Next Steps

- [Price Feeds →](./price-feeds.md) — Chainlink, Band, API3, Pyth
- [VRF →](./vrf.md) — Verifiable randomness
- [Automation →](./automation.md) — Keepers and scheduled tasks
- [Cross-Chain →](./cross-chain.md) — CCIP and inter-chain messaging
- [Custom Oracles →](./custom-oracles.md) — Build your own oracle
- [Best Practices →](./best-practices.md) — Security and reliability
