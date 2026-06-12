---
title: Soulbound Token (SBT) Documentation — Non-Transferable Credentials on XDC
description: Complete SBT guide for XDC — EIP-5192 implementation, credential issuance, identity systems, reputation protocols, and use cases.
---

Difficulty: Advanced | Time: ~25 minutes | Tools: Hardhat/Foundry, OpenZeppelin, IPFS

# Soulbound Token (SBT) Documentation — Non-Transferable Credentials on XDC

Soulbound Tokens (SBTs) are non-transferable NFTs that represent credentials, identity, and reputation. This guide covers building SBT systems on XDC.

## Prerequisites

- [Hardhat Guide](../smartcontract/hardhat.md) or [Foundry Guide](../smartcontract/foundry.md) completed
- [NFT Tutorial](../smartcontract/nft.md) (recommended for NFT context)
- Understanding of EIP-5192 and non-transferable tokens

---

## SBT Concepts

### What Are Soulbound Tokens

SBTs are tokens that cannot be transferred once issued. They are "bound" to a specific wallet address forever. Introduced by Vitalik Buterin in 2022, SBTs enable:

- **Decentralized identity**: Prove who you are without revealing private data
- **Credentials**: Academic degrees, professional certifications
- **Reputation**: On-chain history of achievements and contributions
- **Membership**: Permanent community membership badges

### Use Cases

| Use Case | Description | Example |
|----------|-------------|---------|
| **Academic Credentials** | University degrees, course completions | MIT diploma as SBT |
| **Professional Certifications** | Industry certifications, training | AWS certification |
| **Membership Badges** | Community participation, DAO membership | Early contributor badge |
| **Reputation Scores** | Credit history, contribution metrics | GitHub contribution score |
| **Identity Verification** | KYC, government ID | National ID token |
| **Event Attendance** | Proof of attendance | Conference POAP |

### EIP-5192 Standard

EIP-5192 defines the minimal interface for SBTs:

```solidity
interface IERC5192 {
    /// @notice Emitted when a token is locked (non-transferable)
    event Locked(uint256 tokenId);
    
    /// @notice Emitted when a token is unlocked (transferable)
    event Unlocked(uint256 tokenId);
    
    /// @notice Returns whether a token is locked (non-transferable)
    /// @param tokenId The token to check
    /// @return True if the token is locked, false otherwise
    function locked(uint256 tokenId) external view returns (bool);
}
```

### Comparison with NFTs

| Feature | NFT | SBT |
|---------|-----|-----|
| Transferable | ✅ Yes | ❌ No |
| Tradable | ✅ Yes | ❌ No |
| Represents | Assets, collectibles | Identity, credentials |
| Use case | Art, gaming, real estate | Degrees, reputation, membership |
| Standard | ERC721 | EIP-5192 + ERC721 |

---

## Implementation

### Step 1 — Project Setup

```bash title="Terminal"
mkdir xdc-sbt && cd xdc-sbt
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm install @openzeppelin/contracts
npx hardhat init
```

### Step 2 — Write the SBT Contract

Create `contracts/SoulboundToken.sol`:

```solidity title="contracts/SoulboundToken.sol"
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

interface IERC5192 {
    event Locked(uint256 tokenId);
    event Unlocked(uint256 tokenId);
    function locked(uint256 tokenId) external view returns (bool);
}

contract SoulboundToken is ERC721, ERC721Enumerable, ERC721URIStorage, Ownable, IERC5192 {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    mapping(uint256 => bool) private _locked;
    mapping(address => bool) private _issuers;

    event IssuerAdded(address indexed issuer);
    event IssuerRemoved(address indexed issuer);

    constructor(string memory _name, string memory _symbol) 
        ERC721(_name, _symbol) 
        Ownable(msg.sender) 
    {
        _issuers[msg.sender] = true;
    }

    modifier onlyIssuer() {
        require(_issuers[msg.sender], "Not authorized issuer");
        _;
    }

    modifier onlyTokenOwner(uint256 tokenId) {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        _;
    }

    // ========== Issuance ==========

    function issue(address to, string memory uri) public onlyIssuer returns (uint256) {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        _locked[tokenId] = true;
        
        emit Locked(tokenId);
        return tokenId;
    }

    function batchIssue(address[] calldata recipients, string[] calldata uris) 
        external 
        onlyIssuer 
        returns (uint256[] memory) 
    {
        require(recipients.length == uris.length, "Length mismatch");
        
        uint256[] memory tokenIds = new uint256[](recipients.length);
        for (uint256 i = 0; i < recipients.length; i++) {
            tokenIds[i] = issue(recipients[i], uris[i]);
        }
        return tokenIds;
    }

    // ========== Revocation ==========

    function revoke(uint256 tokenId) external onlyIssuer {
        require(_locked[tokenId], "Token not locked");
        _burn(tokenId);
    }

    // ========== Locking ==========

    function lock(uint256 tokenId) external onlyIssuer {
        require(!_locked[tokenId], "Already locked");
        _locked[tokenId] = true;
        emit Locked(tokenId);
    }

    function unlock(uint256 tokenId) external onlyIssuer {
        require(_locked[tokenId], "Not locked");
        _locked[tokenId] = false;
        emit Unlocked(tokenId);
    }

    function locked(uint256 tokenId) external view override returns (bool) {
        require(_exists(tokenId), "Token does not exist");
        return _locked[tokenId];
    }

    // ========== Issuer Management ==========

    function addIssuer(address issuer) external onlyOwner {
        _issuers[issuer] = true;
        emit IssuerAdded(issuer);
    }

    function removeIssuer(address issuer) external onlyOwner {
        _issuers[issuer] = false;
        emit IssuerRemoved(issuer);
    }

    function isIssuer(address account) external view returns (bool) {
        return _issuers[account];
    }

    // ========== Transfer Override (Soulbound) ==========

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        if (from != address(0) && to != address(0)) {
            require(!_locked[tokenId], "Soulbound: token is locked");
        }
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    // ========== Required Overrides ==========

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
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
        override(ERC721, ERC721Enumerable, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
```

