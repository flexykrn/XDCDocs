---
title: Wallet Configuration — XDC Network
description: Step-by-step wallet setup guides for MetaMask, Trust Wallet, Ledger, Trezor, TokenPocket, and XDCPay on XDC Network.
---

# Wallet Configuration

XDC Network is fully EVM-compatible, so any Ethereum wallet works. This guide covers detailed setup for the most popular wallets including MetaMask, Trust Wallet, Ledger, Trezor, TokenPocket, and XDCPay.

**Quick Network Parameters:**

| Parameter | XDC Mainnet | XDC Apothem Testnet |
|-----------|-------------|---------------------|
| Network Name | XDC Mainnet | XDC Apothem Testnet |
| RPC URL | `https://erpc.xinfin.network` | `https://rpc.apothem.network` |
| Chain ID | `50` | `51` |
| Currency Symbol | XDC | TXDC |
| Block Explorer | `https://xdcscan.com` | `https://testnet.xdcscan.com` |

---

## MetaMask

MetaMask is the most popular EVM wallet with over 30 million users. It supports XDC natively.

### Option 1: Automatic Setup (Recommended)

1. Open MetaMask and click the **network dropdown** at the top center
2. Click **"Add Network"**
3. Search for **"XDC"** in the network list
4. Select **XDC Mainnet** or **XDC Apothem Testnet**
5. Click **"Approve"**

> 💡 **Tip:** If XDC doesn't appear in the search, use manual setup below.

### Option 2: Manual Configuration

1. Open MetaMask → Click the **network dropdown** → Select **"Add Network"**
2. Choose **"Add a network manually"**
3. Fill in the parameters from the table above
4. Click **"Save"**

### Option 3: One-Click Add

Click these buttons to add XDC networks automatically:

**[Add XDC Mainnet]** | **[Add XDC Apothem Testnet]**

### Adding XDC Tokens to MetaMask

After adding the network, import XDC tokens:

1. In MetaMask, click **"Import tokens"**
2. Paste the token contract address:
   - Mainnet XDC: `0x0000000000000000000000000000000000000000` (native)
   - Wrapped XDC (WXDC): `0x951857744785e80e2de051c32ee7b25f9c458c42`
3. Token symbol and decimals auto-fill
4. Click **"Add custom token"**

### MetaMask Mobile Setup

