---
title: NFT Tutorial — Create, Deploy, and Manage XRC721 Tokens on XDC
description: Complete NFT tutorial for XDC — create XRC721 tokens with OpenZeppelin, upload metadata to IPFS, deploy to Apothem Testnet, verify on XDCScan, and integrate with marketplaces.
---

Difficulty: Intermediate | Time: ~30 minutes | Tools: Hardhat/Foundry, OpenZeppelin, IPFS, MetaMask

# NFT Tutorial — Create, Deploy, and Manage XRC721 Tokens on XDC

This guide walks you through creating, deploying, and managing NFTs on XDC using the XRC721 standard (equivalent to ERC721). By the end, you will have a deployed NFT collection with metadata stored on IPFS.

## Prerequisites

- [Hardhat Guide](../smartcontract/hardhat.md) or [Foundry Guide](../smartcontract/foundry.md) completed
- [IPFS Integration Guide](../storage/ipfs.md) (recommended for metadata storage)
- MetaMask with XDC Apothem Testnet configured
- Test XDC from [faucet.apothem.network](https://faucet.apothem.network)

---

## What You Will Build

1. **XRC721 Smart Contract** — OpenZeppelin-based NFT with minting and metadata
2. **IPFS Metadata** — JSON metadata and images stored on IPFS
3. **Deployed Collection** — Live on Apothem Testnet, verified on XDCScan
4. **Marketplace Integration** — How to list and trade your NFTs

---

## NFT Concepts

### XRC721 Standard

XRC721 is XDC's equivalent of ERC721 — the standard for non-fungible tokens. Each token is unique and cannot be exchanged 1:1 like XRC20 tokens.

Key features:
- **Unique ownership**: Each token has one owner
- **Transferable**: Can be sold, traded, or gifted
- **Metadata**: Each token has a URI pointing to its metadata
- **Enumerable**: Can list all tokens owned by an address

### Metadata Standards

NFT metadata follows a JSON schema:

```json
{
  "name": "XDC NFT #1",
  "description": "A unique NFT on XDC Network",
  "image": "ipfs://QmYourImageHash",
  "attributes": [
    {
      "trait_type": "Rarity",
      "value": "Legendary"
    },
    {
      "trait_type": "Power",
      "value": 95,
      "display_type": "number"
    }
  ]
}
```

### IPFS Storage

IPFS (InterPlanetary File System) is the decentralized standard for NFT storage. Content is addressed by hash, making it immutable and verifiable.

### Royalty Mechanisms

XRC721 supports EIP-2981 royalty standard:
- Creator receives percentage of every sale
- Enforced at marketplace level
- Typically 2.5%–10% per sale

---

## Smart Contract Development

### Step 1 — Project Setup

```bash title="Terminal"
mkdir xdc-nft && cd xdc-nft
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npx hardhat init
```

Select "Create a JavaScript project".

### Step 2 — Install OpenZeppelin

```bash title="Terminal"
npm install @openzeppelin/contracts
```

### Step 3 — Write the NFT Contract

Create `contracts/XDCNFT.sol`:

```solidity title="contracts/XDCNFT.sol"
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract XDCNFT is ERC721, ERC721URIStorage, ERC721Enumerable, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    uint256 public constant MAX_SUPPLY = 10000;
    uint256 public mintPrice = 0.01 ether;
    string public baseURI;

    constructor(string memory _name, string memory _symbol, string memory _baseURI) 
        ERC721(_name, _symbol) 
        Ownable(msg.sender) 
    {
        baseURI = _baseURI;
    }

    function mint() public payable returns (uint256) {
        require(msg.value >= mintPrice, "Insufficient payment");
        require(_tokenIdCounter.current() < MAX_SUPPLY, "Max supply reached");

        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, string(abi.encodePacked(baseURI, "/", _toString(tokenId), ".json")));

        return tokenId;
    }

    function setMintPrice(uint256 _price) public onlyOwner {
        mintPrice = _price;
    }

    function withdraw() public onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    // Required overrides
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
```

> 💡 **What this does**  
> `XDCNFT` is an ERC721 contract with URI storage, enumerable tracking, and ownership. It supports minting with a price, max supply cap, and withdraw functionality.

---

## Metadata and Storage

### Step 4 — Prepare Metadata

Create a `metadata/` folder:

```
metadata/
├── 0.json
├── 1.json
├── 2.json
└── images/
    ├── 0.png
    ├── 1.png
    └── 2.png
```

Example `metadata/0.json`:

```json
{
  "name": "XDC Pioneer #0",
  "description": "The first NFT on XDC Network",
  "image": "ipfs://QmYourImageHash/0.png",
  "attributes": [
    {
      "trait_type": "Collection",
      "value": "XDC Pioneers"
    },
    {
      "trait_type": "Generation",
      "value": 1
    }
  ]
}
```

### Step 5 — Upload to IPFS

Using [Pinata](https://pinata.cloud/) (recommended):

```bash title="Terminal"
# Install Pinata CLI
npm install -g pinata-upload-cli

# Upload metadata folder
pinata-upload metadata/

# Output: ipfs://QmYourMetadataHash
```

Or using [NFT.Storage](https://nft.storage/):

```bash title="Terminal"
# Upload via API
curl -X POST https://api.nft.storage/upload \
  -H "Authorization: Bearer *** \
  --data-binary @metadata/0.json
```

> 💡 **IPFS Guide**  
> For detailed IPFS setup, see the [IPFS Integration Guide](../storage/ipfs.md).

---

## Deployment and Verification

### Step 6 — Configure Hardhat

Update `hardhat.config.js`:

```javascript title="hardhat.config.js"
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.24",
  networks: {
    apothem: {
      url: "https://rpc.apothem.network",
      chainId: 51,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    xdc: {
      url: "https://rpc.xinfin.network",
      chainId: 50,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: {
      xdc: "none",
      apothem: "none",
    },
    customChains: [
      {
        network: "xdc",
        chainId: 50,
        urls: {
          apiURL: "https://xdcscan.com/api",
          browserURL: "https://xdcscan.com",
        },
      },
      {
        network: "apothem",
        chainId: 51,
        urls: {
          apiURL: "https://testnet.xdcscan.com/api",
          browserURL: "https://testnet.xdcscan.com",
        },
      },
    ],
  },
};
```

### Step 7 — Deploy Script

Create `scripts/deploy.js`:

```javascript title="scripts/deploy.js"
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const baseURI = "ipfs://QmYourMetadataHash"; // Replace with your IPFS hash
  
  const XDCNFT = await hre.ethers.getContractFactory("XDCNFT");
  const nft = await XDCNFT.deploy("XDC Pioneers", "XDCP", baseURI);
  
  await nft.waitForDeployment();
  const address = await nft.getAddress();
  
  console.log(`NFT deployed to: ${address}`);
  console.log(`View on XDCScan: https://testnet.xdcscan.com/address/${address}`);
}

main().catch(console.error);
```

### Step 8 — Deploy to Apothem

```bash title="Terminal"
npx hardhat run scripts/deploy.js --network apothem
```

### Step 9 — Verify on XDCScan

```bash title="Terminal"
npx hardhat verify --network apothem DEPLOYED_CONTRACT_ADDRESS "XDC Pioneers" "XDCP" "ipfs://QmYourMetadataHash"
```

### Step 10 — Test Minting

```javascript title="scripts/mint.js"
const hre = require("hardhat");

async function main() {
  const contractAddress = "DEPLOYED_CONTRACT_ADDRESS";
  const XDCNFT = await hre.ethers.getContractFactory("XDCNFT");
  const nft = XDCNFT.attach(contractAddress);

  // Mint an NFT (send 0.01 XDC)
  const tx = await nft.mint({ value: hre.ethers.parseEther("0.01") });
  const receipt = await tx.wait();
  
  console.log("Minted! Transaction:", receipt.hash);
  console.log("View NFT: https://testnet.xdcscan.com/tx/" + receipt.hash);
}

main().catch(console.error);
```

```bash title="Terminal"
npx hardhat run scripts/mint.js --network apothem
```

---

## Marketplace Integration

### Listing NFTs

To list your NFT on a marketplace:

1. **Approve the marketplace** to transfer your NFT:

```javascript
await nft.approve("MARKETPLACE_ADDRESS", tokenId);
```

2. **List for sale** (example marketplace contract interaction):

```javascript
const marketplace = await ethers.getContractAt("IMarketplace", "MARKETPLACE_ADDRESS");
await marketplace.listItem(nftAddress, tokenId, price);
```

### Trading Mechanics

Standard marketplace flow:
1. Seller lists NFT with price
2. Buyer purchases with XDC
3. Marketplace transfers NFT and distributes funds
4. Creator royalty is paid automatically (if EIP-2981 supported)

### Royalty Enforcement

Add EIP-2981 to your contract:

```solidity
import "@openzeppelin/contracts/token/common/ERC2981.sol";

contract XDCNFT is ERC721, ERC2981, ... {
    constructor() {
        // Set 5% royalty for owner
        _setDefaultRoyalty(msg.sender, 500); // 500 = 5%
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
```

---

## Gas Cost Estimates

| Operation | Gas (approx) | XDC Cost |
|-----------|--------------|----------|
| Deploy contract | 3,500,000 | ~0.0009 XDC |
| Mint NFT | 150,000 | ~0.00004 XDC |
| Transfer NFT | 65,000 | ~0.00002 XDC |
| List on marketplace | 80,000 | ~0.00002 XDC |

> 💡 XDC gas fees are extremely low compared to Ethereum.

---

## Security Considerations

1. **Reentrancy**: Use `ReentrancyGuard` for mint functions with external calls
2. **Access Control**: Only owner should set mint price or withdraw
3. **Max Supply**: Enforce hard cap to prevent unlimited minting
4. **URI Validation**: Ensure metadata URIs are valid and accessible
5. **Royalty Fairness**: Set reasonable royalty rates (2.5%–10%)

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `ERC721: invalid token ID` | Token doesn't exist | Check tokenId < totalSupply |
| `URI query for nonexistent token` | Metadata not uploaded | Verify IPFS hash is correct |
| `insufficient funds` | Not enough XDC for minting | Get test XDC from faucet |
| `Ownable: caller is not owner` | Unauthorized function call | Use owner wallet |
| Metadata not showing | IPFS gateway issue | Try different gateway (pinata.cloud, ipfs.io) |

---

## Next Steps

- [IPFS Integration Guide →](../storage/ipfs.md) — Deep dive into decentralized storage
- [Token Gating →](../smartcontract/token-gating.md) — Build token-gated experiences
- [Soulbound Tokens →](../smartcontract/sbt.md) — Non-transferable credentials
- [Security Best Practices →](../security/security-practices.md) — Audit checklist
