---
title: Deploy and Verify with Remix
description: Complete Remix IDE guide for XDC — write, compile, deploy to Apothem Testnet via MetaMask, and verify on XDCScan. Browser-only, no local setup.
---

Difficulty: Beginner | Time: ~10 minutes | Tools: Browser, MetaMask, Remix IDE

# Deploy and Verify with Remix

Remix is a browser-based IDE for Solidity development. It requires zero installation — everything happens in your browser. This guide takes you from an empty file to a deployed, verified smart contract on the XDC Apothem Testnet.

By the end you will have:

- A `Counter` contract written and compiled in Remix
- The contract deployed to XDC Apothem Testnet through MetaMask
- The contract verified on XDCScan Testnet
- A verified ability to call `increment()` and read the count

## Prerequisites

- [Chrome](https://www.google.com/chrome/), [Firefox](https://www.mozilla.org/firefox/), or [Brave](https://brave.com/) browser
- [MetaMask](https://metamask.io/download/) extension installed
- XDC Apothem Testnet added to MetaMask ([Quick Guide](../xdcchain/developers/quick-guide.md) if you need help)
- Test XDC from [faucet.apothem.network](https://faucet.apothem.network)

> 💡 **XDC Address Format**  
> XDCScan shows addresses with an `xdc` prefix (e.g., `xdc1234…`). MetaMask and Remix use the `0x` prefix (e.g., `0x1234…`). Both refer to the same account — the prefix is the only difference. Remix configs always use `0x`.

---

## Step 1 — Open Remix IDE

Navigate to [remix.xinfin.network](https://remix.xinfin.network/) in your browser.

The interface has four main panels:

- **Left sidebar** — File explorer, Solidity compiler, Deploy & run
- **Main editor** — Where you write code
- **Right sidebar** — Plugin manager, settings
- **Bottom panel** — Terminal output

---

## Step 2 — Write the Counter Contract

1. In the **File Explorer** (left sidebar), click the **📁 contracts** folder.
2. Click **➕** (Create New File) and name it `Counter.sol`.
3. Paste this code into the editor:

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

## Step 3 — Compile

1. Click the **Solidity Compiler** tab (🛠️ icon) in the left sidebar.
2. Select compiler version `0.8.24` from the dropdown.
3. Click **Compile Counter.sol**.

**Expected result:** A green checkmark appears next to the compiler tab.

If you see errors:
- Check that the compiler version matches the `pragma` line
- Ensure there are no typos in the contract name

---

## Step 4 — Connect MetaMask to XDC Apothem

1. Open MetaMask and switch to the **XDC Apothem Testnet**.
2. In Remix, click the **Deploy & Run Transactions** tab (🚀 icon).
3. In the **Environment** dropdown, select **Injected Provider — MetaMask**.
4. MetaMask will prompt you to connect — click **Connect**.

Your wallet address should now appear in the **Account** field.

> ⚠️ **If MetaMask does not appear**  
> Ensure MetaMask is unlocked and the XDC Apothem network is selected. Refresh the page if needed.

---

## Step 5 — Deploy

1. Make sure **Counter** is selected in the **Contract** dropdown.
2. Click **Deploy**.
3. MetaMask will open a transaction confirmation — click **Confirm**.

**Expected result:**
- A "creation of Counter pending..." message appears in the terminal
- After 5–10 seconds, the deployed contract appears under **Deployed Contracts**

> ⏱️ **XDC Confirmations**  
> XDC has 2-second block times. Deployment usually confirms within 5–10 seconds.

---

## Step 6 — Interact

Expand the deployed contract under **Deployed Contracts**. You will see three buttons:

- **increment** — Orange button (costs gas)
- **decrement** — Orange button (costs gas)
- **getCount** — Blue button (free, read-only)
- **count** — Blue button (free, reads public variable)

**Test the contract:**
1. Click **getCount** — it should return `0`.
2. Click **increment** — confirm the MetaMask transaction.
3. Click **getCount** again — it should now return `1`.

---

## Step 7 — Verify on XDCScan

1. Copy the contract address from the **Deployed Contracts** section.
2. Open [testnet.xdcscan.com](https://testnet.xdcscan.com) in a new tab.
3. Paste the address into the search bar and press Enter.
4. Click the **Contract** tab.
5. Click **Verify and Publish**.

**Fill in the verification form:**

| Field | Value |
|-------|-------|
| Compiler Type | Solidity (Single file) |
| Compiler Version | 0.8.24 |
| License Type | MIT |

6. Paste the full `Counter.sol` source code into the text area.
7. Click **Verify and Publish**.

**Expected result:**
- A success message appears
- The **Contract** tab now shows the source code
- A green checkmark appears next to the contract name

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| MetaMask not connecting | Wrong network selected | Switch to XDC Apothem Testnet in MetaMask |
| "Insufficient funds" | No test XDC | Visit [faucet.apothem.network](https://faucet.apothem.network) |
| Compilation fails | Version mismatch | Ensure compiler version matches `pragma` |
| Deployment hangs | MetaMask popup blocked | Allow popups for remix.xinfin.network |
| Verify fails | Wrong compiler version | Double-check the exact version used in Remix |
| Cannot find contract | Wrong address | Copy the address from Remix, not MetaMask |

---

## Next Steps

- [Deploy with Hardhat](./hardhat.md) — automate deployment with JavaScript
- [Deploy with Foundry](./foundry.md) — use the fast Rust-based toolkit
- [XRC20 Token Guide](./tokens.md) — deploy a fungible token with OpenZeppelin
