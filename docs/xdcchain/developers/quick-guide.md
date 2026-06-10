---
title: Deploy Your First Contract on XDC
---

# Deploy Your First Contract on XDC

> ⏱️ Time: 5 minutes | 🎯 Skill Level: Beginner | 🔗 EVM Experience: Not required

This guide takes you from zero to a deployed smart contract on the **XDC Apothem Testnet** — no prior blockchain experience needed. By the end, you'll have a live "Hello World" contract you can interact with.

---

## What You'll Build

A simple `HelloWorld` smart contract that stores a message and lets anyone update it. You'll deploy it using [Remix IDE](https://remix.xdc.network/) and verify it on [XDCScan](https://testnet.xdcscan.com/).

---

## Prerequisites

- [Chrome](https://www.google.com/chrome/), [Firefox](https://www.mozilla.org/firefox/), or [Brave](https://brave.com/) browser
- [MetaMask](https://metamask.io/download/) browser extension installed

---

## Step 1: Install MetaMask

1. Visit [metamask.io/download](https://metamask.io/download/) and install the extension for your browser.
2. Follow the setup wizard to create a new wallet.
3. **Save your Secret Recovery Phrase** somewhere safe (offline). Never share it with anyone.

> 💡 **Tip:** MetaMask will ask you to set a password. This is only for unlocking the extension on your computer — your seed phrase controls the actual wallet.

---

## Step 2: Add XDC Apothem Testnet to MetaMask

Click the button below, or add the network manually using the values below:

| Field | Value |
|-------|-------|
| **Network Name** | XDC Apothem Testnet |
| **RPC URL** | `https://rpc.apothem.network` |
| **Chain ID** | `51` |
| **Currency Symbol** | XDC |
| **Block Explorer** | `https://testnet.xdcscan.com` |

![MetaMask Add Network](../assets/metamask-add-network.png){ width="400" }

> 🔗 **Mainnet equivalent:** To add XDC Mainnet later, use Chain ID `50` and RPC `https://rpc.xinfin.network`.

---

## Step 3: Get Test XDC from the Faucet

You need a small amount of test XDC to pay for deployment (gas fees).

1. Copy your wallet address from MetaMask (click the address at the top to copy).
   - It will look like `0x...` — this is normal. XDC also supports the `xdc...` prefix, but MetaMask uses `0x` format.
2. Go to **[faucet.apothem.network](https://faucet.apothem.network/)**
3. Paste your wallet address and click **Request 1000 XDC**.
4. Wait 10–30 seconds. You should see 1000 XDC appear in your MetaMask (make sure the XDC Apothem network is selected).

> ⚠️ **Note:** If the faucet doesn't respond, try refreshing the page or using the [BlocksScan faucet](https://faucet.blocksscan.io/).

---

## Step 4: Write Your HelloWorld Contract

We'll write the contract in [Remix IDE](https://remix.xdc.network/) — no local setup needed.

1. Open **[Remix IDE](https://remix.xdc.network/)** in your browser.
2. In the **File Explorer** (left sidebar), click the **📁 contracts** folder.
3. Click **➕** (Create New File) and name it `HelloWorld.sol`.
4. Paste this code:

```solidity title="HelloWorld.sol"
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract HelloWorld {
    string public message = "Hello, XDC!";

    function updateMessage(string memory _newMessage) public {
        message = _newMessage;
    }
}
```

> 💡 **What this does:** It stores a `message` string and provides a function `updateMessage()` that anyone can call to change it.

---

## Step 5: Compile the Contract

1. Click the **Solidity Compiler** tab (🛠️ icon) in the left sidebar.
2. Select compiler version `0.8.19` (or any `0.8.x` that matches the `pragma` line).
3. Click **Compile HelloWorld.sol**.

> ✅ You should see a green checkmark next to the compiler tab. If you see errors, double-check the Solidity version matches.

---

## Step 6: Deploy to Apothem Testnet

1. Click the **Deploy & Run Transactions** tab (▶️ icon) in the left sidebar.
2. Under **Environment**, select **Injected Provider — MetaMask**.
3. MetaMask will pop up and ask you to connect — click **Connect**.
4. Make sure your MetaMask is set to the **XDC Apothem Testnet** (Chain ID 51).
5. Select `HelloWorld` from the contract dropdown.
6. Click **Deploy**.
7. MetaMask will ask you to confirm the transaction — click **Confirm**.

> ⏱️ Deployment takes about **2 seconds** on XDC (compared to 12+ seconds on Ethereum).

---

## Step 7: Verify Your Deployment on XDCScan

Once deployed, you can see your contract live on the blockchain.

1. In Remix, scroll down to the **Deployed Contracts** section.
2. Click the 📋 copy icon next to your contract address.
3. Go to **[testnet.xdcscan.com](https://testnet.xdcscan.com/)**
4. Paste the address in the search bar and press Enter.
5. You should see your contract page. Click **Contract** → **Verify & Publish**.
6. Select:
   - **Compiler Type:** Solidity (Single file)
   - **Compiler Version:** 0.8.19
   - **License:** MIT
7. Paste your `HelloWorld.sol` code into the text box.
8. Click **Verify & Publish**.

> ✅ Once verified, anyone can read your source code directly on XDCScan. This builds trust and transparency.

---

## Step 8: Interact with Your Contract

Back in Remix, under **Deployed Contracts**, you can interact directly:

- **message** — Click this button to read the current message (it should show `"Hello, XDC!"`).
- **updateMessage** — Type something like `"XDC is awesome!"` in the text field, then click the button. MetaMask will ask you to confirm (no cost on testnet for simple calls, but state changes need a small gas fee).
- Refresh the **message** button — it should now show your new text!

> 🎉 **Congratulations!** You've deployed, verified, and interacted with your first smart contract on XDC.

---

## Next Steps

Now that you've deployed your first contract, here's where to go next:

- [**Build a Token with Hardhat** →](../smart-contract-developments/hardhat.md)  
  Create an ERC-20 token using Hardhat and deploy it to mainnet.

- [**Create an NFT Collection** →](../smart-contract-developments/remix.md)  
  Mint your own NFTs using XRC-721.

- [**Set up a Local Development Environment** →](../smart-contract-developments/hardhat.md)  
  Install Hardhat or Foundry for professional development workflows.

- [**Learn JavaScript SDK Integration** →](../sdks/javascript.md)  
  Build a frontend that interacts with your contract from a React app.

- [**Smart Contract Security Best Practices** →](../security/smart-contracts.md)  
  Learn how to protect your contracts before deploying to mainnet.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| MetaMask won't connect | Make sure you're on **Injected Provider — MetaMask**, not JavaScript VM |
| "Insufficient funds" error | Get more test XDC from the [faucet](https://faucet.apothem.network/) |
| Deployment takes too long | Check that MetaMask is set to **XDC Apothem Testnet** (Chain ID 51), not Ethereum |
| Contract not showing on XDCScan | Wait 5–10 seconds and refresh. XDC's 2-second block time means it's usually instant |
| Can't verify contract | Make sure compiler version in Remix matches exactly what you selected on XDCScan |

---

## Quick Reference — XDC Networks

| Network | Chain ID | RPC URL | Explorer |
|---------|----------|---------|----------|
| **Mainnet** | `50` | `https://rpc.xinfin.network` | [xdcscan.com](https://xdcscan.com) |
| **Apothem Testnet** | `51` | `https://rpc.apothem.network` | [testnet.xdcscan.com](https://testnet.xdcscan.com) |
| **Devnet** | `551` | `https://devnetrpc.xinfin.network` | — |

- **Native token:** `XDC`
- **Address prefix:** `xdc` (XDCScan shows `xdc`; EVM tools use `0x` — both are valid)
- **Faucet:** [faucet.apothem.network](https://faucet.apothem.network)
- **Block time:** ~2 seconds
- **Gas model:** Legacy (not EIP-1559 on mainnet; EIP-1559 testnet rollout in progress)

---

*Happy building on XDC! 🚀*
