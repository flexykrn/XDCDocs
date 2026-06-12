---
title: Token Gating Documentation — NFT and Token-Based Access Control on XDC
description: Complete token gating guide for XDC — on-chain and off-chain verification, Discord integration, website gating, event ticketing, and security best practices.
---

Difficulty: Intermediate | Time: ~25 minutes | Tools: ethers.js, Discord API, Node.js

# Token Gating Documentation — NFT and Token-Based Access Control on XDC

Token gating restricts access to content, communities, or events based on token ownership. This guide covers building token-gated experiences on XDC.

## Prerequisites

- [Hardhat Guide](../smartcontract/hardhat.md) or [Foundry Guide](../smartcontract/foundry.md) completed
- [NFT Tutorial](../smartcontract/nft.md) (recommended for NFT gating context)
- Basic understanding of web servers and APIs

---

## Token Gating Concepts

### Ownership Verification

Token gating checks if a user owns specific tokens:

```javascript
const balance = await tokenContract.balanceOf(userAddress);
if (balance > 0) {
  // Grant access
}
```

### Balance Requirements

Require minimum token amounts:

```javascript
const minTokens = 100;
const balance = await tokenContract.balanceOf(userAddress);
if (balance >= minTokens) {
  // Grant premium access
}
```

### NFT Gating

Check ownership of specific NFTs:

```javascript
const owner = await nftContract.ownerOf(tokenId);
if (owner === userAddress) {
  // Grant access to exclusive content
}
```

### Time-Based Access

Combine token ownership with time constraints:

```javascript
const holdingTime = await calculateHoldingTime(userAddress, tokenAddress);
if (holdingTime >= 30 days) {
  // Grant long-term holder benefits
}
```

---

## Implementation Patterns

### On-Chain Verification

Verify ownership directly in smart contracts:

```solidity title="contracts/TokenGate.sol"
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
}

interface IERC721 {
    function balanceOf(address owner) external view returns (uint256);
    function ownerOf(uint256 tokenId) external view returns (address);
}

contract TokenGate {
    address public tokenAddress;
    uint256 public minBalance;
    
    constructor(address _tokenAddress, uint256 _minBalance) {
        tokenAddress = _tokenAddress;
        minBalance = _minBalance;
    }
    
    function hasAccess(address user) public view returns (bool) {
        return IERC20(tokenAddress).balanceOf(user) >= minBalance;
    }
    
    modifier onlyTokenHolders() {
        require(hasAccess(msg.sender), "Must hold minimum tokens");
        _;
    }
    
    function accessRestrictedContent() public onlyTokenHolders view returns (string memory) {
        return "Exclusive content for token holders";
    }
}
```

### Off-Chain Verification

Verify ownership in your backend or frontend:

```javascript title="server/verify.js"
const { ethers } = require('ethers');

const provider = new ethers.JsonRpcProvider('https://rpc.apothem.network');
const tokenABI = ["function balanceOf(address) view returns (uint256)"];

async function verifyTokenOwnership(userAddress, tokenAddress, minBalance = 1) {
    const contract = new ethers.Contract(tokenAddress, tokenABI, provider);
    const balance = await contract.balanceOf(userAddress);
    return balance >= minBalance;
}

// Express middleware
function requireTokenOwnership(tokenAddress, minBalance) {
    return async (req, res, next) => {
        const userAddress = req.headers['x-wallet-address'];
        if (!userAddress) return res.status(401).json({ error: 'Wallet address required' });
        
        const hasAccess = await verifyTokenOwnership(userAddress, tokenAddress, minBalance);
        if (!hasAccess) return res.status(403).json({ error: 'Token ownership required' });
        
        next();
    };
}

module.exports = { verifyTokenOwnership, requireTokenOwnership };
```

### Hybrid Approach

Combine on-chain and off-chain for optimal UX:

```javascript title="client/hybrid-gate.js"
import { ethers } from 'ethers';

class HybridTokenGate {
    constructor(provider, tokenAddress, apiEndpoint) {
        this.provider = provider;
        this.tokenAddress = tokenAddress;
        this.apiEndpoint = apiEndpoint;
    }
    
    async verifyOnChain(userAddress) {
        const contract = new ethers.Contract(
            this.tokenAddress,
            ['function balanceOf(address) view returns (uint256)'],
            this.provider
        );
        const balance = await contract.balanceOf(userAddress);
        return balance > 0;
    }
    
    async verifyOffChain(userAddress, signature) {
        const response = await fetch(`${this.apiEndpoint}/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: userAddress, signature })
        });
        return response.json();
    }
    
    async verify(userAddress, signature) {
        // Quick on-chain check
        const onChain = await this.verifyOnChain(userAddress);
        if (!onChain) return false;
        
        // Verify signature off-chain
        const offChain = await this.verifyOffChain(userAddress, signature);
        return offChain.valid;
    }
}
```

### Signature Validation

Use signed messages for gasless verification:

```javascript title="server/signature.js"
const { ethers } = require('ethers');

