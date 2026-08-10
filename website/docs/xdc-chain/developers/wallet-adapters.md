---
title: "Wallet Adapters Integration Guide"
sidebar_position: 16
description: Add multi-wallet support to your XDC dApp with adapter libraries — wagmi + viem + RainbowKit, Reown AppKit, and thirdweb — including XDC chain configs and wrong-network handling.
---

# Wallet Adapters Integration Guide

The [Frontend-Web3 Integration](/docs/smart-contracts/frontend-integration) guide shows how to connect a wallet with raw EIP-1193 calls — `window.ethereum`, `eth_requestAccounts`, `wallet_switchEthereumChain`. That works for a single injected wallet, but production dApps usually need more: MetaMask **and** WalletConnect **and** Coinbase Wallet, a polished connect modal, and reactive state for account, chain, and balance. Wallet adapter libraries give you all of that out of the box.

## Why Use an Adapter Library

- **Multi-wallet support:** one integration covers injected wallets, WalletConnect QR sessions, and smart wallets — no per-wallet code.
- **UI included:** connect modals, account buttons, and network pickers ship with the library (RainbowKit, AppKit, ConnectKit).
- **State management:** account, chain ID, and connection status are exposed as reactive hooks with caching and refetching handled for you.
- **Wrong-network handling:** adapters expose `switchChain` APIs so you don't hand-roll `wallet_addEthereumChain` fallbacks.

Use raw EIP-1193 when you want zero dependencies and full control; use an adapter when you want to ship fast with broad wallet coverage.

| Network | Chain ID | RPC URL | Explorer |
|---|---|---|---|
| **Mainnet** | 50 (`0x32`) | `https://erpc.xinfin.network` | `https://xdcscan.com` |
| **Apothem Testnet** | 51 (`0x33`) | `https://rpc.apothem.network` | `https://testnet.xdcscan.com` |

## Adapter Options Compared

| Library | Wallet Support | Framework | Notes |
|---|---|---|---|
| **wagmi + viem + RainbowKit** | Injected, WalletConnect, Coinbase, 100+ via connectors | React | Most popular stack; headless wagmi core, RainbowKit adds the UI |
| **wagmi + ConnectKit** | Same connectors as above | React | Alternative UI skin for wagmi; smaller footprint than RainbowKit |
| **Reown AppKit** (ex-WalletConnect Web3Modal) | WalletConnect ecosystem, injected, social/email login | React, Vue, Angular, vanilla JS | Best cross-framework option; built-in WalletConnect QR flow |
| **thirdweb** | Injected, WalletConnect, smart/embedded wallets | React, React Native | Batteries-included SDK; `defineChain` handles custom networks |

All four support custom EVM chains, so XDC works with standard configuration — no XDC-specific forks required.

## wagmi + viem Setup for XDC

The most widely adopted React stack. Install the packages:

```bash
npm install wagmi viem @tanstack/react-query
```

XDC is not in viem's built-in chain list, so define it as a custom chain. Export both mainnet and Apothem:

```javascript
import { defineChain } from "viem";

export const xdc = defineChain({
  id: 50,
  name: "XDC Network",
  nativeCurrency: { name: "XDC", symbol: "XDC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://erpc.xinfin.network"] },
  },
  blockExplorers: {
    default: { name: "XDCScan", url: "https://xdcscan.com" },
  },
});

export const xdcApothem = defineChain({
  id: 51,
  name: "XDC Apothem Testnet",
  nativeCurrency: { name: "XDC", symbol: "TXDC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.apothem.network"] },
  },
  blockExplorers: {
    default: { name: "XDCScan Testnet", url: "https://testnet.xdcscan.com" },
  },
  testnet: true,
});
```

Wire up the wagmi config and providers at the root of your app:

```jsx
import { WagmiProvider, createConfig, http } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { xdc, xdcApothem } from "./chains";

const config = createConfig({
  chains: [xdc, xdcApothem],
  connectors: [
    injected(),
    walletConnect({ projectId: "YOUR_WALLETCONNECT_PROJECT_ID" }),
  ],
  transports: {
    [xdc.id]: http(),
    [xdcApothem.id]: http(),
  },
});

const queryClient = new QueryClient();

export default function App({ children }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
```

Then use wagmi hooks in any component — connection state, and transactions all come as reactive hooks:

