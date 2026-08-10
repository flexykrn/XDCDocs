---
title: "Block Explorer Usage Guide"
sidebar_position: 12
description: "How to use XDCScan and the Apothem testnet explorer to read transactions, addresses, blocks, tokens, and verified contracts on the XDC Network."
---

# Block Explorer Usage Guide

Block explorers let you inspect everything happening on the XDC Network without running a node: transactions, addresses, blocks, tokens, and smart contracts. This page covers XDCScan and the other explorers referenced across these docs, and how to read the most common pages.

## Deep-Dive Guides

- [Explorer API Access](/docs/xdc-chain/developers/explorer-api-access) — programmatic access via the Etherscan-compatible REST API
- [Advanced Explorer Usage](/docs/xdc-chain/developers/explorer-advanced) — internal transactions, event logs, approvals, CSV exports

## Explorers Overview

| Explorer | Network | URL | When to use |
|---|---|---|---|
| **XDCScan** | Mainnet | [xdcscan.com](https://xdcscan.com) | Primary mainnet explorer — transactions, tokens, contract verification |
| **XDCScan (Apothem)** | Apothem Testnet | [testnet.xdcscan.com](https://testnet.xdcscan.com) | Test deployments and debugging before mainnet |
| **BlocksScan** | Mainnet | [xdc.blocksscan.io](https://xdc.blocksscan.io) | Alternative mainnet explorer and verification UI |
| **BlocksScan (Apothem)** | Apothem Testnet | [apothem.blocksscan.io](https://apothem.blocksscan.io) | Alternative testnet explorer |

All of them index the same chains, so a transaction hash works identically across explorers. XDCScan is also reachable at [xdcscan.io](https://xdcscan.io).

## Finding Things with Search

The search bar on every explorer page accepts:

- **Transaction hash** (`0x...`, 66 characters) → transaction detail page
- **Address** (`xdc...` or `0x...`) → address page
- **Block number** → block detail page
- **Token name or symbol** → token page

If a search for an address returns nothing, check the prefix — explorers accept both `xdc`-prefixed and `0x` forms, but a typo in either will miss.

## Reading a Transaction Page

Paste a transaction hash into the search bar to open its detail page. Key fields:

- **Transaction hash:** Unique `0x...` identifier — keep it when reporting or debugging issues.
- **Status:** `Success` or `Fail`. A failed transaction still consumes gas; see [Debugging](/docs/smart-contracts/debugging) for common causes.
- **Block:** The block height that included the transaction. With XDC's 2-second block times, confirmation is nearly instant.
- **From / To:** Sender and recipient. Explorers display XDC's native `xdc...`-prefixed addresses, which are identical to the `0x...` form used by MetaMask and EVM tools — only the prefix differs.
- **Value:** Amount of XDC transferred.
- **Gas used / gas price:** XDC uses a low fixed gas price of **0.25 Gwei**, so fees are typically a fraction of a cent.
- **Input data:** The encoded contract call. For verified contracts the explorer decodes this into the function name and arguments; otherwise you see raw hex.
- **Token transfers:** If the transaction moved XRC20 tokens, each transfer is listed with token, amount, sender, and recipient — useful for confirming a contract behaved as expected.
- **Event logs:** Raw logs emitted by the contract, decoded when the source is verified. Debugging reverts often starts here.

## Reading an Address Page

Search any address to open its account page:

- **Balance:** Current XDC holdings.
- **Transactions:** Full history of incoming and outgoing transactions, filterable by direction.
- **Token holdings:** XRC20 tokens held by the address, with balances pulled from each token contract.
- **Contract tab:** Present only if the address is a smart contract. If the source is verified, you get:
  - **Code:** The verified Solidity source and compiler settings.
  - **Read Contract:** Call `view`/`pure` functions directly from the UI — no gas, no wallet.
  - **Write Contract:** Execute state-changing functions through a connected wallet.

## Reading Blocks and Validators

The blocks list shows each new block as it is produced:

- **Block height:** Sequential block number; click through for its full transaction list.
- **Epoch:** XDC's XDPoS consensus groups blocks into epochs of 900 blocks, with checkpoint blocks finalizing validator rewards.
- **Masternode:** The validator that proposed the block. To run one yourself, see [Masternode](/docs/xdc-chain/developers/node-operators/masternode).

## Verifying a Contract via the Explorer UI

Verification publishes your Solidity source on the explorer so anyone can read and interact with it:

1. Open your contract's address page and select the **Contract** tab.
2. Click **Verify & Publish**.
3. Provide the compiler version, license, and source (single file, flattened, or Standard JSON input) matching your deployment.

Once verified, the explorer decodes transaction input data and enables the Read/Write Contract tabs. Full walkthroughs — including flattening multi-file projects and Hardhat-based automated verification — are in [Deployment & Verification](/docs/smart-contracts/deployment-verification).

Verification works the same way on the Apothem explorer, so you can rehearse the whole flow on testnet before doing it on mainnet.

## Tracking Tokens

Every XRC20 token gets its own page (search by name, symbol, or contract address):

- **Overview:** Total supply, decimals, and the contract address.
- **Holders:** Distribution of balances across addresses — check concentration before integrating a token.
- **Transfers:** Live feed of token transfer events.
- **Contract:** If the token contract is verified, the Read Contract tab lets you query `balanceOf`, `allowance`, and other methods directly.

To create your own token, see [Tokens](/docs/smart-contracts/tokens).

## Common Developer Tasks

- **Confirm a payment landed:** Search the transaction hash and check status plus the value field.
- **Check why a contract call reverted:** Open the failed transaction and inspect the status, gas used, and event logs.
- **Monitor a wallet:** Bookmark its address page; the transaction list updates in real time.
- **Inspect a contract before interacting:** Open its address page, confirm the source is verified, and read the code in the Contract tab.

## Testnet Workflow

A typical Apothem development loop:

1. Request free test XDC from the [Apothem faucet](https://faucet.apothem.network) — 1000 XDC per request.
2. Send a transaction or deploy a contract from your wallet or script.
3. Paste the transaction hash into [testnet.xdcscan.com](https://testnet.xdcscan.com) to confirm status, gas used, and decoded input data.
4. Iterate until everything works, then deploy to mainnet and confirm on [xdcscan.com](https://xdcscan.com).

## API Access

Both explorers expose Etherscan-compatible REST API endpoints, so tools and scripts written against the Etherscan API can be pointed at the XDC explorers with minimal changes — see the endpoint documentation linked from [Deployment & Verification](/docs/smart-contracts/deployment-verification). For direct programmatic access to chain state without an API key, use the native JSON-RPC instead: [API Reference](/docs/api-reference/).

## See Also

- [API Reference](/docs/api-reference/) — JSON-RPC methods and data APIs
- [XDC Chain FAQ](/docs/xdc-chain/faq) — networks, faucets, and common questions
- [Quick Guide: XDC Chain](/docs/xdc-chain/developers/quick-guide) — network overview and tooling
