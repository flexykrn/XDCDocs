---
title: XRC404 Tokens
sidebar_position: 32
description: The XRC404 semi-fungible hybrid token concept on XDC Network — what it is, how it combines fungible and non-fungible behavior, and its experimental status.
---

# XRC404 Tokens

XRC404 is a specialized token standard designed for hybrid tokens on the XDC Network. These tokens combine features of both fungible and non-fungible tokens, offering a new level of flexibility for developers and businesses.

## The Semi-Fungible Concept

Where XRC20 tokens are fully interchangeable and XRC721 tokens are fully unique, XRC404-style tokens sit between the two:

- **Hybrid nature:** XRC404 tokens can function both as fungible and non-fungible tokens, depending on their implementation.
- **Customization:** Developers can customize XRC404 tokens to suit specific use cases that require attributes of both XRC20 and XRC721 standards.
- **Versatility:** The standard is particularly useful for creating complex financial products or tokenizing assets with both unique and identical components.

Conceptually, holding a whole unit behaves like owning a fungible token, while fractional or indivisible quantities map to unique, NFT-like ownership — blending liquidity with uniqueness in one asset.

## Use Cases

- **Fractionalized NFTs:** XRC404 tokens can be used to create fractional ownership of NFTs, allowing multiple stakeholders to own a piece of a unique asset.
- **Complex financial instruments:** These tokens can represent hybrid financial products that require both fungibility and uniqueness, such as bonds with unique identifiers but common underlying assets.

## Caution: Experimental Status

XRC404 is experimental. Unlike XRC20, XRC721, and XRC1155, it is not backed by a mature, audited OpenZeppelin implementation, and hybrid token designs carry elevated smart contract risk:

- **No established reference implementation:** Expect to build on unaudited community code or adapt existing standards yourself.
- **Wallet and marketplace support varies:** Tooling that assumes pure fungible or pure non-fungible behavior may display or handle hybrid tokens incorrectly.
- **Audit before mainnet:** Review the [Smart Contract Security Best Practices](/docs/smart-contracts/security-best-practices) checklist and obtain an independent audit before deploying any hybrid token to mainnet.

If your use case fits an established standard — editions or semi-fungible supply in [XRC1155](/docs/smart-contracts/xrc1155-tokens), fractionalization via an [XRC20](/docs/smart-contracts/xrc20-tokens) wrapper around an [XRC721](/docs/smart-contracts/xrc721-tokens) vault — prefer that proven pattern over an experimental hybrid.

## Deploying and Testing

- **Testnet first:** Rehearse any experimental contract on the Apothem Testnet using the [Hardhat Guide](/docs/smart-contracts/hardhat-guide).
- **Testing:** Exercise every fungible and non-fungible code path with the [Smart Contract Testing Guide](/docs/smart-contracts/testing-guide).

## See Also

- [Tokens Built On XDC](/docs/smart-contracts/tokens) — overview and standard comparison
- [XRC20 Tokens](/docs/smart-contracts/xrc20-tokens)
- [XRC721 Tokens](/docs/smart-contracts/xrc721-tokens)
- [XRC1155 Tokens](/docs/smart-contracts/xrc1155-tokens)