```jsx
import { useAccount, useConnect, useDisconnect, useSendTransaction } from "wagmi";
import { parseEther } from "viem";

export function WalletPanel() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { sendTransaction, isPending } = useSendTransaction();

  if (!isConnected) {
    return (
      <button onClick={() => connect({ connector: connectors[0] })}>
        Connect Wallet
      </button>
    );
  }

  return (
    <div>
      <p>
        Connected: {address} (chain {chainId})
      </p>
      <button
        disabled={isPending}
        onClick={() =>
          sendTransaction({
            to: "0x1234567890abcdef1234567890abcdef12345678",
            value: parseEther("1"), // 1 XDC
          })
        }
      >
        {isPending ? "Confirm in wallet…" : "Send 1 XDC"}
      </button>
      <button onClick={() => disconnect()}>Disconnect</button>
    </div>
  );
}
```

## Adding RainbowKit on Top

RainbowKit replaces the hand-built connect button with a themed modal that lists every configured connector. It sits directly on the wagmi config:

```bash
npm install @rainbow-me/rainbowkit
```

```jsx
import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider, ConnectButton, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { xdc, xdcApothem } from "./chains";

const config = getDefaultConfig({
  appName: "My XDC dApp",
  projectId: "YOUR_WALLETCONNECT_PROJECT_ID",
  chains: [xdc, xdcApothem],
});

// Inside App, wrap with <RainbowKitProvider> after <QueryClientProvider>,
// then drop <ConnectButton /> anywhere in your UI.
```

`<ConnectButton />` handles the modal, account display, balance, and network switcher with no further code.

## Reown AppKit (WalletConnect)

AppKit is the successor to Web3Modal and the best choice for non-React apps or WalletConnect-first experiences (mobile wallets via QR code, social logins):

```bash
npm install @reown/appkit @reown/appkit-adapter-wagmi
```

```javascript
import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { xdc, xdcApothem } from "./chains"; // same defineChain configs

const wagmiAdapter = new WagmiAdapter({
  projectId: "YOUR_REOWN_PROJECT_ID",
  networks: [xdc, xdcApothem],
});

createAppKit({
  adapters: [wagmiAdapter],
  networks: [xdc, xdcApothem],
  projectId: "YOUR_REOWN_PROJECT_ID",
});

// In React, open the modal with the useAppKit() hook's open() function.
```

Because AppKit reuses viem chain definitions, the same `xdc` / `xdcApothem` objects work here unchanged.

## thirdweb

thirdweb's SDK accepts any chain ID through `defineChain` — a one-liner for XDC:

```javascript
import { defineChain } from "thirdweb/chains";

const xdc = defineChain(50);
const xdcApothem = defineChain(51);
```

Pass the chain to thirdweb's `<ConnectButton />` component (or `useSendTransaction` for headless flows) and the modal handles wallet selection, network switching, and account state.

## Chain Config Gotchas

- **xdc prefix vs 0x:** adapter libraries (wagmi, viem, AppKit, thirdweb) all operate on `0x` addresses. If you display addresses in the XDC-native `xdc...` format, convert only at the presentation layer — see [xdc3.js SDK](/docs/xdc-chain/developers/xdc3js-sdk) for conversion utilities.
- **Wrong-network handling:** adapters expose switch APIs instead of raw `wallet_switchEthereumChain`. With wagmi:

```jsx
import { useAccount, useSwitchChain } from "wagmi";
import { xdc } from "./chains";

export function WrongNetworkBanner() {
  const { isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();

  if (!isConnected || chainId === xdc.id) return null;
  return (
    <button onClick={() => switchChain({ chainId: xdc.id })}>
      Switch to XDC Network
    </button>
  );
}
```

RainbowKit and AppKit render their own wrong-network prompts automatically once your custom chains are in the config — the banner above is only needed for headless wagmi setups.

## Choosing an Adapter

| Use Case | Recommendation |
|---|---|
| Quick landing dApp, need a polished modal fast | **RainbowKit** on wagmi |
| Custom/headless UI, full control of every pixel | **wagmi** alone (viem underneath) |
| Mobile-first or WalletConnect QR flows, non-React app | **Reown AppKit** — see [Mobile Integration](/docs/xdc-chain/developers/mobile-integration) |
| Embedded/smart wallets, gaming, all-in-one SDK | **thirdweb** |

## See Also

- [Frontend-Web3 Integration](/docs/smart-contracts/frontend-integration) — the raw EIP-1193 flow these libraries wrap
- [XDC Chain FAQ: Wallets & Accounts](/docs/xdc-chain/faq#wallets--accounts) — supported wallets and address formats
- [JSON-RPC Reference](/docs/api-reference/json-rpc) — the underlying RPC methods
- [xdc3.js SDK](/docs/xdc-chain/developers/xdc3js-sdk) — web3.js-style library with native xdc address handling