1. Download MetaMask from [App Store](https://apps.apple.com/app/metamask/id1438144202) or [Google Play](https://play.google.com/store/apps/details?id=io.metamask)
2. Create or import a wallet
3. Tap the **hamburger menu (☰)** → **Settings** → **Networks** → **Add Network**
4. Enter XDC Mainnet parameters from the table above
5. Tap **"Add"**

---

## Trust Wallet

Trust Wallet is a mobile-first wallet with built-in dApp browser and staking support.

### Mobile Setup

1. Download Trust Wallet from [App Store](https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409) or [Google Play](https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp)
2. Create a new wallet or import an existing one
3. Tap the **settings icon (⚙️)** at the top right
4. Select **"Manage Crypto"** → **"Add Custom Token"**
5. Select **"XDC Network"** (or add manually if not listed)
6. Enter network parameters:
   - Network: XDC
   - RPC URL: `https://erpc.xinfin.network`
   - Chain ID: `50`
   - Symbol: XDC
   - Explorer: `https://xdcscan.com`
7. Tap **"Save"**

### Adding Custom Tokens

1. In Trust Wallet, tap the **"+"** icon on the main screen
2. Search for **"XDC"**
3. If not found, tap **"Add Custom Token"**
4. Enter contract address and details
5. Toggle the token to show it on your main screen

---

## Ledger Hardware Wallet

Ledger provides cold storage for maximum security.

### Prerequisites

- Ledger Nano S, Nano S Plus, or Nano X
- Ledger Live installed ([ledger.com/start](https://www.ledger.com/start))
- USB cable or Bluetooth (Nano X)

### Setup Steps

1. **Install Ethereum App**
   - Open Ledger Live → **Manager**
   - Connect and unlock your Ledger
   - Search for **"Ethereum (ETH)"**
   - Click **Install**

2. **Connect to MetaMask**
   - Open MetaMask → Click the **account icon** → **"Connect Hardware Wallet"**
   - Select **Ledger** → Click **"Continue"**
   - Connect your Ledger via USB
   - Select the account you want to use → Click **"Unlock"**

3. **Add XDC Network to MetaMask**
   - Follow the MetaMask setup above
   - Your Ledger account now works with XDC

4. **Confirm Transactions on Ledger**
   - When sending transactions, MetaMask will prompt your Ledger
   - Review the transaction details on your Ledger screen
   - Press both buttons to confirm

> ⚠️ **Security:** Never enter your Ledger recovery phrase anywhere except the Ledger device itself.

---

## Trezor Hardware Wallet

Trezor is another secure hardware wallet option.

### Prerequisites

- Trezor Model One or Model T
- Trezor Suite installed ([suite.trezor.io](https://suite.trezor.io))

### Setup Steps

1. **Connect Trezor to MetaMask**
   - Open MetaMask → Click the **account icon** → **"Connect Hardware Wallet"**
   - Select **Trezor** → Click **"Continue"**
   - Connect your Trezor via USB
   - Follow the Trezor Suite prompts to authorize
   - Select the account → Click **"Unlock"**

2. **Add XDC Network**
   - Follow MetaMask setup above
   - Your Trezor account now works with XDC

3. **Confirm Transactions**
   - Review transaction on your Trezor screen
   - Confirm with the touchscreen (Model T) or buttons (Model One)

---

## TokenPocket

TokenPocket is a multi-chain wallet popular in Asia with built-in DeFi and NFT support.

### Setup Steps

1. Download TokenPocket from [tokenpocket.pro](https://tokenpocket.pro)
2. Create or import a wallet
3. Tap **"Me"** → **"Node Settings"** → **"Custom"**
4. Add XDC network:
   - Name: XDC Mainnet
   - RPC: `https://erpc.xinfin.network`
   - Chain ID: `50`
   - Symbol: XDC
   - Explorer: `https://xdcscan.com`
5. Tap **"Save"**

---

## XDCPay (XDC-Native Wallet)

XDCPay is the official XDC browser extension wallet, similar to MetaMask but XDC-native.

### Setup Steps

1. Install XDCPay from the [Chrome Web Store](https://chrome.google.com/webstore)
2. Click the XDCPay icon in your browser toolbar
3. Create a new wallet or import with seed phrase
4. XDCPay comes with XDC Mainnet and Apothem Testnet **pre-configured**
5. No manual network setup required

### Features

- Native XDC address format (`xdc...`)
- Built-in XDC token support
- Direct integration with XDC dApps
- One-click network switching

---

## Wallet Comparison

| Wallet | Type | Best For | XDC Native | Hardware Support | Mobile |
|--------|------|----------|------------|------------------|--------|
| **MetaMask** | Browser/Mobile | Most users, DeFi | No | Ledger, Trezor | Yes |
| **Trust Wallet** | Mobile | Mobile-first users | No | No | Yes |
| **Ledger** | Hardware | Maximum security | Via MetaMask | Self | No |
| **Trezor** | Hardware | Maximum security | Via MetaMask | Self | No |
| **TokenPocket** | Mobile | Multi-chain, Asia | No | No | Yes |
| **XDCPay** | Browser | XDC-native dApps | Yes | No | No |

---

## Address Format

XDC supports two address formats:

| Format | Example | Usage |
|--------|---------|-------|
| `0x` | `0x71C7656EC7ab88b098defB751B7401B5f6d8976F` | MetaMask, EVM wallets |
| `xdc` | `xdc71C7656EC7ab88b098defB751B7401B5f6d8976F` | XDC-native display |

**Convert between formats:**

```javascript
// xdc to 0x
const ethAddress = xdcAddress.replace('xdc', '0x');

// 0x to xdc
const xdcAddress = ethAddress.replace('0x', 'xdc');
```

> 💡 **Tip:** MetaMask uses `0x` format internally. XDCScan shows `xdc` format. Both refer to the same account.

---

## Finding the Best RPC Endpoint

For optimal performance based on your location:

1. Visit [Chainlist.org](https://chainlist.org/?search=xdc) or [XDC RPC](https://xdcrpc.com/)
2. Test RPC latency for your region
3. Choose the endpoint with the lowest latency

**Alternative RPC URLs:**

| Provider | Mainnet URL | Testnet URL |
|----------|-------------|-------------|
| XDC Official | `https://erpc.xinfin.network` | `https://rpc.apothem.network` |
| XDC Official (alt) | `https://rpc.xdc.org` | — |
| Ankr | `https://rpc.ankr.com/xdc` | — |
| BlocksScan | `https://rpc.xdc.blocksscan.io` | `https://rpc.apothem.blocksscan.io` |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Invalid chain ID" | Ensure Chain ID is `50` (mainnet) or `51` (testnet) |
| "Could not fetch chain ID" | Try a different RPC URL from the list above |
| Transaction pending forever | Increase gas price to at least 0.25 Gwei |
| "Insufficient funds" | Ensure you have XDC for gas. Get test XDC from [faucet](https://faucet.apothem.network) |
| Address not recognized | Convert between `0x` and `xdc` formats |
| Ledger not detected | Ensure Ledger Live is closed (it can lock the USB connection) |
| MetaMask won't connect | Check that you're on XDC network, not Ethereum |
| Token not showing | Click "Import token" and enter the contract address |
| Mobile wallet crashes | Update to the latest app version |

### Gas Price Issues

XDC has very low gas fees (~0.25 Gwei). If transactions fail:

1. In MetaMask, click **"Edit"** next to gas fees
2. Set **Max base fee** to at least `0.25 Gwei`
3. Set **Priority fee** to `0`
4. Click **"Save"**

### Reset MetaMask Account

If nonce errors occur:

1. MetaMask → **Settings** → **Advanced**
2. Click **"Clear activity tab data"**
3. Click **"Reset account"** (this only clears local history, not your funds)

---

## Security Best Practices

1. **Never share your seed phrase** with anyone or any website
2. **Use hardware wallets** for large amounts
3. **Verify contract addresses** before interacting with dApps
4. **Enable 2FA** on mobile wallets where available
5. **Bookmark official sites** to avoid phishing
6. **Test on Apothem testnet** before mainnet transactions
7. **Keep wallet software updated** to latest versions

---

## 🚀 Next Steps

Now that your wallet is configured:

1. **[Quick Start Guide →](./quick-guide.md)** — Deploy your first contract (⏱️ 5 min)
2. **[Get Test XDC](https://faucet.apothem.network)** — Fund your wallet on Apothem testnet
3. **[Smart Contract Setup →](../../smartcontract/setup.md)** — Set up your dev environment (⏱️ 15 min)

Or explore:
- **[RPC Endpoints →](./rpc.md)** — Connect to the network
- **[Developer Tools](https://xinfin.org/quick-tools-guide)** — Official XDC developer resources
- **[XDC Chain Overview →](../index.md)** — Learn about the network
