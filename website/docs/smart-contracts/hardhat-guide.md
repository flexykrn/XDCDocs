---
title: Hardhat Guide
sidebar_position: 25
description: Build, test, deploy, and verify smart contracts on the XDC Network with Hardhat — project setup, XDC network configuration, deployment to Apothem, and XDCScan verification.
---

# Hardhat Guide

Hardhat is the most widely used Ethereum development environment, and it works on the XDC Network out of the box thanks to full EVM compatibility. It gives you a JavaScript/TypeScript toolchain with Mocha/Chai tests, a rich plugin ecosystem, `console.log` debugging, and scripted deployments against XDC mainnet (chain ID 50) and Apothem Testnet (chain ID 51).

This guide walks through a complete Hardhat workflow for XDC: project setup, network configuration, compiling, testing, deploying to Apothem, and verifying on the explorer.

## When to Use Hardhat

Choose Hardhat when you want a JavaScript/TypeScript workflow, a large plugin ecosystem, and straightforward CI integration — it is the default recommendation for teams. If you prefer Solidity-native tests, faster execution, and built-in fuzzing, use [Foundry](/docs/smart-contracts/foundry-guide) instead.

## Project Setup

**Step 1: Initialize a project**

```bash
mkdir xdc-hardhat && cd xdc-hardhat
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox dotenv
npx hardhat init
```

Choose "Create a JavaScript project" when prompted. This scaffolds `contracts/`, `scripts/`, `test/`, and a starter `hardhat.config.js`.

## Configure XDC Networks

Replace the contents of `hardhat.config.js` with XDC mainnet and Apothem network blocks using the canonical RPC URLs and chain IDs:

```javascript
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.24",
  networks: {
    xdc: {
      url: "https://rpc.xinfin.network",
      chainId: 50,
      accounts: [process.env.PRIVATE_KEY],
    },
    apothem: {
      url: "https://rpc.apothem.network",
      chainId: 51,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
};
```

**Never hardcode your private key.** Keep it in a `.env` file loaded via `dotenv`, add `.env` to `.gitignore`, and verify with `git check-ignore .env`. XDC Network supports Solidity up to 0.8.24 — do not pin a newer compiler.

## Write and Compile a Contract

Create `contracts/Vault.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Vault {
    address public owner;
    mapping(address => uint256) public balances;

    event Deposit(address indexed from, uint256 amount);
    event Withdrawal(address indexed to, uint256 amount);

    constructor() {
        owner = msg.sender;
    }

    function deposit() external payable {
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        payable(msg.sender).transfer(amount);
        emit Withdrawal(msg.sender, amount);
    }
}
```

Compile it:

```bash
npx hardhat compile
```

Artifacts are written to `artifacts/` and ABI/bytecode caches to `cache/`.

## Test

Write a quick test in `test/Vault.js`:

```javascript
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Vault", function () {
  it("accepts deposits and tracks balances", async function () {
    const [alice] = await ethers.getSigners();
    const Vault = await ethers.getContractFactory("Vault");
    const vault = await Vault.deploy();

    await vault.connect(alice).deposit({ value: ethers.parseEther("1.0") });
    expect(await vault.balances(alice.address)).to.equal(ethers.parseEther("1.0"));
  });
});
```

Run it:

```bash
npx hardhat test
```

For coverage, fork testing, fuzzing, and testnet rehearsal, see the [Smart Contract Testing Guide](/docs/smart-contracts/testing-guide).

## Deploy to Apothem

Get free test XDC from the [Apothem faucet](https://faucet.apothem.network), then create `scripts/deploy.js`:

```javascript
const { ethers } = require("hardhat");

async function main() {
  const Vault = await ethers.getContractFactory("Vault");
  const vault = await Vault.deploy();
  await vault.waitForDeployment();

  console.log("Vault deployed to:", await vault.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

Run the deployment:

```bash
npx hardhat run scripts/deploy.js --network apothem
```

Expected output:

```text
Vault deployed to: 0x1234567890abcdef1234567890abcdef12345678
```

Save the address — you need it for verification. For mainnet, rerun with `--network xdc` after a full Apothem rehearsal.

## Verify on the Explorer

Verification publishes your source on the explorer so anyone can read and interact with the contract. Install the verification plugin (included in `hardhat-toolbox`, or standalone):

```bash
npm install --save-dev @nomicfoundation/hardhat-verify
```

XDCScan is not a default Etherscan chain, so add a custom chain entry to `hardhat.config.js`. XDCScan's API is Blockscout-compatible — check the current endpoint URLs at https://docs.xdcscan.com/getting-started/endpoint-urls:

```javascript
module.exports = {
  // ...solidity and networks from above
  etherscan: {
    apiKey: {
      xdc: "abc", // any non-empty string; Blockscout APIs do not require a key
      apothem: "abc",
    },
    customChains: [
      {
        network: "xdc",
        chainId: 50,
        urls: {
          apiURL: "https://xdcscan.com/api",
          browserURL: "https://xdcscan.com",
        },
      },
      {
        network: "apothem",
        chainId: 51,
        urls: {
          apiURL: "https://testnet.xdcscan.com/api",
          browserURL: "https://testnet.xdcscan.com",
        },
      },
    ],
  },
};
```

Then verify:

```bash
npx hardhat verify --network apothem 0x1234567890abcdef1234567890abcdef12345678
```

If verification through the CLI fails, the explorer UI also supports Standard Input JSON and multi-part verification — see [Deployment & Verification](/docs/smart-contracts/deployment-verification) for the UI method.

## Debugging with console.log

Hardhat lets you log directly from Solidity during local tests:

```solidity
import "hardhat/console.sol";

function withdraw(uint256 amount) external {
    console.log("withdraw requested:", amount, "balance:", balances[msg.sender]);
    require(balances[msg.sender] >= amount, "Insufficient balance");
    // ...
}
```

The logs print when you run `npx hardhat test`. Remove them before deploying — they revert on live networks. For traces, fork debugging, and XDC-specific pitfalls, see the [Smart Contract Debugging Guide](/docs/smart-contracts/debugging).

## See Also

- [Foundry Guide](/docs/smart-contracts/foundry-guide) — the Rust-based alternative with Solidity-native tests.
- [Smart Contract Testing Guide](/docs/smart-contracts/testing-guide) — coverage, fuzzing, fork testing, and Apothem rehearsal.
- [CI/CD Pipelines for Smart Contract Deployment](/docs/smart-contracts/ci-cd-pipelines) — automate tests and deployments with GitHub Actions.
- [Deployment & Verification](/docs/smart-contracts/deployment-verification) — Remix deployment and explorer verification via the UI.
- [Smart Contract Debugging Guide](/docs/smart-contracts/debugging) — traces, revert decoding, and fork debugging.
