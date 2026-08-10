---
title: XRC721 Tokens
sidebar_position: 30
description: The XRC721 non-fungible token standard on XDC Network — interface, metadata, OpenZeppelin implementation, and deployment.
---

# XRC721 Tokens

XRC721 is the non-fungible token (NFT) standard on the XDC Network, fully compatible with Ethereum's ERC721. Each XRC721 token has a unique `tokenId` and represents indivisible ownership of a distinct asset — digital art, collectibles, credentials, or tokenized real-world assets. Because XDC is EVM-compatible, standard OpenZeppelin ERC721 contracts work without modification.

For a complete step-by-step walkthrough — contract, Apothem deployment, minting, metadata, and transfers — follow the [NFT Tutorial](/docs/smart-contracts/nft-tutorial). This page is a reference for the standard itself.

## Interface Essentials

An XRC721 contract must implement:

```solidity
function balanceOf(address owner) external view returns (uint256);
function ownerOf(uint256 tokenId) external view returns (address);
function safeTransferFrom(address from, address to, uint256 tokenId) external;
function transferFrom(address from, address to, uint256 tokenId) external;
function approve(address to, uint256 tokenId) external;
function getApproved(uint256 tokenId) external view returns (address);
function setApprovalForAll(address operator, bool approved) external;
function isApprovedForAll(address owner, address operator) external view returns (bool);

event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
```

Notes:

- **Per-token vs operator approvals:** `approve` delegates one `tokenId`; `setApprovalForAll` delegates the caller's entire balance to an operator (typical for marketplaces).
- **Safe transfers:** `safeTransferFrom` checks whether a contract recipient implements `onERC721Received`, preventing tokens from being locked in contracts that cannot handle them. Prefer it over plain `transferFrom`.

## Metadata and tokenURI

XRC721 defines an optional metadata extension. `tokenURI(tokenId)` returns a URL pointing to a JSON document describing the token:

```json
{
  "name": "My NFT #1",
  "description": "An example XRC721 token on XDC Network.",
  "image": "ipfs://Qm.../1.png",
  "attributes": [
    { "trait_type": "Background", "value": "Blue" }
  ]
}
```

Common practice is a `baseURI` prefix plus the token id, with JSON and images hosted on IPFS for permanence. Marketplaces and explorers read this document to render the NFT.

## Enumerable Extension

`ERC721Enumerable` adds on-chain token discovery:

- `totalSupply()` — total minted tokens.
- `tokenByIndex(index)` — enumerate all tokens.
- `tokenOfOwnerByIndex(owner, index)` — enumerate one owner's tokens.

This is convenient for galleries and wallets but increases mint and transfer gas costs; omit it if off-chain indexing suffices.

## Full Implementation Example

An ownable collection with auto-incrementing ids, per-token URIs via a base URI, and burning:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyNFT is ERC721, ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    constructor()
        ERC721("MyNFT", "MNFT")
        Ownable(msg.sender)
    {}

    function safeMint(address to, string memory uri) public onlyOwner {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
```

Key points:

- `_safeMint` (not `_mint`) protects against minting to contracts that cannot receive NFTs.
- `ERC721URIStorage` stores a URI per token; for uniform `baseURI + tokenId` schemes, plain `ERC721` with `_baseURI()` is cheaper.
- Add `ERC721Enumerable` to the inheritance list if on-chain enumeration is required (and extend the `supportsInterface`/`_update` overrides accordingly).

## Deploying

- **Full walkthrough:** The [NFT Tutorial](/docs/smart-contracts/nft-tutorial) covers the complete XRC721 lifecycle on Apothem Testnet.
- **Hardhat:** Compile and deploy with the [Hardhat Guide](/docs/smart-contracts/hardhat-guide).
- **Testing:** Test minting, transfers, approvals, and metadata with the [Smart Contract Testing Guide](/docs/smart-contracts/testing-guide).

## See Also

- [Tokens Built On XDC](/docs/smart-contracts/tokens) — overview and standard comparison
- [XRC20 Tokens](/docs/smart-contracts/xrc20-tokens)
- [XRC1155 Tokens](/docs/smart-contracts/xrc1155-tokens)
- [XRC404 Tokens](/docs/smart-contracts/xrc404-tokens)
