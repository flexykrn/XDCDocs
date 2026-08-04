---
title: "Frontend-Web3 Integration"
sidebar_position: 14
description: Connect React, Vue, or Angular frontends to the XDC Network — wallet connection, network switching, contract reads, and transactions with ethers v6.
---

# Frontend-Web3 Integration

XDC Network is fully EVM-compatible, so any standard Ethereum tooling connects a web frontend to the chain with no XDC-specific modifications. This guide walks through the complete flow — detecting a wallet, switching to the XDC network, reading contract data, and sending transactions — using ethers v6, with notes for Vue and Angular along the way.

## The Stack at a Glance

A typical dApp frontend has three layers:

- **Wallet (EIP-1193 provider):** MetaMask and other browser wallets inject a `window.ethereum` object into the page. All signing happens inside the wallet — your code never touches private keys.
- **Library (ethers v6 or xdc3):** Wraps the provider with a friendly API for balances, contracts, and transactions. See the [xdc3.js SDK](/docs/xdc-chain/developers/xdc3js-sdk) guide for the web3.js-style alternative.
- **XDC RPC endpoint:** The node your library talks to. For read-only calls you can point directly at a public RPC; for signing you go through the wallet.

| Network | Chain ID | RPC URL | Explorer |
|---|---|---|---|
| **Mainnet** | 50 | `https://erpc.xinfin.network` | `https://xdcscan.com` |
| **Apothem Testnet** | 51 | `https://rpc.apothem.network` | `https://testnet.xdcscan.com` |

Install the library:

```bash
npm install ethers
```

## Connecting a Wallet in React

Detect `window.ethereum`, request accounts with `eth_requestAccounts`, and subscribe to the `accountsChanged` and `chainChanged` events. Always remove listeners in the `useEffect` cleanup:

```jsx
import { useEffect, useState } from "react";
import { BrowserProvider } from "ethers";

export function useWallet() {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);

  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccounts = (accounts) => setAccount(accounts[0] ?? null);
    const handleChain = (id) => setChainId(parseInt(id, 16));

    window.ethereum.on("accountsChanged", handleAccounts);
    window.ethereum.on("chainChanged", handleChain);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccounts);
      window.ethereum.removeListener("chainChanged", handleChain);
    };
  }, []);

  const connect = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask or another EVM wallet.");
      return;
    }
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    setAccount(accounts[0]);
  };

  return { account, chainId, connect };
}
```

## Adding and Switching to XDC Networks

If the user's wallet is on another chain, call `wallet_switchEthereumChain`. When the wallet doesn't know the network yet (error code `4902`), fall back to `wallet_addEthereumChain`. Chain IDs are passed as hex: mainnet 50 is `0x32`, Apothem 51 is `0x33`.

```javascript
const XDC_NETWORKS = {
  mainnet: {
    chainId: "0x32", // 50
    chainName: "XDC Mainnet",
    nativeCurrency: { name: "XDC", symbol: "XDC", decimals: 18 },
    rpcUrls: ["https://erpc.xinfin.network"],
    blockExplorerUrls: ["https://xdcscan.com"],
  },
  apothem: {
    chainId: "0x33", // 51
    chainName: "XDC Apothem Testnet",
    nativeCurrency: { name: "XDC", symbol: "XDC", decimals: 18 },
    rpcUrls: ["https://rpc.apothem.network"],
    blockExplorerUrls: ["https://testnet.xdcscan.com"],
  },
};

async function switchToXdc(network = "mainnet") {
  const params = XDC_NETWORKS[network];
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: params.chainId }],
    });
  } catch (error) {
    if (error.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [params],
      });
    } else {
      throw error;
    }
  }
}
```

These are the same parameters listed in [Wallet Configuration](/docs/xdc-chain/developers/wallet-configuration) — keep them in sync if endpoints change.

## Reading Contract Data with ethers v6

For reads tied to the connected wallet, wrap `window.ethereum` in a `BrowserProvider`. For public reads that don't need a wallet (landing pages, dashboards), use a `JsonRpcProvider` pointed at a public RPC — no connection prompt required:

