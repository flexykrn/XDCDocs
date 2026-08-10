---
title: Developer Tools
sidebar_position: 25
description: Curated index of development tools for XDC Network — frameworks, SDKs, explorers, indexers, and node tooling.
---

# Developer Tools

A curated index of the tools used to build, deploy, and monitor applications on XDC Network. Each entry links to a guide in these docs or the tool's official site.

---

## Development Frameworks

| Tool | Description | Guide |
|---|---|---|
| **Hardhat** | JavaScript/TypeScript development environment for compiling, testing, and deploying contracts | [Hardhat Guide](/docs/smart-contracts/hardhat-guide) |
| **Foundry** | Fast Rust-based toolkit (forge, cast, anvil) for contract development and testing | [Foundry Guide](/docs/smart-contracts/foundry-guide) |
| **Remix** | Browser-based Solidity IDE — no installation, deploy a contract in minutes | [remix.xinfin.network](https://remix.xinfin.network) |

---

## Client Libraries

| Tool | Description | Guide |
|---|---|---|
| **xdc3.js** | XDC's Web3.js-compatible JavaScript library for interacting with the chain | [xdc3.js SDK](/docs/xdc-chain/developers/xdc3js-sdk) |
| **Ethers.js** | Standard Ethereum library — works out of the box with XDC RPC endpoints | [Frontend Integration](/docs/smart-contracts/frontend-integration) |

---

## Explorers & Indexing

| Tool | Description | Guide |
|---|---|---|
| **XDCScan / BlocksScan** | Block explorers for mainnet, testnet, and devnet — transactions, tokens, contract verification | [Explorer Guide](/docs/xdc-chain/developers/explorer-guide) |
| **Subgraphs (The Graph)** | Index on-chain events into queryable GraphQL APIs | [Subgraph Guide](/docs/xdc-chain/developers/subgraph-guide) |
| **XDCScan API** | REST API for programmatic access to explorer data (Etherscan-compatible) | [docs.blocksscan.io](https://docs.blocksscan.io/) |

---

## Contract Libraries & Security

| Tool | Description | Guide |
|---|---|---|
| **OpenZeppelin Contracts** | Audited, reusable Solidity contracts (tokens, access control, proxies) | [docs.openzeppelin.com](https://docs.openzeppelin.com/contracts) |
| **OpenZeppelin Upgrades** | Proxy patterns (UUPS, Transparent) for upgradeable contracts | [Upgradeable Contracts](/docs/smart-contracts/upgradeable-contracts) |

---

## Node & Infrastructure Tooling

| Tool | Description | Guide |
|---|---|---|
| **One-Click Installer** | Fastest way to spin up an XDC node with a guided setup | [One-Click Installer](/docs/xdc-chain/developers/node-operators/one-click-installer) |
| **Bootstrap Script / Docker** | Scripted and containerized node deployment options | [Masternode Setup](/docs/xdc-chain/developers/node-operators/masternode) |
| **WebSocket Events** | Real-time subscriptions for new blocks, logs, and pending transactions | [WebSocket Events](/docs/xdc-chain/developers/websocket-events) |

---

## Getting Started Path

New to XDC? This is the shortest path from zero to deployed contract:

1. **Configure a wallet** — [Wallet Configuration](/docs/xdc-chain/developers/wallet-configuration)
2. **Get test XDC** — [Testnet Faucet](/docs/xdc-chain/developers/faucet)
3. **Set up your environment** — [Environment Setup](/docs/smart-contracts/environment-setup)
4. **Build and deploy** — [Hardhat Guide](/docs/smart-contracts/hardhat-guide) or [Foundry Guide](/docs/smart-contracts/foundry-guide)
5. **Verify on the explorer** — [Deployment & Verification](/docs/smart-contracts/deployment-verification)

---

*Missing a tool you rely on? [Edit this page on GitHub](https://github.com/OpenScanAI/XDCDocs) and open a pull request.*
