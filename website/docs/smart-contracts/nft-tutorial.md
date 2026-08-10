---
title: NFT Tutorial — XRC721 on XDC
sidebar_position: 15
description: Create, deploy, and manage XRC721 NFTs on the XDC Network with Hardhat and OpenZeppelin — contract code, Apothem deployment, minting, metadata, and transfers.
---

# NFT Tutorial — XRC721 on XDC

This tutorial walks you through the full lifecycle of an NFT collection on the XDC Network: writing an XRC721 contract with OpenZeppelin, deploying it to the Apothem Testnet with Hardhat, minting tokens with metadata, and managing them (transfers, approvals, burns).

## What Is XRC721?

XRC721 is the XDC Network's non-fungible token standard, fully compatible with Ethereum's ERC721. Each XRC721 token is unique, individually owned, and tracked by a distinct `tokenId` on-chain — ideal for digital art, collectibles, certificates, and tokenized real-world assets. Because XDC is EVM-compatible, standard ERC721 contracts and tooling (OpenZeppelin, ethers.js, Hardhat) work without modification.

For an overview of all token standards on XDC, see [Tokens Built On XDC](/docs/smart-contracts/tokens).

## Prerequisites

- **Node.js** (v18 or later) and npm installed.
- A funded wallet on the Apothem Testnet (chain ID 51) — get free test XDC from the [Apothem faucet](https://faucet.apothem.network).
- A Hardhat project configured for XDC. This tutorial assumes the Hardhat setup from the [Smart Contract Testing Guide](/docs/smart-contracts/testing-guide) — follow its setup steps first if you haven't already, then install OpenZeppelin contracts:

```bash
npm install @openzeppelin/contracts dotenv
```

## Write the NFT Contract

Create `contracts/MyNFT.sol`. We extend OpenZeppelin's `ERC721` with `ERC721URIStorage` (per-token metadata URIs) and `Ownable` (only the deployer can mint):

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyNFT is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    constructor() ERC721("MyNFT", "MNFT") Ownable(msg.sender) {}

    function mint(address to, string memory tokenURI) public onlyOwner {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
    }

    function burn(uint256 tokenId) public {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        _burn(tokenId);
    }
}
```

Compile it:

```bash
npx hardhat compile
```

## Configure Hardhat for Apothem

Your `hardhat.config.js` should expose the Apothem network. This mirrors the configuration in the [testing guide](/docs/smart-contracts/testing-guide):

```javascript
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.24",
  networks: {
    apothem: {
      url: "https://rpc.apothem.network",
      chainId: 51,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
};
```

Keep your deployer private key in a `.env` file (`PRIVATE_KEY=0x...`) and never commit it. Note: XDC Network supports Solidity up to 0.8.24.

## Deploy to Apothem

Create `scripts/deploy.js`:

```javascript
const { ethers } = require("hardhat");

async function main() {
  const MyNFT = await ethers.getContractFactory("MyNFT");
  const nft = await MyNFT.deploy();
  await nft.waitForDeployment();
  console.log("MyNFT deployed to:", await nft.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

Run it against Apothem:

```bash
npx hardhat run scripts/deploy.js --network apothem
```

Expected output:

```bash
MyNFT deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

Save this contract address — you'll need it for minting and verification.

## Mint an NFT

Create `scripts/mint.js`, replacing the contract address and recipient with your own:

```javascript
const { ethers } = require("hardhat");

async function main() {
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const recipient = "0xYourRecipientAddress";
  const tokenURI = "ipfs://bafybeigd.../metadata/0.json";

  const nft = await ethers.getContractAt("MyNFT", contractAddress);
  const tx = await nft.mint(recipient, tokenURI);
  const receipt = await tx.wait();
  console.log("Minted token in tx:", receipt.hash);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

```bash
npx hardhat run scripts/mint.js --network apothem
```

## NFT Metadata Standard

The `tokenURI` points to a JSON document following the standard metadata format:

```json
{
  "name": "My First XDC NFT",
  "description": "An example NFT minted on the XDC Apothem Testnet.",
  "image": "ipfs://bafybeigd.../image.png",
  "attributes": [
    { "trait_type": "Level", "value": 1 }
  ]
}
```

- `name` and `description` are plain strings; `image` is a URL (or IPFS URI) to the artwork; `attributes` is an optional array of traits displayed by marketplaces.
- **Hosting:** for permanence, host both the image and the JSON on decentralized storage such as IPFS rather than a centralized server that could go offline or be altered.

## View and Verify on the Explorer

- Open your contract and mint transaction on the Apothem explorer at [testnet.xdcscan.com](https://testnet.xdcscan.com) to confirm the `Transfer` event and token ownership.
- Verify your source code so the explorer shows the contract's functions and metadata — follow the steps in [Deployment & Verification](/docs/smart-contracts/deployment-verification). On mainnet, the same process applies on [xdcscan.com](https://xdcscan.com).

## Managing Your NFTs

XRC721 tokens support the standard ERC721 management operations. All snippets below assume an attached contract instance (`nft`) as in the mint script:

**Transfer a token you own:**

```javascript
await nft.transferFrom(ownerAddress, recipientAddress, tokenId);
```

**Approve another address (e.g., a marketplace) to transfer a specific token:**

```javascript
await nft.approve(operatorAddress, tokenId);
// or approve all of your tokens:
await nft.setApprovalForAll(operatorAddress, true);
```

**Burn (destroy) a token you own:**

```javascript
await nft.burn(tokenId);
```

After `approve`, the operator can call `transferFrom(owner, to, tokenId)` themselves — this is how marketplace listings work.

## Mainnet Checklist

Before deploying to XDC mainnet (chain ID 50):

1. **Audit your contract** against the [Smart Contract Security Best Practices](/docs/smart-contracts/security-best-practices) checklist — mainnet bytecode is immutable.
2. **Rehearse the full flow on Apothem** — deploy, mint, transfer, and verify end-to-end with free test XDC first.
3. **Deploy to mainnet** by pointing Hardhat at `https://rpc.xinfin.network` with chain ID 50 and a funded mainnet key.
4. **Royalties caveat:** ERC721 has no built-in royalty enforcement — royalty payments depend on marketplace support (e.g., EIP-2981). Confirm your target marketplaces honor your chosen royalty scheme before launch.

## See Also

- [Tokens Built On XDC](/docs/smart-contracts/tokens) — XRC20, XRC721, and XRC404 overview.
- [Smart Contract Testing Guide](/docs/smart-contracts/testing-guide) — Hardhat/Foundry setup and Apothem rehearsal.
- [Smart Contract Security Best Practices](/docs/smart-contracts/security-best-practices) — audit checklist and common vulnerabilities.
- [Deployment & Verification](/docs/smart-contracts/deployment-verification) — verifying contracts on XDCScan.