> 💡 **What this does**  
> `SoulboundToken` is a non-transferable ERC721 with EIP-5192 compliance. Only issuers can mint new tokens, and locked tokens cannot be transferred. Supports batch issuance and revocation.

---

## Use Cases

### Academic Credentials

Issue degrees and certificates:

```solidity
contract AcademicCredential is SoulboundToken {
    struct Credential {
        string institution;
        string degree;
        uint256 issueDate;
        bool valid;
    }
    
    mapping(uint256 => Credential) public credentials;
    
    function issueDegree(
        address student,
        string memory uri,
        string memory institution,
        string memory degree
    ) external onlyIssuer returns (uint256) {
        uint256 tokenId = issue(student, uri);
        credentials[tokenId] = Credential({
            institution: institution,
            degree: degree,
            issueDate: block.timestamp,
            valid: true
        });
        return tokenId;
    }
    
    function revokeDegree(uint256 tokenId) external onlyIssuer {
        credentials[tokenId].valid = false;
        revoke(tokenId);
    }
}
```

### Professional Certifications

Industry certifications and badges:

```javascript title="scripts/issue-cert.js"
const hre = require("hardhat");

async function issueCertification(recipient, name, skill, level) {
    const contract = await hre.ethers.getContractAt("SoulboundToken", "CONTRACT_ADDRESS");
    
    const metadata = {
        name: `${name} - ${skill} Certification`,
        description: `Professional certification for ${skill} - Level ${level}`,
        image: "ipfs://QmCertImageHash",
        attributes: [
            { trait_type: "Skill", value: skill },
            { trait_type: "Level", value: level },
            { trait_type: "Issued", display_type: "date", value: Date.now() }
        ]
    };
    
    // Upload metadata to IPFS
    const ipfsHash = await uploadToIPFS(metadata);
    
    // Issue SBT
    const tx = await contract.issue(recipient, `ipfs://${ipfsHash}`);
    const receipt = await tx.wait();
    
    console.log(`Certification issued! TX: ${receipt.hash}`);
}
```

### Membership Badges

DAO and community membership:

```solidity
contract MembershipBadge is SoulboundToken {
    enum Tier { Bronze, Silver, Gold, Platinum }
    
    mapping(uint256 => Tier) public memberTier;
    mapping(address => uint256) public memberToken;
    
    function issueMembership(address member, Tier tier) external onlyIssuer {
        require(memberToken[member] == 0, "Already a member");
        
        uint256 tokenId = issue(member, getTierURI(tier));
        memberTier[tokenId] = tier;
        memberToken[member] = tokenId;
    }
    
    function upgradeTier(address member, Tier newTier) external onlyIssuer {
        uint256 tokenId = memberToken[member];
        require(tokenId != 0, "Not a member");
        
        // Unlock, upgrade, re-lock
        unlock(tokenId);
        _setTokenURI(tokenId, getTierURI(newTier));
        memberTier[tokenId] = newTier;
        lock(tokenId);
    }
    
    function getTierURI(Tier tier) internal pure returns (string memory) {
        if (tier == Tier.Bronze) return "ipfs://QmBronze";
        if (tier == Tier.Silver) return "ipfs://QmSilver";
        if (tier == Tier.Gold) return "ipfs://QmGold";
        return "ipfs://QmPlatinum";
    }
}
```

### Reputation Scores

On-chain reputation tracking:

```solidity
contract ReputationSBT is SoulboundToken {
    struct Reputation {
        uint256 score;
        uint256 contributions;
        uint256 lastUpdate;
    }
    
    mapping(uint256 => Reputation) public reputations;
    
    function issueReputation(address user, uint256 initialScore) external onlyIssuer {
        uint256 tokenId = issue(user, "ipfs://QmReputationBase");
        reputations[tokenId] = Reputation({
            score: initialScore,
            contributions: 0,
            lastUpdate: block.timestamp
        });
    }
    
    function addContribution(uint256 tokenId, uint256 points) external onlyIssuer {
        Reputation storage rep = reputations[tokenId];
        rep.score += points;
        rep.contributions++;
        rep.lastUpdate = block.timestamp;
    }
    
    function getReputation(uint256 tokenId) external view returns (uint256) {
        return reputations[tokenId].score;
    }
}
```

---

## Integration

### Verification Systems

Verify SBT ownership:

```javascript title="server/verify-sbt.js"
const { ethers } = require('ethers');

