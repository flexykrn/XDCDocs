---
title: Testnet Faucet
sidebar_position: 24
description: How to get free test XDC from the Apothem and Devnet faucets, with rate limits and troubleshooting.
---

# Testnet Faucet

Test XDC has no real value and is used to deploy contracts and test transactions on the Apothem Testnet and Devnet. This page covers how to get it and what to do when things go wrong.

---

## Apothem Testnet Faucet

The primary faucet is [faucet.apothem.network](https://faucet.apothem.network). Each request sends **1000 XDC** to your address instantly.

### Steps to Get Test XDC

1. **Set up a wallet** — Install MetaMask (or any EVM-compatible wallet). See the [Wallet Configuration guide](/docs/xdc-chain/developers/wallet-configuration).
2. **Add the Apothem network** — In MetaMask, add the Apothem Testnet:

   | Setting | Value |
   |---|---|
   | Network name | XDC Apothem Testnet |
   | Chain ID | 51 |
   | RPC URL | `https://rpc.apothem.network` |
   | Explorer | [testnet.xdcscan.com](https://testnet.xdcscan.com) |

3. **Copy your address** — Click your account name in MetaMask to copy the `0x...` address.
4. **Request funds** — Open [faucet.apothem.network](https://faucet.apothem.network), paste your address, and submit. You'll receive 1000 XDC instantly.
5. **Confirm the transaction** — Search your address on [testnet.xdcscan.com](https://testnet.xdcscan.com) to verify the balance arrived.

---

## Devnet Faucet

The Devnet (Chain ID 551) is an unstable environment intended for core developers testing new features. Test XDC for Devnet is available from the [BlocksScan faucet](https://faucet.blocksscan.io/), which also serves as an alternative source of Apothem test XDC.

See [Devnet RPC](/docs/xdc-chain/developers/devnetrpc) for Devnet connection details.

---

## Rate Limits

The Apothem faucet limits requests per address to prevent abuse. If you hit the limit:

- **Wait 24 hours**, or
- Use an alternative faucet:
  - [BlocksScan Faucet](https://faucet.blocksscan.io/)
  - [ChainTools Faucet](https://chains.tools/faucet)

---

## Troubleshooting

### The faucet says "limit reached"

Wait 24 hours, or use one of the alternative faucets listed above.

### I requested funds but my balance is still zero

1. Check your wallet is connected to the **Apothem Testnet** (Chain ID 51), not mainnet — balances are separate per network.
2. Search your address on [testnet.xdcscan.com](https://testnet.xdcscan.com) to confirm the faucet transaction was sent.
3. If the transaction shows on the explorer but not in your wallet, resync or reset the wallet (MetaMask: Settings → Advanced → Reset Account).

### Can I use mainnet XDC for testing?

No. Mainnet XDC has real value. Always test on Apothem Testnet first. Accidentally deploying untested contracts to mainnet can result in lost funds.

---

## See Also

- [FAQ: Testnet & Faucet](/docs/xdc-chain/faq#testnet--faucet) — quick answers about test XDC
- [Apothem RPC](/docs/xdc-chain/developers/apothemrpc) — testnet endpoints
- [Quick Guide](/docs/xdc-chain/developers/quick-guide) — network overview
