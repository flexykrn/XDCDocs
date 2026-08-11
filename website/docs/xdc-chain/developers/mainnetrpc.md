---
title: XDC Network - RPC
sidebar_position: 4
---

# XDC Mainnet RPC
The XDC Mainnet is the live, operational environment of the XDC Network, where real transactions occur. The Mainnet is designed to support high-performance applications with low transaction fees and quick finality, making it ideal for enterprise use cases. The primary URL for accessing the XDC Mainnet via RPC. This endpoint allows you to interact with the blockchain by sending requests for data, submitting transactions, and more.

**Public Networks**

Users with an internet connection and access to a full node RPC can easily access the XDC Network's public blockchain. They can read, create, or validate transactions executed on the blockchain. The network's consensus mechanism, XDPoS (XinFin Delegated Proof of Stake), ensures that all nodes agree on the state of the network.

## One-click adding XDC Network
Visit the [ChainList](https://chainlist.org/chain/50) and connect to your wallet, it will add alive RPC endpoints.

## XDC Mainnet Specifications
- **Chain ID:** 50
- **RPC Endpoint for XDC Mainnet:**
* https://erpc.xinfin.network
* https://earpc.xinfin.network
* https://rpc.xdc.org

You could find more endpoints from [here](https://chainlist.org/chain/50).

- **WebSocket Endpoint:** wss://ws.xinfin.network
- **Consensus Mechanism:** XDPoS (XinFin Delegated Proof of Stake)
- **Block Finality:** >75%
- **Consensus Nodes:** Up to 108 (Masternodes)
- **Genesis Block Date:** 2019-05-31
- **Transaction Fee:** Gas price 0.25 Gwei

-----------

## Apothem Testnet RPC
The Apothem Testnet is the test environment for the XDC Network. It mirrors the Mainnet's functionality but operates with test tokens instead of real assets, making it ideal for developers to test and deploy their applications before going live.

**Public Networks**

Similar to the Mainnet, users can access the Apothem Testnet with an internet connection and full node RPC. They can perform all the same actions as on the Mainnet—reading, creating, or validating transactions—without the risks associated with live transactions.

## XDC Testnet Specifications
- **Chain ID:** 51
- **RPC Endpoint for XDC Apothem:** 
* https://rpc.apothem.network

You could find more endpoints from [here](https://chainlist.org/chain/51).

- **WebSocket Endpoint:** wss://ws.apothem.network
- **Consensus Mechanism:** XDPoS (XinFin Delegated Proof of Stake)
- **Block Finality:** >75%
- **Consensus Nodes:** Up to 108 (Masternodes)
- **Genesis Block Date:** 2019-05-31
- **Transaction Fee:** Gas price 0.25 Gwei

-----------

For Devnet endpoints and status, see [Devnet RPC](/docs/xdc-chain/developers/devnetrpc).

