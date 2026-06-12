---
title: dApp Integration Guide — Mobile, Frontend, and Wallet Adapters on XDC
description: Complete dApp integration guide for XDC — mobile wallets (iOS/Android), frontend frameworks (React/Vue/Angular), and wallet adapters.
related_pages:
  - ./dapp-integration/mobile/index.md
  - ./dapp-integration/frontend/index.md
  - ./dapp-integration/wallet-adapters/index.md
  - ./defi/index.md
  - ./oracle/index.md
---

# dApp Integration Guide

Building decentralized applications (dApps) on XDC requires integrating wallets, frontend frameworks, and mobile platforms. This guide covers all aspects of dApp development.

## What You'll Learn

| Topic | Description | Issue |
|-------|-------------|-------|
| **Mobile Wallets** | iOS and Android integration | #146 |
| **Frontend Frameworks** | React, Vue, Angular | #155 |
| **Wallet Adapters** | Multi-wallet support | #156 |

## Quick Start

```bash
# Install Web3 dependencies
npm install ethers @xdcnetwork/xdc-connect

# For React
npm install wagmi viem @rainbow-me/rainbowkit

# For mobile (React Native)
npm install @walletconnect/react-native-sdk
```

## Architecture Overview

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Wallet     │────▶│   XDC Network   │
│  (React/Vue)    │     │  (MetaMask)  │     │  (Mainnet/Test) │
└─────────────────┘     └──────────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│  Mobile (iOS)   │
│  WalletConnect  │
└─────────────────┘
```

## Next Steps

- [Mobile Wallets →](./mobile/index.md) — iOS and Android integration
- [Frontend Frameworks →](./frontend/index.md) — React, Vue, Angular
- [Wallet Adapters →](./wallet-adapters/index.md) — Multi-wallet support
