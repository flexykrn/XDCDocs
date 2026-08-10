---
title: XRC1155 Tokens
sidebar_position: 31
description: The XRC1155 multi-token standard on XDC Network — batch operations, URI substitution, OpenZeppelin implementation, and deployment.
---

# XRC1155 Tokens

XRC1155 is the multi-token standard on the XDC Network, fully compatible with Ethereum's ERC1155. A single XRC1155 contract manages any number of token types — fungible, non-fungible, or semi-fungible — each identified by a `uint256` id. Where XRC721 requires one contract per collection and treats every token as unique, XRC1155 lets one contract hold an entire game's item catalog, multiple editions of the same artwork, or a mix of currencies and collectibles.

## Interface Essentials

An XRC1155 contract must implement:

```solidity
function balanceOf(address account, uint256 id) external view returns (uint256);
function balanceOfBatch(address[] calldata accounts, uint256[] calldata ids)
    external view returns (uint256[] memory);
function setApprovalForAll(address operator, bool approved) external;
function isApprovedForAll(address account, address operator) external view returns (bool);
function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes calldata data) external;
function safeBatchTransferFrom(address from, address to, uint256[] calldata ids, uint256[] calldata amounts, bytes calldata data) external;

event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value);
event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values);
event ApprovalForAll(address indexed account, address indexed operator, bool approved);
event URI(string value, uint256 indexed id);
```

Notes:

- **Operator approvals only:** Unlike XRC721's per-token `approve`, XRC1155 approval is all-or-nothing via `setApprovalForAll` — one approval covers every token id in the contract.
- **Receiver hooks:** Transfers to contracts require `onERC1155Received`/`onERC1155BatchReceived`, so tokens cannot be silently locked.

## Batch Operations

Batch functions move or mint many token ids in one transaction, saving significant gas over repeated XRC721 transfers:

- `safeBatchTransferFrom(from, to, ids, amounts, data)` — transfer multiple token types at once.
- `balanceOfBatch(accounts, ids)` — query many balances in one call.
- `_mintBatch(to, ids, amounts, data)` — mint several token types atomically.

Atomicity is a bonus: a batch either completes fully or reverts, which simplifies trading and reward distribution logic.

## Metadata and `{id}` URI Substitution

XRC1155 returns a single URI template containing the literal string `{id}`. Clients replace it with the token id rendered as a **64-character lowercase hex string** (no `0x` prefix, zero-padded) and fetch the resulting JSON. For example, with the template `https://game.example/api/item/{id}.json`, token id `1` resolves to:

```
https://game.example/api/item/0000000000000000000000000000000000000000000000000000000000000001.json
```

The metadata JSON follows the same `name`/`description`/`image`/`attributes` conventions as XRC721 metadata. Emitting the `URI` event signals indexers to re-fetch when a token's metadata changes.

## Use Cases

- **Gaming:** Weapons, skins, and in-game currencies of many types in one contract, with cheap batch transfers for trading or rewards.
- **Editions and tiered collectibles:** A token id with supply greater than one behaves like an edition (e.g., 100 copies of a trading card); a supply of one behaves like an NFT — no per-copy XRC721 deployments.
- **Mixed asset platforms:** Marketplaces or wallets handling fungible credits and unique items together through a single contract and approval.

## Full Implementation Example

This contract mints a fungible "Gold" currency and a unique "Sword" item to the deployer, and supports owner-only batch minting:

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

    function setURI(string memory newuri) public onlyOwner {
        _setURI(newuri);
    }

    function mint(address to, uint256 id, uint256 amount)
        public
        onlyOwner
    {
        _mint(to, id, amount, "");
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

Key points:

- Token ids are arbitrary `uint256` values; named constants keep the catalog readable.
- `setURI` allows rotating the metadata host, at the cost of centralization — consider freezing it after launch.
- For burnable tokens, inherit `ERC1155Burnable`; for supply tracking, inherit `ERC1155Supply`.

## Deploying

- **Hardhat:** Compile and deploy to Apothem or mainnet with the [Hardhat Guide](/docs/smart-contracts/hardhat-guide).
- **Testing:** Test batch transfers, receiver hooks, and supply accounting with the [Smart Contract Testing Guide](/docs/smart-contracts/testing-guide).
- **Walkthrough:** The [NFT Tutorial](/docs/smart-contracts/nft-tutorial) demonstrates the deployment workflow, which applies equally to XRC1155 contracts.

## See Also

- [Tokens Built On XDC](/docs/smart-contracts/tokens) — overview and standard comparison
- [XRC20 Tokens](/docs/smart-contracts/xrc20-tokens)
- [XRC721 Tokens](/docs/smart-contracts/xrc721-tokens)
- [XRC404 Tokens](/docs/smart-contracts/xrc404-tokens)
