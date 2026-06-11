---
title: Token Standards on XDC
description: Overview of XRC20, XRC721, and XRC1155 token standards on XDC Network. Comparison with Ethereum standards and quick-start guides.
---

# Token Standards on XDC

XDC Network supports all major Ethereum token standards with full EVM compatibility. This section covers XRC20 (fungible), XRC721 (NFT), and XRC1155 (multi-token) standards with complete implementation guides.

---

## Comparison Table

| Standard | Type | Use Case | Ethereum Equivalent | Gas (XDC) |
|----------|------|----------|---------------------|-----------|
| **XRC20** | Fungible | Currency, utility tokens | ERC-20 | ~0.0001 XDC |
| **XRC721** | Non-fungible | NFTs, collectibles | ERC-721 | ~0.0005 XDC |
| **XRC1155** | Multi-token | Gaming, mixed assets | ERC-1155 | ~0.0003 XDC |

---

## XRC20 — Fungible Tokens

XRC20 tokens are identical and interchangeable — ideal for currencies, stablecoins, and utility tokens.

**Key Features:**
- Divisible (up to 18 decimals)
- Transferable between addresses
- Approve/spend allowance pattern

**Quick Example:**

```solidity
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MyToken is ERC20 {
    constructor() ERC20("MyToken", "MTK") {
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }
}
```

**[Full XRC20 Guide →](./xrc20.md)** — Deployment, verification, and integration

---

## XRC721 — Non-Fungible Tokens (NFTs)

XRC721 tokens are unique and indivisible — ideal for digital art, collectibles, and asset ownership.

**Key Features:**
- Each token has a unique ID
- Metadata via IPFS or HTTP
- Ownership tracking

**Quick Example:**

```solidity
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MyNFT is ERC721 {
    uint256 private _tokenIds;

    constructor() ERC721("MyNFT", "MNFT") {}

    function mint(address to) public returns (uint256) {
        _tokenIds++;
        _safeMint(to, _tokenIds);
        return _tokenIds;
    }
}
```

**[Full XRC721 Guide →](./xrc721.md)** — Minting, metadata, and marketplace integration

---

## XRC1155 — Multi-Token Standard

XRC1155 supports both fungible and non-fungible tokens in a single contract — ideal for gaming and complex ecosystems.

**Key Features:**
- Batch operations (mint, transfer, burn)
- Mixed token types in one contract
- ~90% gas savings for batch operations

**Quick Example:**

```solidity
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract GameItems is ERC1155 {
    constructor() ERC1155("https://api.game.com/metadata/{id}.json") {}

    function mint(address to, uint256 id, uint256 amount) public {
        _mint(to, id, amount, "");
    }
}
```

**[Full XRC1155 Guide →](./xrc1155.md)** — Batch operations and gaming use cases

---

## XRC404 — Hybrid Tokens

XRC404 is a specialized hybrid token standard that combines features of both fungible and non-fungible tokens. This standard offers flexibility for complex use cases that require attributes of both XRC20 and XRC721.

**Key Features:**
- **Hybrid Nature:** Functions as both fungible and non-fungible depending on implementation
- **Customization:** Developers can tailor tokens for specific use cases
- **Versatility:** Ideal for complex financial products and fractionalized assets

**Use Cases:**
- **Fractionalized NFTs:** Create fractional ownership of unique assets
- **Complex Financial Instruments:** Bonds with unique identifiers but common underlying assets
- **Hybrid Assets:** Tokens requiring both interchangeability and uniqueness

**Quick Example:**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract HybridToken is ERC20 {
    mapping(uint256 => address) public nftOwner;
    uint256 public nftCounter;

    constructor() ERC20("HybridToken", "HYBRID") {}

    function mintWithNFT(address to, uint256 amount) public {
        _mint(to, amount);
        nftCounter++;
        nftOwner[nftCounter] = to;
    }
}
```

> ⚠️ **Note:** XRC404 is an emerging standard. For production use, consider using XRC1155 which provides similar hybrid functionality with broader tooling support.

---

## Choosing the Right Standard

| Use Case | Recommended Standard | Why |
|----------|---------------------|-----|
| Cryptocurrency | XRC20 | Fungible, divisible |
| Digital art | XRC721 | Unique, provable ownership |
| Gaming assets | XRC1155 | Mixed types, batch ops |
| Loyalty points | XRC20 or XRC1155 | Fungible, batch distribution |
| Real estate | XRC721 | Unique asset representation |
| Fractionalized NFTs | XRC1155 | Fractions + full NFT in one |

---

## OpenZeppelin Integration

All standards work with OpenZeppelin Contracts:

```bash
npm install @openzeppelin/contracts
```

Available extensions:
- **XRC20:** `ERC20Burnable`, `ERC20Pausable`, `ERC20Permit`
- **XRC721:** `ERC721Enumerable`, `ERC721URIStorage`, `ERC721Burnable`
- **XRC1155:** `ERC1155Supply`, `ERC1155Burnable`

---

## Verification on XDCScan

After deployment, verify your token contract:

1. Go to [xdcscan.com](https://xdcscan.com) (or [testnet.xdcscan.com](https://testnet.xdcscan.com))
2. Search for your contract address
3. Click **"Verify & Publish"**
4. Paste source code and select compiler version
5. Click **"Verify"**

Verified contracts display:
- Source code
- ABI
- Read/write functions
- Token tracker (for XRC20)

---

## Security Considerations

| Risk | Mitigation |
|------|------------|
| Integer overflow | Use Solidity 0.8+ (built-in checks) |
| Reentrancy | Use `ReentrancyGuard` |
| Access control | Use `Ownable` or `AccessControl` |
| Unlimited minting | Cap max supply |
| Front-running | Use commit-reveal for auctions |

---

## 🚀 Next Steps

1. **[XRC20 Guide →](./xrc20.md)** — Deploy your first fungible token (⏱️ 15 min)
2. **[XRC721 Guide →](./xrc721.md)** — Create an NFT collection (⏱️ 20 min)
3. **[XRC1155 Guide →](./xrc1155.md)** — Build a multi-token game (⏱️ 20 min)
4. **[Contract Verification →](../verify.md)** — Verify on XDCScan (⏱️ 5 min)

Or explore:
- **[Security Best Practices →](../../security/security-practices.md)** — Secure your tokens
- **[Hardhat Deployment →](../hardhat.md)** — Full Hardhat workflow
- **[Foundry Deployment →](../foundry.md)** — Rust-based toolchain