const provider = new ethers.JsonRpcProvider('https://rpc.apothem.network');

async function verifySBT(ownerAddress, contractAddress, tokenId) {
    const contract = new ethers.Contract(
        contractAddress,
        [
            'function ownerOf(uint256) view returns (address)',
            'function locked(uint256) view returns (bool)',
            'function tokenURI(uint256) view returns (string)'
        ],
        provider
    );
    
    try {
        const owner = await contract.ownerOf(tokenId);
        const isLocked = await contract.locked(tokenId);
        const uri = await contract.tokenURI(tokenId);
        
        return {
            valid: owner.toLowerCase() === ownerAddress.toLowerCase() && isLocked,
            owner,
            isLocked,
            uri
        };
    } catch (error) {
        return { valid: false, error: error.message };
    }
}

// Express endpoint
app.get('/verify-sbt/:contract/:tokenId', async (req, res) => {
    const { contract, tokenId } = req.params;
    const address = req.query.address;
    
    const result = await verifySBT(address, contract, tokenId);
    res.json(result);
});
```

### Display Interfaces

Show SBTs in user profiles:

```javascript title="client/sbt-display.js"
import { ethers } from 'ethers';

class SBTDisplay {
    constructor(provider, contractAddress) {
        this.provider = provider;
        this.contract = new ethers.Contract(
            contractAddress,
            [
                'function balanceOf(address) view returns (uint256)',
                'function tokenOfOwnerByIndex(address, uint256) view returns (uint256)',
                'function tokenURI(uint256) view returns (string)',
                'function locked(uint256) view returns (bool)'
            ],
            provider
        );
    }
    
    async getSBTs(ownerAddress) {
        const balance = await this.contract.balanceOf(ownerAddress);
        const tokens = [];
        
        for (let i = 0; i < balance; i++) {
            const tokenId = await this.contract.tokenOfOwnerByIndex(ownerAddress, i);
            const uri = await this.contract.tokenURI(tokenId);
            const isLocked = await this.contract.locked(tokenId);
            
            // Fetch metadata from IPFS
            const metadata = await fetch(uri.replace('ipfs://', 'https://ipfs.io/ipfs/')).then(r => r.json());
            
            tokens.push({
                tokenId: tokenId.toString(),
                metadata,
                isLocked,
                image: metadata.image?.replace('ipfs://', 'https://ipfs.io/ipfs/')
            });
        }
        
        return tokens;
    }
    
    async renderSBTs(container, ownerAddress) {
        const sbts = await this.getSBTs(ownerAddress);
        
        container.innerHTML = sbts.map(sbt => `
            <div class="sbt-card">
                <img src="${sbt.image}" alt="${sbt.metadata.name}" />
                <h3>${sbt.metadata.name}</h3>
                <p>${sbt.metadata.description}</p>
                <span class="badge ${sbt.isLocked ? 'locked' : 'unlocked'}">
                    ${sbt.isLocked ? '🔒 Soulbound' : '🔓 Transferable'}
                </span>
            </div>
        `).join('');
    }
}
```

### Privacy Considerations

Selective disclosure with zero-knowledge proofs:

```solidity
// Simplified example - use zk-SNARKs in production
contract PrivateSBT is SoulboundToken {
    mapping(uint256 => bytes32) public commitmentHashes;
    
    function issuePrivate(address to, bytes32 commitmentHash) external onlyIssuer {
        uint256 tokenId = issue(to, ""); // Empty URI for privacy
        commitmentHashes[tokenId] = commitmentHash;
    }
    
    function verifyOwnership(uint256 tokenId, bytes32 proof) external view returns (bool) {
        return commitmentHashes[tokenId] == keccak256(abi.encodePacked(proof));
    }
}
```

### Interoperability

Cross-chain SBT verification:

```javascript
// Verify SBT on XDC from another chain
const xdcProvider = new ethers.JsonRpcProvider('https://rpc.xinfin.network');
const sbtContract = new ethers.Contract(XDC_SBT_ADDRESS, SBT_ABI, xdcProvider);

