---
title: Deploy Smart Contracts
description: Deploy smart contracts to XDC Apothem Testnet using Remix, Hardhat, or Foundry. Complete guides with copy-paste configs.
---

Difficulty: Beginner | Time: ~15 minutes | Tools: Remix / Hardhat / Foundry, MetaMask

# Deploy Smart Contracts

This guide covers deploying smart contracts to the XDC Apothem Testnet using three popular tools: Remix (browser), Hardhat (JavaScript), and Foundry (Rust).

## Prerequisites

- [Environment Setup](./setup.md) completed
- [Writing Your First Contract](./writing.md) completed
- MetaMask with XDC Apothem Testnet configured
- Test XDC from [faucet.apothem.network](https://faucet.apothem.network)

---

## Option 1 — Remix (Browser)

No installation required. Everything happens in your browser.

### Step 1 — Open Remix

Navigate to [remix.xinfin.network](https://remix.xinfin.network/).

### Step 2 — Write Contract

1. In the **File Explorer**, click **📁 contracts**
2. Click **➕** and create `Counter.sol`
3. Paste your contract code

### Step 3 — Compile

1. Click **Solidity Compiler** tab (🛠️)
2. Select version `0.8.24`
3. Click **Compile**

### Step 4 — Connect MetaMask

1. Click **Deploy & Run Transactions** tab (🚀)
2. Select **Injected Provider — MetaMask**
3. Connect your wallet

### Step 5 — Deploy

1. Select your contract from the dropdown
2. Click **Deploy**
3. Confirm the transaction in MetaMask

**Expected result:** Contract appears under **Deployed Contracts** within 10 seconds.

### Step 6 — Interact

Expand the deployed contract to see:
- **increment** — Click to add 1
- **decrement** — Click to subtract 1
- **getCount** — Click to read value

---

## Option 2 — Hardhat

### Step 1 — Create Deploy Script

Create `scripts/deploy.ts`:

```typescript title="scripts/deploy.ts"
import { ethers } from "hardhat";

async function main() {
  const Counter = await ethers.getContractFactory("Counter");
  const counter = await Counter.deploy();

  await counter.waitForDeployment();

  const address = await counter.getAddress();
  console.log(`Counter deployed to: ${address}`);
  console.log(`View on XDCScan: https://testnet.xdcscan.com/address/${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

### Step 2 — Deploy

```bash title="Terminal"
npx hardhat run scripts/deploy.ts --network apothem
```

**Expected output:**

```
Counter deployed to: 0x1234567890abcdef1234567890abcdef12345678
View on XDCScan: https://testnet.xdcscan.com/address/0x1234567890abcdef1234567890abcdef12345678
```

### Step 3 — Verify

```bash title="Terminal"
npx hardhat verify --network apothem 0xYOUR_CONTRACT_ADDRESS
```

---

## Option 3 — Foundry

### Step 1 — Create Deploy Script

Create `script/Counter.s.sol`:

```solidity title="script/Counter.s.sol"
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {Counter} from "../src/Counter.sol";

contract CounterScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        Counter counter = new Counter();

        vm.stopBroadcast();

        console.log("Counter deployed to:", address(counter));
    }
}
```

### Step 2 — Deploy

```bash title="Terminal"
source .env
forge script script/Counter.s.sol --rpc-url apothem --broadcast
```

**Expected output:**

```
Counter deployed to: 0x1234567890abcdef1234567890abcdef12345678
```

### Step 3 — Verify

```bash title="Terminal"
forge verify-contract 0xYOUR_CONTRACT_ADDRESS src/Counter.sol:Counter --chain 51 --verifier-url https://testnet.xdcscan.com/api
```

---

## Deployment Checklist

Before deploying to mainnet:

- [ ] All tests pass with 100% coverage
- [ ] Contract audited or reviewed
- [ ] Admin keys stored securely (multi-sig recommended)
- [ ] Emergency pause functionality implemented
- [ ] Upgrade path documented (if applicable)
- [ ] Gas optimization verified
- [ ] Events emitted for all state changes

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| MetaMask not connecting | Wrong network | Switch to XDC Apothem |
| "Insufficient funds" | No test XDC | Visit faucet |
| Deployment hangs | MetaMask popup blocked | Allow popups |
| "Nonce too high" | Out of sync | Reset MetaMask account |
| Verify fails | Wrong compiler version | Match exact version |

---

## Next Steps

- [Verify on XDCScan →](./verify.md)
- [Monitor Contract →](./monitoring.md)
- [Security Best Practices →](../security/security-practices.md)
