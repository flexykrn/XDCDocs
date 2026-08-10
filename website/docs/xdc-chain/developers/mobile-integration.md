---
title: "Mobile Wallet SDK Integration"
sidebar_position: 15
description: Connect iOS and Android apps to the XDC Network — WalletConnect (Reown) setup, React Native with ethers, native SDK notes, address handling, and security best practices.
---

# Mobile Wallet SDK Integration

XDC Network is fully EVM-compatible, so mobile dApps use the same connection patterns as any Ethereum-based chain. This guide covers the integration approaches for iOS and Android, with working snippets for WalletConnect v2, React Native, and native Kotlin/Swift stacks.

## Choosing an Approach

There are three ways to connect a mobile app to XDC:

| Approach | How it works | When to use |
|---|---|---|
| **WalletConnect (recommended)** | Your app opens a session with any WalletConnect-compatible wallet (MetaMask, Trust Wallet, etc.). All signing happens in the wallet. | Nearly always — wallet-agnostic, no key management in your app |
| **In-app web3 SDK** | Your app holds a private key and signs transactions itself (web3j, web3swift, ethers). | Only for backend-driven or custodial use cases — avoid for user wallets |
| **Deep-linking** | Launch a wallet app directly with a transaction request via a URL scheme. | Simple "pay with X wallet" flows; no session state |

The recommended pattern for user-facing apps is **WalletConnect for signing** plus a **public RPC endpoint for reads**. Your app never touches a private key.

## WalletConnect v2 (Reown) Setup

WalletConnect v2 is maintained by Reown. To get started:

1. Create a free project at [cloud.reown.com](https://cloud.reown.com) and copy your **Project ID**.
2. Add the SDK to your app.
3. Register the XDC chains you want to support.

XDC chains in WalletConnect use CAIP-2 identifiers: `eip155:50` (mainnet) and `eip155:51` (Apothem testnet).

```javascript
import { WalletConnectModal } from "@walletconnect/modal";
import { EthereumProvider } from "@walletconnect/ethereum-provider";

const provider = await EthereumProvider.init({
  projectId: "YOUR_REOWN_PROJECT_ID",
  chains: [50],
  optionalChains: [51],
  showQrModal: true,
  metadata: {
    name: "My XDC dApp",
    description: "Mobile dApp on XDC Network",
    url: "https://mydapp.example",
    icons: ["https://mydapp.example/icon.png"],
  },
  rpcMap: {
    50: "https://erpc.xinfin.network",
    51: "https://rpc.apothem.network",
  },
});

await provider.connect(); // shows the wallet picker / QR modal
const accounts = provider.accounts;
```

For React Native and web apps, the higher-level [AppKit](https://reown.com/appkit) (`@reown/appkit`) wraps this flow with a prebuilt UI. Any WalletConnect v2-compatible wallet can connect — users pick their own.

## React Native dApps

React Native apps use ethers v6 on top of the WalletConnect provider. Because the React Native runtime lacks Node.js built-ins, you need shims before importing crypto-dependent packages:

```bash
npm install ethers @walletconnect/ethereum-provider react-native-get-random-values
```

```javascript
// index.js — must run before any ethers import
import "react-native-get-random-values";
import "@ethersproject/shims";
```

Once the shims are in place, wrap the WalletConnect provider in an ethers `BrowserProvider` — the same pattern as browser dApps:

```javascript
import { BrowserProvider, formatEther } from "ethers";
import { EthereumProvider } from "@walletconnect/ethereum-provider";

const wcProvider = await EthereumProvider.init({
  projectId: "YOUR_REOWN_PROJECT_ID",
  chains: [50],
  optionalChains: [51],
  showQrModal: true,
  metadata: { name: "My XDC dApp", description: "...", url: "https://mydapp.example", icons: [] },
});

await wcProvider.connect();

const provider = new BrowserProvider(wcProvider);
const signer = await provider.getSigner();

const balance = await provider.getBalance(await signer.getAddress());
console.log("Balance:", formatEther(balance), "XDC");
```

For wallet-free reads (balances, contract state on a landing screen), use `JsonRpcProvider` pointed at `https://erpc.xinfin.network` — no wallet session required.

## Native iOS

For native Swift apps, use the [WalletConnect Swift SDK](https://github.com/WalletConnect/WalletConnectSwiftV2) (Reown) for sessions and signing. Avoid embedding private keys in the app — let the user's wallet sign. [web3swift](https://github.com/web3swift-team/web3swift) is available for ABI encoding and RPC calls if you need it, but prefer WalletConnect for key management.

The example below is illustrative pseudocode — consult the WalletConnect Swift SDK docs for the current API:

```swift
// Pseudocode — illustrative only; see WalletConnect Swift SDK docs
import WalletConnectSign

Sign.configure(
    projectId: "YOUR_REOWN_PROJECT_ID",
    metadata: AppMetadata(
        name: "My XDC dApp",
        description: "iOS dApp on XDC Network",
        url: "https://mydapp.example",
        icons: []
    )
)

let uri = try await Sign.instance.connect(
    requiredNamespaces: [
        "eip155": ProposalNamespace(
            chains: [Blockchain("eip155:50")!, Blockchain("eip155:51")!],
            methods: ["eth_sendTransaction", "personal_sign"],
            events: ["accountsChanged", "chainChanged"]
        )
    ]
)
// Present `uri` as a QR code or universal link; the wallet approves the session
```

## Native Android

For native Kotlin apps, use the [WalletConnect Kotlin SDK](https://github.com/WalletConnect/WalletConnectKotlinV2) for sessions and signing. [web3j](https://github.com/web3j/web3j) handles ABI encoding, RPC calls, and (if truly needed) local signing — but delegate signing to the user's wallet via WalletConnect wherever possible.

The example below is illustrative pseudocode — consult the WalletConnect Kotlin SDK docs for the current API:

```kotlin
// Pseudocode — illustrative only; see WalletConnect Kotlin SDK docs
import com.walletconnect.sign.client.Sign
import com.walletconnect.sign.client.SignClient

SignClient.initialize(
    init = Sign.Params.Init(
        application = application,
        projectId = "YOUR_REOWN_PROJECT_ID",
        metaData = Sign.Model.AppMetaData(
            name = "My XDC dApp",
            description = "Android dApp on XDC Network",
            url = "https://mydapp.example",
            icons = emptyList()
        )
    ),
    onError = { error -> Log.e("WC", "init failed: $error") }
)

val connectParams = Sign.Params.Connect(
    requiredNamespaces = mapOf(
        "eip155" to Sign.Model.Namespace.Proposal(
            chains = listOf("eip155:50", "eip155:51"),
            methods = listOf("eth_sendTransaction", "personal_sign"),
            events = listOf("accountsChanged", "chainChanged")
        )
    )
)
SignClient.connect(connectParams) { uri -> /* show QR or launch wallet deep link */ }
```

## The xdc Address Prefix on Mobile

Every XDC account has two equivalent spellings: `0x...` (EVM tooling, WalletConnect sessions) and `xdc...` (XDCScan). WalletConnect always returns `0x` addresses. Two rules:

- **Display:** convert to `xdc` format before rendering so users can match XDCScan.
- **Input:** accept both formats in address fields; normalize to `0x` before RPC calls.

Conversion utilities and examples are in the [xdc3.js SDK guide](/docs/xdc-chain/developers/xdc3js-sdk) — the conversion is a simple prefix swap and works the same in any language.

## Security Best Practices

- **Never store private keys or seed phrases in app storage.** Signing belongs in the user's wallet via WalletConnect. An app that asks for a seed phrase is a scam pattern.
- **Gate any local secrets behind biometrics.** If you must persist sensitive material (e.g., API keys), use the iOS Keychain / Android Keystore with biometric unlock — never plain `UserDefaults` or `SharedPreferences`.
- **Verify WalletConnect session proposals.** Display the wallet's reported chain and account before sending transaction requests, and confirm the session is on chain 50 or 51.
- **Warn users about phishing.** Only deep-link to wallets over verified universal links; never render transaction signing prompts outside the WalletConnect flow.
- **Clear sessions on logout.** Call `provider.disconnect()` and wipe cached account state when the user signs out.

## Testing on Apothem

Always test against the Apothem testnet (chain ID 51, `eip155:51`) before mainnet:

1. Point your app at `https://rpc.apothem.network` and register `eip155:51` in your WalletConnect config.
2. Get free test XDC from the [faucet](https://faucet.blocksscan.io/).
3. Connect any WalletConnect-compatible mobile wallet configured for Apothem — see [Wallet Configuration](/docs/xdc-chain/developers/wallet-configuration) for the network parameters.
4. Send test transactions and verify them on [testnet.xdcscan.com](https://testnet.xdcscan.com).

## See Also

- [Frontend-Web3 Integration](/docs/smart-contracts/frontend-integration) — the browser-side counterpart of this guide
- [xdc3.js SDK](/docs/xdc-chain/developers/xdc3js-sdk) — address conversion and web3.js-style RPC
- [Wallet Configuration](/docs/xdc-chain/developers/wallet-configuration) — network parameters for MetaMask and other wallets
- [XDC Chain FAQ: Wallets & Accounts](/docs/xdc-chain/faq#wallets--accounts) — supported wallets and address formats