async function verifyCrossChain(userAddress) {
    const balance = await sbtContract.balanceOf(userAddress);
    return balance > 0;
}
```

---

## Standard Compliance

### EIP-5192 Implementation Checklist

- [ ] Emit `Locked` event on mint
- [ ] Emit `Unlocked` event when applicable
- [ ] Implement `locked(uint256)` view function
- [ ] Override transfers to respect lock status
- [ ] Document unlock conditions (if any)

### ERC721 Compatibility

SBTs should be compatible with ERC721:
- `balanceOf()` works normally
- `ownerOf()` works normally
- `tokenURI()` works normally
- `approve()` and `setApprovalForAll()` should revert for locked tokens
- `transferFrom()` and `safeTransferFrom()` should revert for locked tokens

---

## Example Projects

### University Degree System

```solidity
contract UniversityDegree is SoulboundToken {
    struct Degree {
        string university;
        string program;
        uint256 graduationYear;
        string grade;
    }
    
    mapping(uint256 => Degree) public degrees;
    
    function issueDegree(
        address graduate,
        string memory uri,
        string memory university,
        string memory program,
        uint256 year,
        string memory grade
    ) external onlyIssuer returns (uint256) {
        uint256 tokenId = issue(graduate, uri);
        degrees[tokenId] = Degree(university, program, year, grade);
        return tokenId;
    }
}
```

### Professional Reputation

```solidity
contract DeveloperReputation is SoulboundToken {
    struct Reputation {
        uint256 githubScore;
        uint256 contributionCount;
        string[] skills;
        uint256 lastUpdate;
    }
    
    mapping(uint256 => Reputation) public reputations;
    
    function issueReputation(address developer) external onlyIssuer {
        uint256 tokenId = issue(developer, "ipfs://QmBaseRep");
        reputations[tokenId] = Reputation(0, 0, new string[](0), block.timestamp);
    }
    
    function updateSkills(uint256 tokenId, string[] memory newSkills) external onlyIssuer {
        reputations[tokenId].skills = newSkills;
        reputations[tokenId].lastUpdate = block.timestamp;
    }
}
```

---

## Testing Procedures

1. **Test non-transferability**: Attempt transfer should revert
2. **Test issuance**: Only issuers can mint
3. **Test revocation**: Issuers can burn tokens
4. **Test locking/unlocking**: Lock state changes correctly
5. **Test batch issuance**: Multiple tokens in one transaction
6. **Test metadata**: URI points to valid IPFS content
7. **Test compliance**: Supports EIP-5192 interface

---

## Privacy Considerations

1. **Selective Disclosure**: Use ZK proofs to reveal only necessary data
2. **Data Minimization**: Store only hashes on-chain, details off-chain
3. **Right to be Forgotten**: Implement revocation for sensitive credentials
4. **Access Control**: Limit who can query SBT data

---

## Regulatory Considerations

1. **GDPR Compliance**: EU users have right to deletion (implement revocation)
2. **KYC/AML**: SBTs can simplify compliance for verified identities
3. **Data Protection**: Encrypt sensitive metadata
4. **Jurisdiction**: Consider where credentials are legally recognized

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Soulbound: token is locked" | Transfer attempted | SBTs cannot be transferred |
| "Not authorized issuer" | Unauthorized mint | Add address as issuer |
| "Token does not exist" | Invalid tokenId | Check token exists |
| "Already a member" | Duplicate issuance | Check existing balance |
| Metadata not showing | IPFS issue | Verify IPFS hash and gateway |

---

## Next Steps

- [NFT Tutorial →](../smartcontract/nft.md) — Create transferable NFTs
- [Token Gating →](../smartcontract/token-gating.md) — Gate content with SBTs
- [IPFS Integration →](../storage/ipfs.md) — Store SBT metadata
- [Security Best Practices →](../security/security-practices.md) — Secure your SBT system
