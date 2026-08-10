---
title: XDC Web Wallet
sidebar_position: 7
---

# XDC Wallet Setup

This guide walks you through choosing, setting up, and using a wallet on XDC Network — for both mainnet and the Apothem testnet. Because XDC is fully EVM-compatible, any Ethereum wallet works with the network parameters below.

## Wallet Options

| Wallet | Custody | Best For |
|---|---|---|
| **MetaMask** | Self-custody (hot wallet) | Most users — best tooling and dApp support |
| **XDC Wallet (XDCPay)** | Self-custody (hot wallet) | XDC-native experience, built-in XDC network support |
| **Ledger** | Hardware (cold wallet) | Securing large balances, long-term holdings |
| **Mobile wallets** (e.g. Trust Wallet) | Self-custody (hot wallet) | Payments and checking balances on the go |

Not sure which to pick? Start with **MetaMask** — it is the most widely supported across XDC tooling. Add a **Ledger** later for funds you don't plan to move often.

## MetaMask Setup

### Option 1: Native Support (Recommended)

MetaMask supports XDC Network natively:

1. Open MetaMask and click the network dropdown
2. Click **"Add Network"**
3. Search for **"XDC"** in the network list
4. Select **XDC Mainnet** and approve

### Option 2: Manual Configuration

Use manual setup if you need the Apothem testnet or the network doesn't appear in search.

1. Open MetaMask → network dropdown → **Add Network** → **Add a network manually**
2. Enter the parameters below
3. Save and switch to the new network

#### XDC Mainnet

| Parameter | Value |
|---|---|
| Network Name | XDC Mainnet |
| RPC URL | `https://erpc.xinfin.network` |
| Chain ID | 50 |
| Symbol | XDC |
| Block Explorer | `https://xdcscan.com` |

**Alternative RPC URLs:**

- `https://rpc.xdc.org`
- `https://earpc.xinfin.network`

#### Apothem Testnet

| Parameter | Value |
|---|---|
| Network Name | XDC Apothem Testnet |
| RPC URL | `https://rpc.apothem.network` |
| Chain ID | 51 |
| Symbol | TXDC |
| Block Explorer | `https://testnet.xdcscan.com` |

{/* TODO(screenshot): MetaMask "Add a network manually" form filled with XDC Mainnet values */}
{/* TODO(screenshot): MetaMask network dropdown showing XDC Mainnet selected */}

For more RPC endpoints and latency tips, see [Wallet Configuration](/docs/xdc-chain/developers/wallet-configuration).

## XDC Wallet (XDCPay) Setup

XDCPay is the XDC-native browser extension wallet:

1. Install the XDCPay extension for your browser
2. Create a new wallet or import an existing one with your seed phrase
3. XDC Mainnet and Apothem Testnet are pre-configured — switch networks from the dropdown
4. Back up your seed phrase offline before funding the wallet

The legacy XDC Web Wallet is also available at https://betawallet.xinfin.network/

{/* TODO(screenshot): XDCPay network dropdown with Apothem selected */}

## Ledger (Hardware Wallet)

1. Install the **Ethereum app** on your Ledger via Ledger Live — XDC is EVM-compatible, so the Ethereum app signs XDC transactions
2. Connect Ledger to MetaMask: **Account menu → Add account or hardware wallet → Ledger**
3. Use the XDC network parameters above; your Ledger-derived address works on XDC unchanged

:::warning[Blind Signing]
Some contract interactions require enabling **blind signing** (Contract Data) in the Ethereum app settings on the device. Only enable it when interacting with contracts you trust, and always verify transaction details on the Ledger screen before approving.
:::

## Receiving and Sending XDC

- **Receive:** Copy your address from your wallet and share it with the sender. Balances appear after one block (~2 seconds).
- **Send:** Paste the recipient address, enter an amount, and confirm. Gas fees are near-zero (~$0.0001), but keep a small XDC balance to pay for gas.
- **Verify:** Look up the transaction hash on [xdcscan.com](https://xdcscan.com) (mainnet) or [testnet.xdcscan.com](https://testnet.xdcscan.com) (Apothem).

### Adding XRC20 Tokens

1. Open your wallet → **Import tokens**
2. Paste the token's contract address
3. Symbol and decimals auto-fill; confirm to add

See [Tokens](/docs/smart-contracts/tokens) for details on XRC20 and other XDC token standards.

## Understanding `xdc` vs `0x` Addresses

XDC addresses are identical to Ethereum addresses — only the display prefix differs:

- XDCScan shows `xdc1234567890abcdef1234567890abcdef12345678`
- MetaMask shows `0x1234567890abcdef1234567890abcdef12345678`

Both refer to the same account. To convert, replace `xdc` with `0x` (or vice versa) — the rest of the address is unchanged. When pasting an `xdc`-prefixed address into MetaMask, convert it to `0x` first.

Developers can convert programmatically with the [XDC3.js SDK](/docs/xdc-chain/developers/xdc3js-sdk).

## Getting Test XDC

Use the [Apothem Faucet](https://faucet.apothem.network) to get free test XDC:

1. Switch your wallet to **XDC Apothem Testnet**
2. Paste your address into the faucet and submit
3. You'll receive 1000 test XDC instantly

Test XDC has no real value — use it freely for development. If the faucet limit is reached, wait 24 hours or try an alternative faucet listed in the [FAQ](/docs/xdc-chain/faq).

## Troubleshooting

| Problem | Fix |
|---|---|
| **Wrong network** | Check the network dropdown — Chain ID 50 for mainnet, 51 for Apothem. Balances don't carry across networks. |
| **Balance missing after adding network** | Confirm the RPC URL is correct and the address is the same one that holds funds; try an alternative RPC endpoint. |
| **Transaction stuck or pending** | Ensure gas price is at least 0.25 Gwei and resubmit; see [FAQ — Troubleshooting](/docs/xdc-chain/faq#troubleshooting). |
| **Tokens not showing** | Tokens don't auto-appear — import the contract address manually via **Import tokens**. |
| **"Nonce too high" error** | Reset your MetaMask account: Settings → Advanced → **Reset Account** (clears local history, funds are unaffected). |

Still stuck? See the full [Troubleshooting section](/docs/xdc-chain/faq#troubleshooting) in the FAQ.

## Security Basics

- **Never share your seed phrase or private key** — no legitimate support team will ever ask for it
- **Store your seed phrase offline** — on paper or a metal backup, never in email, screenshots, or cloud notes
- **Use a hardware wallet for large funds** — keep only spending amounts in hot wallets
- **Verify before signing** — double-check recipient addresses and transaction details on every approval

For contract-level security guidance, see [Security Best Practices](/docs/smart-contracts/security-best-practices).
