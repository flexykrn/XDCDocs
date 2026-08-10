---
title: Remix IDE Guide
sidebar_position: 27
description: Deploy your first XDC smart contract with Remix IDE — zero installation, browser-based, MetaMask to Apothem testnet in minutes.
---

# Remix IDE Guide

Remix is a browser-based Solidity IDE — no installation required. It is the fastest way to deploy your first contract on XDC.

## Why Remix

- **Zero setup:** everything runs in the browser
- **Great for learning:** compile, deploy, and interact from one UI
- **Quick prototypes:** test ideas before building a full project

Graduate to [Hardhat](/docs/smart-contracts/hardhat-guide) or [Foundry](/docs/smart-contracts/foundry-guide) when you need automated tests and scripted deployments.

## Prerequisites

1. **MetaMask** with the Apothem Testnet added — see the [XDC Wallet guide](/docs/smart-contracts/xdc-wallet)
2. **Test XDC** from the [Apothem Faucet](https://faucet.apothem.network) (1000 XDC per request)

## Write the Contract

1. Open [remix.ethereum.org](https://remix.ethereum.org)
2. Create a new file `MyToken.sol` under `contracts/`
3. Paste a simple contract (or generate one with the OpenZeppelin Wizard):

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract SimpleStorage {
    uint256 private value;

    event ValueChanged(uint256 newValue);

    function set(uint256 newValue) external {
        value = newValue;
        emit ValueChanged(newValue);
    }

    function get() external view returns (uint256) {
        return value;
    }
}
```

## Compile

1. Open the **Solidity Compiler** tab
2. Select version **0.8.24 or lower** — XDC supports Solidity up to 0.8.24 (see the [FAQ](/docs/xdc-chain/faq#smart-contracts))
3. Click **Compile MyToken.sol**

## Deploy to Apothem

1. Open the **Deploy & Run Transactions** tab
2. Under **Environment**, choose **Injected Provider - MetaMask**
3. Confirm MetaMask is on **Apothem Testnet** (chain ID 51)
4. Click **Deploy** and confirm the transaction in MetaMask
5. Copy the contract address from the Remix console and look it up on the [Apothem explorer](https://testnet.xdcscan.com)

## Interact

- The deployed contract appears under **Deployed Contracts**
- Blue buttons are read-only calls (`get`), orange buttons send transactions (`set`)
- Every state change appears in the Remix console with a transaction hash

## Verify and Flatten

- Verify your contract source on the explorer: [Deployment & Verification](/docs/smart-contracts/deployment-verification)
- If verification needs a single file: [Flattening Smart Contracts](/docs/smart-contracts/flattening-smart-contracts)

## Limitations

Remix is for learning and prototyping. For production work you want:

- **Automated tests** — [Testing Guide](/docs/smart-contracts/testing-guide)
- **Scripted deployments** — [Hardhat](/docs/smart-contracts/hardhat-guide) or [Foundry](/docs/smart-contracts/foundry-guide)
- **CI/CD** — [CI/CD Pipelines](/docs/smart-contracts/ci-cd-pipelines)

## See Also

- [Environment Setup](/docs/smart-contracts/environment-setup) — full local toolchain
- [XDC Wallet Guide](/docs/smart-contracts/xdc-wallet) — wallet and network configuration
- [Gas Fees](/docs/learn/gas-fees) — what transactions cost on XDC
