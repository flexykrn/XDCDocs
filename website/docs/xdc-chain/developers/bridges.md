---
title: "Cross-Chain Bridges"
sidebar_position: 14
description: How to bridge assets to and from the XDC Network, integrate existing bridges into your dApp, and build custom cross-chain bridges — with security best practices.
---

# Cross-Chain Bridges

Bridges move assets and data between the XDC Network and other blockchains. Because XDC is fully EVM-compatible, most EVM-oriented bridging infrastructure works with XDC out of the box. This page covers how bridges work, how users bridge tokens to XDC, integration patterns for developers, and the security considerations you must weigh before touching a bridge in production.

## Bridging Concepts

Most bridges implement one of three designs:

| Design | How it works | Example use |
|---|---|---|
| **Lock-and-mint** | Tokens are locked in a contract on the source chain; a wrapped representation is minted on the destination chain. Returning burns the wrapped token and unlocks the original. | Bridging ETH from Ethereum to XDC |
| **Burn-and-mint** | The token issuer burns supply on the source chain and mints natively on the destination chain. | Native stablecoin issuers moving supply across chains |
| **Liquidity networks** | Liquidity providers hold pools of the same asset on both chains; users deposit on one side and withdraw on the other. | Fast transfers without minting wrapped assets |

### Wrapped Tokens on XDC

Wrapped tokens represent assets from other blockchains on XDC and maintain a 1:1 peg with the original asset:

- **WXDC** — Wrapped XDC for DeFi compatibility
- **WETH** — Wrapped Ethereum
- **USDC** — Bridged from Ethereum

## Bridges Serving XDC

The bridges documented for the XDC ecosystem are:

- [XDC Bridge](https://bridge.xdc.network) — Ethereum ↔ XDC
- [Multichain](https://multichain.org) — Multi-chain support

For a broader view of projects building on XDC, check the [ecosystem page](/docs/ecosystem/).

:::warning
Always verify bridge contract addresses against official sources before transferring funds. Bridge contracts change over time and phishing clones of popular bridges are common.
:::

## Bridging Tokens to XDC (User Flow)

A typical transfer from a source chain to XDC looks like this:

1. Connect your wallet on the bridge UI with the source chain selected
2. Select the asset and amount to bridge
3. Approve the token spend (first time only) and confirm the bridge transaction
4. Wait for confirmation — usually 10–30 minutes depending on source-chain finality
5. Receive the wrapped asset on XDC

Once the transfer completes, verify receipt on XDCScan by searching your address — the wrapped token will appear as a standard XRC20 token. See the [Explorer Guide](/docs/xdc-chain/developers/explorer-guide) for how to look up transactions and token balances.

## Developer Integration Patterns

### 1. Integrate an Existing Bridge

The fastest path to cross-chain support is embedding an existing bridge rather than building one:

- **Bridge widget** — embed the bridge's hosted UI in your dApp via iframe or script tag, letting users bridge into your token or app without leaving your site
- **Bridge SDK / API** — call the bridge programmatically to quote routes, build deposit transactions, and track transfer status from your own frontend or backend

When evaluating a bridge SDK, confirm it supports XDC (Chain ID 50 for mainnet, 51 for Apothem testnet) and supports the specific assets your users need. Refer to each bridge provider's own documentation for integration details.

### 2. Build a Custom Bridge for Your Token

If you issue a token and need it on both sides of XDC and another EVM chain, the standard architecture is lock-and-mint:

1. **Lock contract on the source chain** — users deposit the original token; the contract emits a deposit event
2. **Relayer / validator set** — off-chain services watch deposit events, wait for finality, and submit signed proofs to the destination chain
3. **Mintable wrapped token on XDC** — an XRC20 contract with minting restricted to the bridge operator mints the wrapped representation to the user's XDC address

A minimal wrapped-token interface on XDC:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IBridgeMintable {
    /// @notice Mint wrapped tokens to `to` after a verified source-chain deposit.
    /// @param to Recipient on XDC
    /// @param amount Amount to mint
    /// @param sourceTxHash Deposit transaction on the source chain (replay protection)
    function mint(address to, uint256 amount, bytes32 sourceTxHash) external;

    /// @notice Burn wrapped tokens to initiate a withdrawal back to the source chain.
    function burn(uint256 amount) external;
}
```

Key implementation requirements:

- **Replay protection** — track processed `sourceTxHash` values so each deposit can only be minted once
- **Access control** — only the bridge operator (ideally a multisig or validator set, not a single EOA) can call `mint`
- **Finality waiting** — only relay deposits after the source chain's finality threshold to avoid minting against reorged transactions

The [XDC Subnet Subswap](/docs/subnet/components/subswap) contracts (`ParentnetTreasury` and `SubnetTreasury`) are a working reference implementation of this lock/unlock and mint/burn pattern.

### 3. Message-Passing Protocols

Instead of moving tokens, general message-passing protocols move arbitrary data (and contract calls) between chains. Common options in the EVM ecosystem include LayerZero, Axelar, and Wormhole. These let you build "Omnichain" applications where a contract on one chain triggers logic on another.

:::note
Support for XDC varies by protocol and changes over time. Verify XDC Network support (Chain ID 50) directly with the protocol's current documentation before designing around it.
:::

## Security

Bridges are among the highest-risk components in crypto — cross-chain bridge exploits account for billions of dollars in historical losses, from validator key compromises to smart contract bugs. Treat any bridge integration as critical infrastructure.

### Bridge Risks

As covered in the [FAQ](/docs/xdc-chain/faq#bridging--cross-chain), bridges carry risks:

- Smart contract bugs
- Centralized validator sets
- Liquidity constraints

**Best practices for users:**

- Use official or audited bridges
- Start with small amounts
- Verify contract addresses
- Don't bridge more than you can afford to lose

### Best Practices for Bridge Builders

- **Audits** — commission multiple independent audits of lock contracts, mintable tokens, and relayer logic before mainnet launch
- **Transfer limits** — enforce per-transaction and per-day caps so a single exploit cannot drain the bridge
- **Monitoring and circuit breakers** — alert on unusual mint/lock ratios and support pausing the bridge when anomalies are detected
- **Decentralized validation** — avoid single-key minting authority; use a multisig or validator set with an honest-majority assumption
- **Key management** — keep relayer keys in HSMs or key-management services, never in plain environment variables

For general contract security guidance, see [Security Best Practices](/docs/smart-contracts/security-best-practices).

## Subnet Bridging (XDC Mainnet ↔ Subnet)

Bridging between the XDC mainnet and an [XDC Subnet](/docs/subnet/overview) is a separate mechanism from the L1 bridges above:

- [Relayer](/docs/subnet/components/relayer) — checkpoints subnet block headers to the parent chain, providing the data bridge that enables auditing and cross-chain verification
- [Subswap](/docs/subnet/components/subswap) — cross-chain transfer system built on XDC Zero, using lock/unlock and mint/burn treasury contracts to move assets between mainnet and subnet

If you are building on a subnet rather than bridging external chains to XDC mainnet, start with those documents.

## See Also

- [XDC FAQ — Bridging & Cross-Chain](/docs/xdc-chain/faq#bridging--cross-chain) — user-facing bridge questions
- [Token Standards](/docs/smart-contracts/tokens) — XRC20 and other token standards used by wrapped assets
- [Explorer Guide](/docs/xdc-chain/developers/explorer-guide) — verifying bridged transactions on XDCScan
- [Security Best Practices](/docs/smart-contracts/security-best-practices) — smart contract security guidance