function verifySignature(message, signature, expectedAddress) {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
}

// Generate challenge message
function generateChallenge(userAddress, timestamp) {
    return `Verify ownership for ${userAddress} at ${timestamp}`;
}

module.exports = { verifySignature, generateChallenge };
```

---

## Platform Integration

### Discord Bot

Create a Discord bot that grants roles based on token ownership:

```javascript title="bot/discord-bot.js"
const { Client, GatewayIntentBits } = require('discord.js');
const { ethers } = require('ethers');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
const provider = new ethers.JsonRpcProvider('https://rpc.apothem.network');

const TOKEN_ADDRESS = '0xYour...TokenAddress';
const ROLE_ID = '1234567890123456789';

async function checkTokenBalance(address) {
    const contract = new ethers.Contract(
        TOKEN_ADDRESS,
        ['function balanceOf(address) view returns (uint256)'],
        provider
    );
    return await contract.balanceOf(address);
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    
    if (interaction.commandName === 'verify') {
        const walletAddress = interaction.options.getString('address');
        const balance = await checkTokenBalance(walletAddress);
        
        if (balance > 0) {
            const member = await interaction.guild.members.fetch(interaction.user.id);
            await member.roles.add(ROLE_ID);
            await interaction.reply('✅ Token ownership verified! Role granted.');
        } else {
            await interaction.reply('❌ No tokens found. You need to hold tokens to access this channel.');
        }
    }
});

client.login('YOUR_DISCORD_BOT_TOKEN');
```

### Website Gating

Gate website content with token ownership:

```javascript title="client/website-gate.js"
import { ethers } from 'ethers';

class WebsiteGate {
    constructor(tokenAddress, requiredBalance = 1) {
        this.tokenAddress = tokenAddress;
        this.requiredBalance = requiredBalance;
    }
    
    async connect() {
        if (!window.ethereum) {
            throw new Error('MetaMask not installed');
        }
        
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        
        return { provider, signer, address };
    }
    
    async verifyAccess(address) {
        const provider = new ethers.JsonRpcProvider('https://rpc.apothem.network');
        const contract = new ethers.Contract(
            this.tokenAddress,
            ['function balanceOf(address) view returns (uint256)'],
            provider
        );
        
        const balance = await contract.balanceOf(address);
        return balance >= this.requiredBalance;
    }
    