```javascript
import { BrowserProvider, JsonRpcProvider, Contract, formatEther } from "ethers";

// Wallet-backed provider (follows the user's selected network)
const provider = new BrowserProvider(window.ethereum);

// Wallet-free provider for mainnet reads
const readOnly = new JsonRpcProvider("https://erpc.xinfin.network");

const balanceWei = await readOnly.getBalance(
  "0x1234567890abcdef1234567890abcdef12345678"
);
console.log("Balance:", formatEther(balanceWei), "XDC");

// Read-only contract call
const erc20Abi = [
  "function balanceOf(address account) view returns (uint256)",
  "function symbol() view returns (string)",
];
const token = new Contract(
  "0x9876543210abcdef1234567890abcdef12345678",
  erc20Abi,
  readOnly
);
const [tokenBalance, symbol] = await Promise.all([
  token.balanceOf("0x1234567890abcdef1234567890abcdef12345678"),
  token.symbol(),
]);
console.log(`${tokenBalance} ${symbol}`);
```

## Sending Transactions from the Browser

State-changing calls need a **signer**, which ethers v6 obtains from the `BrowserProvider`. The wallet prompts the user to confirm; always await the transaction receipt and handle user rejection (error code `4001`):

```javascript
import { BrowserProvider, Contract, parseEther } from "ethers";

async function sendPayment(toAddress) {
  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  try {
    const tx = await signer.sendTransaction({
      to: toAddress,
      value: parseEther("1"), // 1 XDC
    });
    console.log("Submitted:", tx.hash);

    const receipt = await tx.wait(); // ~2s on XDC
    console.log("Confirmed in block", receipt.blockNumber);
  } catch (error) {
    if (error.code === 4001 || error.code === "ACTION_REJECTED") {
      console.log("User rejected the transaction.");
    } else {
      console.error("Transaction failed:", error.message);
    }
  }
}
```

The same signer pattern works for contract writes — pass the signer instead of the provider when constructing the `Contract`.

## The xdc Address Prefix in UIs

Every XDC account has two equivalent spellings: `0x...` (MetaMask, ethers) and `xdc...` (XDCScan, BlocksScan). Only the prefix differs. Two rules keep your UI sane:

- **Display:** convert `0x` addresses to the `xdc` format before rendering, so users can match what they see on XDCScan.
- **Input validation:** accept both formats in address fields, then normalize to `0x` before passing to ethers or RPC calls.

The conversion utilities ship with xdc3.js (`Xdc3.utils.toXdcAddress` / `fromXdcAddress`) — see [xdc3.js SDK: Address Formats](/docs/xdc-chain/developers/xdc3js-sdk) for examples. Never reject an address just because it starts with `xdc`.

## Vue and Angular

The flow is identical in every framework — only the wrapping changes. **Vue:** put the provider and connection logic in a composable (e.g. `useWallet()`) that returns reactive refs for account and chain ID, registering the EIP-1193 listeners in `onMounted` and removing them in `onUnmounted`. **Angular:** wrap the same logic in an injectable service exposing RxJS `BehaviorSubject`s for account and chain state; unsubscribe from provider events in `ngOnDestroy` (or the service's `onDestroy`). In both cases the wallet calls — `eth_requestAccounts`, `wallet_switchEthereumChain`, signer transactions — are exactly the snippets above.

## UX Best Practices

- **Show pending states:** disable buttons and show a spinner from `eth_requestAccounts` through `tx.wait()` — wallet prompts and block confirmation both take time.
- **Wrong-network banner:** compare the connected `chainId` against 50/51 and render a persistent banner with a one-click "Switch to XDC" button instead of failing silently.
- **Handle disconnects:** an empty array from `accountsChanged` means the user disconnected — clear state and return to the "Connect Wallet" view.
- **Recover from rejection:** error code `4001` is a normal user action, not a bug — surface a gentle message, never an error stack.
- **Never ask for seed phrases or private keys:** all signing goes through the wallet. A frontend that requests a seed phrase is a scam pattern, full stop.

## See Also

- [xdc3.js SDK](/docs/xdc-chain/developers/xdc3js-sdk) — web3.js-style library with native xdc address handling
- [Wallet Configuration](/docs/xdc-chain/developers/wallet-configuration) — network parameters for MetaMask and other wallets
- [XDC Chain FAQ](/docs/xdc-chain/faq) — wallets, gas, and troubleshooting
- [JSON-RPC Reference](/docs/api-reference/json-rpc) — the underlying RPC methods
