---
title: Environment Setup
sidebar_position: 28
description: Set up a complete XDC smart contract development environment — Node.js, Git, MetaMask, test XDC, and choosing between Remix, Hardhat, and Foundry.
---

# Environment Setup

Before writing, testing, or deploying any smart contract on the XDC Network, you need a working development environment. This page is the "before everything" checklist: install the prerequisites, connect a wallet, fund it with test XDC, and pick the toolchain that fits your project.

Everything here works on Windows, macOS, and Linux.

## Prerequisites Checklist

| Tool | Version | Purpose |
| --- | --- | --- |
| Node.js | 20 LTS | Runtime for Hardhat, scripts, and SDK tooling |
| npm | Bundled with Node | Package manager for project dependencies |
| Git | Latest | Version control and cloning project templates |
| Code editor | Any (VS Code recommended) | Solidity editing with syntax highlighting |
| MetaMask | Latest browser extension | Wallet for signing testnet and mainnet transactions |

## Verify the Installations

Run these commands in a terminal. Each should print a version number — any "command not found" error means the tool needs to be installed or your PATH refreshed.

```bash
node -v    # expect v20.x.x
npm -v     # expect 10.x.x
git --version
```

If you use VS Code, install the official **Solidity** extension (by Nomic Foundation or Juan Blanco) for syntax highlighting, inline compile errors, and formatting.

## Wallet, Networks, and Test XDC

You need a wallet on the Apothem Testnet before any toolchain can deploy.

1. **Set up MetaMask** with the XDC networks — Apothem (chain ID 51, RPC `https://rpc.apothem.network`) for development and XDC mainnet (chain ID 50) for production. Full add-network steps are in [Wallets & Networks for XDC](/docs/smart-contracts/xdc-wallet).
2. **Fund the wallet** from the [Apothem faucet](https://faucet.apothem.network). Test XDC is free and gas fees on XDC are near-zero, so one request covers hundreds of deployments.
3. **Confirm the balance** by checking your address on [testnet.xdcscan.com](https://testnet.xdcscan.com).

## Choose a Toolchain

All three options target XDC with identical chain configuration — the difference is workflow:

| Toolchain | Install required | Best for | Guide |
| --- | --- | --- | --- |
| Remix | None (browser) | First deploy, learning, quick prototypes | [Remix IDE Guide](/docs/smart-contracts/remix-guide) |
| Hardhat | Node.js packages | Teams, TypeScript tests, plugin ecosystem | [Hardhat Guide](/docs/smart-contracts/hardhat-guide) |
| Foundry | Rust-based binaries | Speed, Solidity-native tests, fuzzing | [Foundry Guide](/docs/smart-contracts/foundry-guide) |

Not sure? Start with Remix to deploy something today, then move to Hardhat or Foundry once you need automated tests and scripted deployments. Note that whichever you pick, XDC supports **Solidity up to 0.8.24** — pin your compiler accordingly (see the [XDC FAQ](/docs/xdc-chain/faq#smart-contracts)).

## Optional Tools

- **xdc3.js / ethers.js:** JavaScript libraries for reading chain data and sending transactions from apps and scripts. See the [xdc3.js SDK](/docs/xdc-chain/developers/xdc3js-sdk) documentation.
- **Subgraphs:** Index on-chain events into a queryable GraphQL API — essential for dApps that display historical data. See the [Subgraph Guide](/docs/xdc-chain/developers/subgraph-guide).
- **dotenv:** Store private keys and RPC URLs in a `.env` file. Never commit private keys or mnemonics to Git.

## Common Setup Issues

| Problem | Cause | Fix |
| --- | --- | --- |
| `EACCES` permission errors on `npm install -g` | Global npm directory owned by root | Use a Node version manager (nvm, nvs, fnm) instead of system Node |
| `node-gyp` build failures on Windows | Missing C++ build tools | Run `npm install -g windows-build-tools` or install Visual Studio Build Tools |
| Hardhat/dependency errors after install | Wrong Node version (odd-numbered or old) | Switch to Node 20 LTS with `nvm use 20`, then reinstall dependencies |
| `git` not recognized in terminal | PATH not updated | Restart the terminal (or the machine) after installing Git |
| MetaMask shows wrong network | Remix/tool connected before switching | Switch MetaMask to Apothem first, then reconnect |

## Next Steps

- [XDC Developer Quick Guide](/docs/xdc-chain/developers/quick-guide) — the fast path from zero to a deployed contract.
- [Remix IDE Guide](/docs/smart-contracts/remix-guide) — deploy your first contract with no installation.
- [Smart Contract Testing Guide](/docs/smart-contracts/testing-guide) — unit tests, coverage, fuzzing, and testnet rehearsal.
- [Deployment & Verification](/docs/smart-contracts/deployment-verification) — verify contract source on XDCScan.
