---
title: Tokens Built On XDC
sidebar_position: 4
---

# Tokens Built On XDC 

The XDC Network is a powerful blockchain platform designed to support various digital assets and decentralized applications. One of its key features is the ability to create and manage tokens, which can represent anything from currency to assets, data, or even unique digital items. On the XDC Network, tokens are classified into different standards based on their functionality and use cases. Here’s an overview of the major token standards:

## Per-standard guides

- [XRC20 Tokens](/docs/smart-contracts/xrc20-tokens) — fungible tokens, allowances, mintable/burnable extensions
- [XRC721 Tokens](/docs/smart-contracts/xrc721-tokens) — non-fungible tokens, metadata, enumerable extension
- [XRC1155 Tokens](/docs/smart-contracts/xrc1155-tokens) — multi-token standard, batch operations, URI substitution
- [XRC404 Tokens](/docs/smart-contracts/xrc404-tokens) — semi-fungible hybrid tokens (experimental)

## XRC20
### Overview:
[XRC20](https://xdcscan.io/tokens) is the most widely used token standard on the XDC Network, similar to the ERC20 standard on Ethereum. XRC20 tokens are fungible, meaning each token is identical in type and value to another token within the same contract. These tokens are primarily used for cryptocurrencies, utility tokens, and other financial instruments.

### Key Features:

- **Fungibility:** Every XRC20 token is identical and interchangeable.
- **Interoperability:** XRC20 tokens can interact with various decentralized applications (dApps) and smart contracts within the XDC ecosystem.
- **Efficiency:** Transactions using XRC20 tokens benefit from the XDC Network's high throughput and low fees, making them ideal for financial applications.

### Use Cases:

- **Cryptocurrencies:** XRC20 tokens can represent any form of digital currency on the XDC Network.
- **Utility Tokens:** These tokens can be used within dApps as a medium of exchange, access to features, or as a reward mechanism.

### Example:

Because XDC is EVM-compatible, a standard OpenZeppelin ERC20 contract works without modification. This minimal example mints an initial supply to the deployer:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MyToken is ERC20 {
    constructor(uint256 initialSupply) ERC20("MyToken", "MTK") {
        _mint(msg.sender, initialSupply);
    }
}
```

## XRC721

### Overview:
The [XRC721](https://xdcscan.io/nft-top-contracts) standard allows for the creation of non-fungible tokens (NFTs) on the XDC Network. Unlike XRC20 tokens, XRC721 tokens are unique and cannot be exchanged on a one-to-one basis. Each XRC721 token has a distinct value and set of characteristics, making them ideal for representing ownership of unique items or digital collectibles.

### Key Features:

- **Uniqueness:** Every XRC721 token is unique and cannot be replaced or replicated.
- **Ownership Proof:** XRC721 tokens are often used to prove ownership of digital or physical assets.
- **Compatibility:** These tokens can be used across various NFT marketplaces and platforms within the XDC ecosystem.

### Use Cases:

- **Digital Collectibles:** XRC721 tokens can represent digital art, collectibles, and other unique digital assets.
- **Asset Tokenization:** Real-world assets like real estate, luxury goods, and intellectual property can be tokenized as XRC721 tokens, providing proof of ownership and enabling fractional ownership.

## XRC1155

### Overview:
XRC1155 is the multi-token standard on the XDC Network, compatible with Ethereum's ERC1155. A single XRC1155 contract can manage any number of token types — fungible, non-fungible, or semi-fungible — each identified by a `uint256` id. Where XRC721 requires one contract per collection and treats every token as unique, XRC1155 lets one contract hold an entire game's item catalog, multiple editions of the same artwork, or a mix of currencies and collectibles.

### Key Features:

- **Multi-Token:** One contract manages many token types, so an entire collection (or several) shares a single deployment and approval.
- **Batch Operations:** `safeBatchTransferFrom` and `mintBatch` move or mint many token ids in one transaction, saving significant gas over repeated XRC721 transfers.
- **Semi-Fungibility:** A token id with a supply greater than one behaves like an edition (e.g., 100 copies of a trading card); a supply of one behaves like an NFT.
- **Metadata Substitution:** The contract returns a single URI template containing `{id}`, which clients replace with the token id (as a 64-character lowercase hex string) to fetch each token's metadata.

### Use Cases:

- **Game Items:** Weapons, skins, and in-game currencies of many types managed in one contract, with cheap batch transfers for trading or rewards.
- **Editions and Tiered Collectibles:** Multiple copies of the same artwork or membership pass under one token id, instead of deploying per-copy XRC721 tokens.
- **Mixed Asset Platforms:** Marketplaces or wallets that handle fungible credits and unique items together through a single approval.

### Example:

This minimal OpenZeppelin ERC1155 contract mints a fungible "Gold" currency and a unique "Sword" item to the deployer, and supports batch minting:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GameItems is ERC1155, Ownable {
    uint256 public constant GOLD = 0;
    uint256 public constant SWORD = 1;

    constructor()
        ERC1155("https://game.example/api/item/{id}.json")
        Ownable(msg.sender)
    {
        _mint(msg.sender, GOLD, 10**18, "");
        _mint(msg.sender, SWORD, 1, "");
    }

    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts
    ) public onlyOwner {
        _mintBatch(to, ids, amounts, "");
    }
}
```

## Choosing a Standard

| | XRC20 | XRC721 | XRC1155 |
|---|---|---|---|
| **Fungibility** | Fully fungible | Non-fungible (unique) | Fungible, non-fungible, or both |
| **Batch operations** | No | No | Yes (`safeBatchTransferFrom`, `mintBatch`) |
| **Contract scope** | One token per contract | One collection per contract | Many token types per contract |
| **Typical use** | Currencies, utility tokens | Art, collectibles, unique assets | Game items, editions, mixed collections |

## XRC404

### Overview:
XRC404 is a specialized token standard designed for hybrid tokens on the XDC Network. These tokens combine features of both fungible and non-fungible tokens, offering a new level of flexibility for developers and businesses.

### Key Features:

- **Hybrid Nature:** XRC404 tokens can function both as fungible and non-fungible tokens, depending on their implementation.
- **Customization:** Developers can customize XRC404 tokens to suit specific use cases that require attributes of both XRC20 and XRC721 standards.
- **Versatility:** This standard is particularly useful for creating complex financial products or tokenizing assets with both unique and identical components.

### Use Cases:

- **Fractionalized NFTs:** XRC404 tokens can be used to create fractional ownership of NFTs, allowing multiple stakeholders to own a piece of a unique asset.
- **Complex Financial Instruments:** These tokens can represent hybrid financial products that require both fungibility and uniqueness, such as bonds with unique identifiers but common underlying assets.

## Deploying Your Token

- **Set up and test:** The [Smart Contract Testing Guide](/docs/smart-contracts/testing-guide) covers Hardhat/Foundry setup and rehearsing deployments on the Apothem Testnet with free test XDC.
- **Follow a full walkthrough:** The [NFT Tutorial](/docs/smart-contracts/nft-tutorial) demonstrates the complete XRC721 lifecycle — contract, Apothem deployment, minting, metadata, and transfers — and the same workflow applies to XRC20 and XRC1155 contracts.
- **Audit before mainnet:** Review the [Smart Contract Security Best Practices](/docs/smart-contracts/security-best-practices) checklist before deploying immutable bytecode to mainnet.
