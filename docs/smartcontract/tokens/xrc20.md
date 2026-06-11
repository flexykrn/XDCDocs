---
title: XRC20 Token Standard — Fungible Tokens on XDC
description: Complete guide to creating, deploying, and managing XRC20 tokens on XDC Network. Includes Solidity code, OpenZeppelin integration, deployment scripts, and verification.
---

# XRC20 Token Standard

XRC20 is the fungible token standard on XDC Network, fully compatible with ERC-20. This guide covers everything from writing your first token to deploying and verifying it on XDCScan.

---

## Overview

| Feature | XRC20 | ERC-20 (Ethereum) |
|---------|-------|-------------------|
| Fungibility | Yes | Yes |
| Divisibility | Up to 18 decimals | Up to 18 decimals |
| Gas cost (transfer) | ~0.0001 XDC | ~$0.50–$2 |
| Block time | ~2 seconds | ~12 seconds |
| Explorer | XDCScan | Etherscan |

XRC20 tokens are ideal for:
- Cryptocurrencies and stablecoins
- Utility tokens for dApps
- Governance tokens
- Reward and loyalty points

---

## Quick Start — Deploy in 5 Minutes

Use OpenZeppelin's battle-tested contracts:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MyToken is ERC20 {
    constructor(uint256 initialSupply) ERC20("MyToken", "MTK") {
        _mint(msg.sender, initialSupply * 10 ** decimals());
    }
}
```

---

## Writing an XRC20 Contract

### Basic Token

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BasicXRC20 is ERC20, Ownable {
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) ERC20(name, symbol) Ownable(msg.sender) {
        _mint(msg.sender, initialSupply * 10 ** decimals());
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }
}
```

### Advanced Token (Mintable, Burnable, Pausable)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AdvancedXRC20 is ERC20, ERC20Burnable, ERC20Pausable, Ownable {
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10 ** 18;

    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) ERC20(name, symbol) Ownable(msg.sender) {
        require(initialSupply <= MAX_SUPPLY, "Exceeds max supply");
        _mint(msg.sender, initialSupply);
    }

    function mint(address to, uint256 amount) public onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");
        _mint(to, amount);
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Pausable)
    {
        super._update(from, to, value);
    }
}
```

---

## Deployment

### With Hardhat

**Install dependencies:**

```bash
npm install @openzeppelin/contracts
```

**hardhat.config.ts:**

```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    xdc: {
      url: "https://rpc.xinfin.network",
      chainId: 50,
      accounts: [process.env.PRIVATE_KEY!],
    },
    apothem: {
      url: "https://rpc.apothem.network",
      chainId: 51,
      accounts: [process.env.PRIVATE_KEY!],
    },
  },
};

export default config;
```

**deploy.ts:**

```typescript
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const Token = await ethers.getContractFactory("AdvancedXRC20");
  const token = await Token.deploy("MyToken", "MTK", ethers.parseEther("1000000"));

  await token.waitForDeployment();
  console.log("Token deployed to:", await token.getAddress());
}

main().catch(console.error);
```

**Deploy:**

```bash
npx hardhat run scripts/deploy.ts --network apothem
```

### With Foundry

```bash
forge create src/MyToken.sol:AdvancedXRC20 \
  --rpc-url https://rpc.apothem.network \
  --private-key $PRIVATE_KEY \
  --constructor-args "MyToken" "MTK" 1000000000000000000000000
```

### With Remix

1. Open [remix.xinfin.network](https://remix.xinfin.network/)
2. Create new file `MyToken.sol`
3. Paste the contract code
4. Compile with Solidity 0.8.20
5. Select "Injected Provider — MetaMask"
6. Ensure MetaMask is on XDC Apothem Testnet
7. Click Deploy

---

## Verification on XDCScan

### Automatic (Hardhat)

```bash
npx hardhat verify --network apothem DEPLOYED_ADDRESS "MyToken" "MTK" 1000000000000000000000000
```

### Manual

1. Go to [testnet.xdcscan.com](https://testnet.xdcscan.com)
2. Search for your contract address
3. Click **"Verify & Publish"**
4. Select compiler version (e.g., `v0.8.20`)
5. Paste source code
6. Click **"Verify"**

---

## Interacting with Your Token

### Hardhat Script

```typescript
const token = await ethers.getContractAt("AdvancedXRC20", "0x...");

// Check balance
const balance = await token.balanceOf("0x...");
console.log(ethers.formatEther(balance));

// Transfer
await token.transfer("0x...", ethers.parseEther("100"));

// Approve spending
await token.approve("0x...", ethers.parseEther("1000"));
```

### Ethers.js (Frontend)

```javascript
const provider = new ethers.JsonRpcProvider("https://rpc.apothem.network");
const signer = new ethers.Wallet(privateKey, provider);

const token = new ethers.Contract(
  "0x...",
  ["function transfer(address to, uint256 amount)"],
  signer
);

await token.transfer("0x...", ethers.parseEther("100"));
```

---

## Security Best Practices

| Practice | Why It Matters |
|----------|---------------|
| Use OpenZeppelin | Battle-tested, audited code |
| Cap max supply | Prevents infinite inflation |
| Ownable for admin | Controlled minting/pausing |
| ReentrancyGuard | Prevents reentrancy attacks |
| Events for transfers | Off-chain indexing |

---

## Gas Cost Comparison

| Operation | XDC (Apothem) | Ethereum (Goerli) |
|-----------|--------------|-------------------|
| Deploy basic token | ~0.001 XDC | ~$5 |
| Transfer | ~0.0001 XDC | ~$0.50 |
| Approve | ~0.0001 XDC | ~$0.30 |

---

## 🚀 Next Steps

1. **[XRC721 NFTs →](./xrc721.md)** — Create non-fungible tokens (⏱️ 20 min)
2. **[XRC1155 Multi-Token →](./xrc1155.md)** — Batch minting and gaming tokens (⏱️ 20 min)
3. **[Contract Verification →](../verify.md)** — Verify on XDCScan automatically (⏱️ 5 min)
4. **[Security Practices →](../../security/security-practices.md)** — Secure your token contract

Or explore:
- **[OpenZeppelin Docs](https://docs.openzeppelin.com/contracts)** — Full ERC-20 reference
- **[XDCScan Tokens](https://xdcscan.io/tokens)** — Browse existing XRC20 tokens