    async gateContent(contentElement) {
        try {
            const { address } = await this.connect();
            const hasAccess = await this.verifyAccess(address);
            
            if (hasAccess) {
                contentElement.classList.remove('gated');
                contentElement.classList.add('unlocked');
            } else {
                contentElement.innerHTML = `
                    <div class="gate-message">
                        <h2>🔒 Token-Gated Content</h2>
                        <p>You need ${this.requiredBalance} tokens to access this content.</p>
                        <button onclick="window.buyTokens()">Buy Tokens</button>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Gating error:', error);
            contentElement.innerHTML = '<p>Connect wallet to view content</p>';
        }
    }
}

// Usage
const gate = new WebsiteGate('0xYourTokenAddress', 1);
gate.gateContent(document.getElementById('premium-content'));
```

### Event Ticketing

Token-based event tickets:

```solidity title="contracts/EventTicket.sol"
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract EventTicket is ERC721, Ownable {
    uint256 public ticketPrice = 0.1 ether;
    uint256 public maxTickets = 1000;
    uint256 public ticketsSold;
    uint256 public eventDate;
    
    mapping(uint256 => bool) public usedTickets;
    
    constructor(string memory _name, string memory _symbol, uint256 _eventDate) 
        ERC721(_name, _symbol) 
        Ownable(msg.sender) 
    {
        eventDate = _eventDate;
    }
    
    function buyTicket() public payable returns (uint256) {
        require(msg.value >= ticketPrice, "Insufficient payment");
        require(ticketsSold < maxTickets, "Sold out");
        require(block.timestamp < eventDate, "Event has started");
        
        uint256 tokenId = ticketsSold;
        ticketsSold++;
        _safeMint(msg.sender, tokenId);
        
        return tokenId;
    }
    
    function useTicket(uint256 tokenId) public {
        require(ownerOf(tokenId) == msg.sender, "Not ticket owner");
        require(!usedTickets[tokenId], "Ticket already used");
        require(block.timestamp >= eventDate, "Event not started");
        
        usedTickets[tokenId] = true;
    }
    
    function withdraw() public onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
```

### Content Platforms

Token-gated articles, videos, or downloads:

```javascript title="server/content-gate.js"
const express = require('express');
const { ethers } = require('ethers');

const app = express();
const provider = new ethers.JsonRpcProvider('https://rpc.apothem.network');

// Middleware to check token ownership
async function requireToken(req, res, next) {
    const address = req.headers['x-wallet-address'];
    const signature = req.headers['x-signature'];
    const tokenAddress = req.params.tokenAddress;
    
    if (!address || !signature) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Verify signature
    const message = `Access content at ${Date.now()}`;
    const recovered = ethers.verifyMessage(message, signature);
    
    if (recovered.toLowerCase() !== address.toLowerCase()) {
        return res.status(403).json({ error: 'Invalid signature' });
    }
    
    // Check token balance
    const contract = new ethers.Contract(
        tokenAddress,
        ['function balanceOf(address) view returns (uint256)'],
        provider
    );
    
    const balance = await contract.balanceOf(address);
    if (balance === 0n) {
        return res.status(403).json({ error: 'Token ownership required' });
    }
    
    next();
}

// Protected route
app.get('/content/:tokenAddress/premium', requireToken, (req, res) => {
    res.json({
        content: "This is premium token-gated content!",
        videoUrl: "ipfs://QmPremiumVideo",
        downloadUrl: "ipfs://QmPremiumDownload"
    });
});

app.listen(3000, () => console.log('Server running on port 3000'));
```

---

## Security Considerations

### Replay Attacks

Prevent signature replay:

```javascript
const usedSignatures = new Set();

function verifySignatureOnce(message, signature, address) {
    const signatureKey = `${address}:${signature}`;
    if (usedSignatures.has(signatureKey)) {
        throw new Error('Signature already used');
    }
    
    const recovered = ethers.verifyMessage(message, signature);
    if (recovered.toLowerCase() !== address.toLowerCase()) {
        throw new Error('Invalid signature');
    }
    
    usedSignatures.add(signatureKey);
    return true;
}
```

### Signature Verification

Always verify signatures server-side:

```javascript
// Server-side verification only
app.post('/verify', async (req, res) => {
    const { address, message, signature } = req.body;
    
    try {
        const recovered = ethers.verifyMessage(message, signature);
        const valid = recovered.toLowerCase() === address.toLowerCase();
        res.json({ valid });
    } catch (error) {
        res.status(400).json({ valid: false, error: error.message });
    }
});
```

### Rate Limiting

Prevent brute force attacks:

```javascript
const rateLimit = require('express-rate-limit');

const verifyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: 'Too many verification attempts'
});

app.use('/verify', verifyLimiter);
```

### Privacy Concerns

- Don't log wallet addresses with content access patterns
- Use zero-knowledge proofs for sensitive verification
- Allow users to disconnect wallets
- Don't expose other users' holdings

---

## Example Projects

### Discord Community Gate

```javascript
// Complete Discord bot with token gating
const { Client, GatewayIntentBits, SlashCommandBuilder } = require('discord.js');
const { ethers } = require('ethers');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

const commands = [
    new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Verify token ownership')
        .addStringOption(option =>
            option.setName('address')
                .setDescription('Your XDC wallet address')
                .setRequired(true))
];

// ... (implementation similar to above)
```

### Website Premium Content

```html
<!-- Frontend with token gating -->
<div id="premium-content" class="gated">
    <h1>Premium Article</h1>
    <p>This content is only visible to token holders.</p>
</div>

<script type="module">
    import { WebsiteGate } from './website-gate.js';
    const gate = new WebsiteGate('0xTokenAddress', 1);
    gate.gateContent(document.getElementById('premium-content'));
</script>
```

---

## Testing Procedures

1. **Test with zero balance**: Ensure access is denied
2. **Test with minimum balance**: Ensure access is granted
3. **Test signature replay**: Ensure same signature fails twice
4. **Test expired signatures**: Ensure old signatures are rejected
5. **Test different tokens**: Ensure wrong token doesn't grant access

---

## UX Recommendations

1. **Clear messaging**: Explain why content is gated and how to gain access
2. **Multiple options**: Support both token and NFT gating
3. **Grace periods**: Allow temporary access after token transfer
4. **Progressive disclosure**: Show preview of gated content
5. **Mobile support**: Ensure wallet connection works on mobile browsers

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Must hold minimum tokens" | Balance too low | Acquire more tokens |
| "Invalid signature" | Wrong signature format | Use ethers.signMessage() |
| "Signature already used" | Replay attack prevention | Generate new signature |
| "Authentication required" | Missing headers | Include wallet address and signature |
| Role not granted | Bot lacks permissions | Check Discord bot permissions |

---

## Next Steps

- [NFT Tutorial →](../smartcontract/nft.md) — Create NFTs for gating
- [IPFS Integration →](../storage/ipfs.md) — Store gated content
- [Soulbound Tokens →](../smartcontract/sbt.md) — Non-transferable credentials for gating
- [Security Best Practices →](../security/security-practices.md) — Secure your gating system
