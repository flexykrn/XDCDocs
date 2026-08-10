---
title: Network Information
sidebar_position: 6
description: Chain IDs, RPC and WebSocket endpoints, explorers, faucets, and wallet configuration for XDC Mainnet, Apothem Testnet, and Devnet — the single page every XDC developer bookmarks.
---

# Network Information

Everything you need to connect to XDC Network in one place: chain IDs, RPC and WebSocket endpoints, block explorers, faucets, and ready-to-paste wallet configuration.

## At a Glance

| Property | Value |
|---|---|
| Network name | XDC Network |
| Chain ID | 50 (Mainnet) / 51 (Apothem Testnet) / 551 (Devnet) |
| Currency symbol | XDC (TXDC on Apothem) |
| Decimals | 18 |
| Block time | ~2 seconds |
| Finality | Deterministic finality through XDPoS 2.0 |
| Consensus | XDPoS 2.0 (XinFin Delegated Proof of Stake) |
| Gas price | 0.25 Gwei |

## XDC Mainnet

| Parameter | Value |
|---|---|
| Chain ID | 50 (`0x32`) |
| RPC (HTTPS) | `https://erpc.xinfin.network` |
| | `https://earpc.xinfin.network` |
| | `https://rpc.xdc.org` |
| WebSocket | `wss://ws.xinfin.network` |
| Explorer | [xdcscan.com](https://xdcscan.com) |
| | [xdc.blocksscan.io](https://xdc.blocksscan.io) |

More endpoints are listed on [Chainlist](https://chainlist.org/chain/50). See the full [Mainnet RPC reference](/docs/xdc-chain/developers/mainnetrpc).

## Apothem Testnet

| Parameter | Value |
|---|---|
| Chain ID | 51 (`0x33`) |
| RPC (HTTPS) | `https://rpc.apothem.network` |
| WebSocket | `wss://ws.apothem.network` |
| Explorer | [testnet.xdcscan.com](https://testnet.xdcscan.com) |
| | [apothem.blocksscan.io](https://apothem.blocksscan.io) |
| Faucet | [faucet.apothem.network](https://faucet.apothem.network) |

The faucet dispenses 1000 test XDC per request. Alternative faucets: [BlocksScan Faucet](https://faucet.blocksscan.io/), [ChainTools Faucet](https://chains.tools/faucet). See the [Faucet guide](/docs/xdc-chain/developers/faucet) and the full [Apothem RPC reference](/docs/xdc-chain/developers/apothemrpc).

## Devnet

| Parameter | Value |
|---|---|
| Chain ID | 551 (`0x227`) |
| RPC (HTTPS) | `https://devnetstats.hashlabs.apothem.network/devnet` |
| WebSocket | `https://devnetstats.hashlabs.apothem.network/devnetws` |

Devnet is an unstable environment for core developers testing new features. See the [Devnet RPC reference](/docs/xdc-chain/developers/devnetrpc).

## Add XDC to Your Wallet

Programmatically add a network with the `wallet_addEthereumChain` method.

### XDC Mainnet

```json
{
  "method": "wallet_addEthereumChain",
  "params": [
    {
      "chainId": "0x32",
      "chainName": "XDC Mainnet",
      "nativeCurrency": {
        "name": "XDC",
        "symbol": "XDC",
        "decimals": 18
      },
      "rpcUrls": ["https://erpc.xinfin.network"],
      "blockExplorerUrls": ["https://xdcscan.com"]
    }
  ]
}
```

### Apothem Testnet

```json
{
  "method": "wallet_addEthereumChain",
  "params": [
    {
      "chainId": "0x33",
      "chainName": "XDC Apothem Testnet",
      "nativeCurrency": {
        "name": "TXDC",
        "symbol": "TXDC",
        "decimals": 18
      },
      "rpcUrls": ["https://rpc.apothem.network"],
      "blockExplorerUrls": ["https://testnet.xdcscan.com"]
    }
  ]
}
```

For manual wallet setup (MetaMask, Trust Wallet, others), see [Wallet Configuration](/docs/xdc-chain/developers/wallet-configuration) and the [XDC Wallet guide](/docs/smart-contracts/xdc-wallet).

## Gas and Tooling Notes

- **Gas price:** 0.25 Gwei. XDC has effectively zero base fee — a simple transfer costs ~$0.00001.
- **EIP-1559:** EIP-1559 is being rolled out on Apothem Testnet. Mainnet currently uses legacy gas model. Both work — your tooling handles this automatically.
- **Solidity version:** XDC supports Solidity up to 0.8.24:

```solidity
pragma solidity ^0.8.24;
```

- **Address prefixes:** XDCScan displays addresses with an `xdc` prefix; EVM wallets and tools use `0x`. Both refer to the same account — replace `xdc` with `0x` (or vice versa) to convert.

## More Resources

- [API Reference](/docs/api-reference/) — JSON-RPC and WebSocket endpoints, request formats, error handling
- [RPC Method Reference](/docs/api-reference/json-rpc) — full list of supported JSON-RPC methods
- [Faucet](/docs/xdc-chain/developers/faucet) — get free test XDC on Apothem
- [Wallet Configuration](/docs/xdc-chain/developers/wallet-configuration) — manual setup for MetaMask and other wallets
- [FAQ](/docs/xdc-chain/faq) — common questions on gas, wallets, deployment, and troubleshooting
