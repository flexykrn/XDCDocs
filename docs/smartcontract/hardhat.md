---
title: Deploy and Verify with Hardhat
description: Complete Hardhat guide for XDC — project setup, config, compile, deploy to Apothem Testnet, verify on XDCScan, and interact from the terminal. Copy-paste ready.
---

Difficulty: Beginner | Time: ~15 minutes | Tools: Node.js 18+, Hardhat, MetaMask

# Deploy and Verify with Hardhat

Hardhat is a professional Ethereum development environment that works seamlessly with XDC. This guide takes you from an empty folder to a deployed, verified smart contract on the XDC Apothem Testnet — with every command and config copy-paste ready.

By the end you will have:

- A working Hardhat project configured for XDC Mainnet and Apothem Testnet
- A deployed `Counter` contract on Apothem
- The contract verified on XDCScan Testnet
- A local script to read and write the counter value

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later — `node --version` should print `v18.x.x` or higher
- A code editor (VS Code recommended)
- MetaMask with the XDC Apothem Testnet added ([Quick Guide](../xdcchain/developers/quick-guide.md) if you need help)
- Test XDC from [faucet.apothem.network](https://faucet.apothem.network)

> 💡 **XDC Address Format**  
> XDCScan shows addresses with an `xdc` prefix (e.g., `xdc1234…`). EVM tools like Hardhat use the `0x` prefix (e.g., `0x1234…`). Both refer to the same account — the prefix is the only difference. Hardhat configs always use `0x`.

---

## Step 1 — Create the Project

Open a terminal and run:

```bash title="Terminal"
mkdir xdc-hardhat && cd xdc-hardhat
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npx hardhat init
```

Select **"Create an empty hardhat.config.js"** when prompted.

Your folder should now contain:

```
xdc-hardhat/
├── hardhat.config.js
├── package.json
└── node_modules/
```

---

## Step 2 — Configure Hardhat for XDC

Replace the contents of `hardhat.config.js` with the following. This adds both XDC Mainnet and Apothem Testnet, plus the XDCScan API endpoints for automatic verification.

```javascript title="hardhat.config.js"
require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",
  networks: {
    xdc: {
      url: "https://rpc.xinfin.network",
      chainId: 50,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    apothem: {
      url: "https://rpc.apothem.network",
      chainId: 51,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: {
      xdc: "none",
      apothem: "none",
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

Save your deployer private key in a `.env` file (never commit this file):

```bash title="Terminal"
echo "PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE" > .env
npm install --save-dev dotenv
```

Add `require("dotenv").config();` to the very top of `hardhat.config.js`.

> ⚠️ **Security**  
> `.env` contains your private key. Add it to `.gitignore` immediately:
> ```bash
> echo ".env" >> .gitignore
> ```

---

## Step 3 — Write the Counter Contract

Create the contracts folder and file:

```bash title="Terminal"
mkdir contracts
touch contracts/Counter.sol
```

Paste this into `contracts/Counter.sol`:

```solidity title="Counter.sol"
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Counter {
    uint256 public count;

    event CountIncremented(uint256 newCount);

    function increment() external {
        count += 1;
        emit CountIncremented(count);
    }

    function decrement() external {
        require(count > 0, "Counter: cannot decrement below zero");
        count -= 1;
    }

    function getCount() external view returns (uint256) {
        return count;
    }
}
```

> 💡 **What this does**  
> `count` is a public state variable. `increment()` adds 1 and emits an event. `decrement()` subtracts 1 with a safety check. `getCount()` returns the current value.

---

## Step 4 — Compile

```bash title="Terminal"
npx hardhat compile
```

**Expected output:**

```
Compiled 1 Solidity file successfully (evm target: shanghai).
```

If you see errors, check that the Solidity version in `hardhat.config.js` matches the `pragma` line in `Counter.sol`.

---

## Step 5 — Deploy to Apothem Testnet

Create the deployment script:

```bash title="Terminal"
mkdir scripts
touch scripts/deploy.js
```

Paste this into `scripts/deploy.js`:

```javascript title="scripts/deploy.js"
const hre = require("hardhat");

async function main() {
  const Counter = await hre.ethers.getContractFactory("Counter");
  const counter = await Counter.deploy();

  await counter.waitForDeployment();

  const address = await counter.getAddress();
  console.log(`Counter deployed to: ${address}`);
  console.log(`View on XDCScan Testnet: https://testnet.xdcscan.com/address/${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

Run the deployment:

```bash title="Terminal"
npx hardhat run scripts/deploy.js --network apothem
```

**Expected output:**

```
Counter deployed to: 0x1234567890abcdef1234567890abcdef12345678
View on XDCScan Testnet: https://testnet.xdcscan.com/address/0x1234567890abcdef1234567890abcdef12345678
```

Copy the contract address — you will need it for verification and interaction.

> ⏱️ **XDC Confirmations**  
> XDC has 2-second block times. Deployment usually confirms within 5–10 seconds.

---

## Step 6 — Verify on XDCScan

Run the Hardhat verify task with your deployed address:

```bash title="Terminal"
npx hardhat verify --network apothem 0xYOUR_CONTRACT_ADDRESS
```

**Expected output:**

```
Successfully submitted source code for contract
contracts/Counter.sol:Counter at 0xYOUR_CONTRACT_ADDRESS
for verification on the block explorer. Waiting for verification result...

Successfully verified contract Counter on the block explorer.
https://testnet.xdcscan.com/address/0xYOUR_CONTRACT_ADDRESS#code
```

Click the XDCScan link to confirm the source code is visible.

> 🔍 **Verification Failed?**  
> See the [Troubleshooting](#troubleshooting) section below.

---

## Step 7 — Interact from the Terminal

Create an interaction script:

```bash title="Terminal"
touch scripts/interact.js
```

Paste this into `scripts/interact.js` (replace `YOUR_CONTRACT_ADDRESS`):

```javascript title="scripts/interact.js"
const hre = require("hardhat");

const CONTRACT_ADDRESS = "0xYOUR_CONTRACT_ADDRESS";

async function main() {
  const Counter = await hre.ethers.getContractFactory("Counter");
  const counter = Counter.attach(CONTRACT_ADDRESS);

  // Read current count
  let count = await counter.getCount();
  console.log(`Current count: ${count.toString()}`);

  // Increment
  console.log("Incrementing...");
  const tx = await counter.increment();
  await tx.wait();

  // Read again
  count = await counter.getCount();
  console.log(`New count: ${count.toString()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

Run it:

```bash title="Terminal"
npx hardhat run scripts/interact.js --network apothem
```

**Expected output:**

```
Current count: 0
Incrementing...
New count: 1
```

---

## Step 8 — Deploy to XDC Mainnet (Optional)

Once you are confident with the testnet flow, deploying to mainnet is identical — just change the network flag and ensure your wallet has real XDC for gas.

```bash title="Terminal"
npx hardhat run scripts/deploy.js --network xdc
npx hardhat verify --network xdc 0xYOUR_MAINNET_CONTRACT_ADDRESS
```

> ⚠️ **Mainnet costs real XDC**  
> XDC gas fees are low (~0.0001 XDC per transaction), but you still need mainnet XDC in your deployer wallet. Buy XDC on exchanges or bridge from other chains.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Invalid API Key` during verify | Hardhat Etherscan plugin expects a key | Set `apiKey: { xdc: "none", apothem: "none" }` — XDCScan does not require a key |
| `Network not found` | Custom chain not registered | Double-check the `customChains` array in `hardhat.config.js` |
| `Nonce too high` | MetaMask and Hardhat nonces out of sync | Reset MetaMask account: Settings → Advanced → Reset Account |
| `insufficient funds` | Wallet has no test XDC | Visit [faucet.apothem.network](https://faucet.apothem.network) |
| `cannot estimate gas` | Contract constructor reverts | Check constructor arguments and contract logic |
| Verification hangs | XDCScan API delay | Wait 30 seconds and retry; check the contract page manually |

---

## 🚀 Next Steps

You've deployed with Hardhat. Expand your skills:

1. **[Verify on XDCScan →](./verify.md)** — Publish source code automatically (⏱️ 5 min)
2. **[Contract Monitoring →](./monitoring.md)** — Track events and transactions (⏱️ 20 min)
3. **[Token Standards →](./tokens.md)** — Deploy an XRC20 token with OpenZeppelin (⏱️ 20 min)

Or explore:
- [Foundry Alternative →](./foundry.md) — Rust-based toolkit comparison
- [Upgradeability →](./upgradeability.md) — Proxy patterns for upgradable contracts
- [Security Best Practices →](../security/security-practices.md) — Pre-mainnet checklist

---


