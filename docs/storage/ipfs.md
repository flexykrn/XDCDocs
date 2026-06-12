---
title: IPFS Integration Guide — Decentralized Storage for XDC dApps and NFTs
description: Complete IPFS guide for XDC — Pinata setup, NFT metadata storage, dApp asset hosting, cost comparison, and performance benchmarks.
---

Difficulty: Beginner | Time: ~20 minutes | Tools: Pinata, NFT.Storage, IPFS CLI

# IPFS Integration Guide — Decentralized Storage for XDC dApps and NFTs

IPFS (InterPlanetary File System) is the decentralized standard for storing NFT metadata, dApp assets, and immutable content. This guide covers IPFS integration for XDC developers.

## Prerequisites

- Basic understanding of file storage and hashing
- [NFT Tutorial](../smartcontract/nft.md) (recommended for NFT metadata context)
- Pinata or NFT.Storage account (free tiers available)

---

## IPFS Concepts

### Decentralized Storage Basics

IPFS is a peer-to-peer protocol for storing and sharing data in a distributed file system. Unlike HTTP which uses location-based addressing (`https://site.com/file`), IPFS uses content-based addressing (`ipfs://QmHash`).

Key benefits:
- **Immutable**: Content cannot change without changing the hash
- **Decentralized**: No single point of failure
- **Verifiable**: Hash proves content integrity
- **Deduplication**: Same content stored once globally

### Content Addressing

Every file on IPFS has a unique Content Identifier (CID):

```
ipfs://QmXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXx
```

The CID is derived from the file's content, not its location. Change one pixel in an image → completely different CID.

### Pinning Services

IPFS nodes garbage collect unpinned content. Pinning services ensure your content stays available:

| Service | Free Tier | Paid Tier | Best For |
|---------|-----------|-----------|----------|
| **Pinata** | 1 GB | $20/100 GB | NFTs, dApps |
| **NFT.Storage** | 31 GB | Free for NFTs | NFT metadata |
| **Fleek** | 3 GB | $18/100 GB | Frontend hosting |
| **Web3.Storage** | 5 GB | $4/100 GB | General storage |

### Gateway Usage

IPFS gateways bridge the IPFS protocol to HTTP:

```
https://ipfs.io/ipfs/QmHash
https://gateway.pinata.cloud/ipfs/QmHash
https://cloudflare-ipfs.com/ipfs/QmHash
```

---

## Integration Options

### Pinata Setup

**Step 1 — Create Account**

1. Go to [pinata.cloud](https://pinata.cloud/)
2. Sign up for free account
3. Get your API Key and Secret from the dashboard

**Step 2 — Upload Files**

Using the web interface:
1. Click "Add Files"
2. Select your files or folder
3. Wait for upload confirmation
4. Copy the CID

Using the API:

```bash title="Terminal"
curl -X POST https://api.pinata.cloud/pinning/pinFileToIPFS \
  -H "pinata_api_key: YOUR_API_KEY" \
  -H "pinata_secret_api_key: YOUR_SECRET" \
  -F "file=@metadata/0.json"
```

**Step 3 — Configure Dedicated Gateway**

Get your dedicated gateway URL from Pinata dashboard:

```
https://yourgateway.mypinata.cloud/ipfs/QmHash
```

### NFT.Storage

NFT.Storage is purpose-built for NFT metadata:

**Step 1 — Get API Key**

1. Go to [nft.storage](https://nft.storage/)
2. Sign in with GitHub or email
3. Copy your API key

**Step 2 — Upload**

```bash title="Terminal"
curl -X POST https://api.nft.storage/upload \
  -H "Authorization: Bearer *** \
  -H "Content-Type: application/json" \
  --data-binary @metadata/0.json
```

**Step 3 — Store CAR Files (for large collections)**

```bash title="Terminal"
# Install nft.storage client
npm install nft.storage

# Upload entire folder
node upload-collection.js
```

```javascript title="upload-collection.js"
import { NFTStorage, File } from 'nft.storage';
import fs from 'fs';
import path from 'path';

const client = new NFTStorage({ token: 'YOUR_API_KEY' });

async function uploadFolder(folderPath) {
  const files = fs.readdirSync(folderPath);
  const fileObjects = files.map(file => {
    const content = fs.readFileSync(path.join(folderPath, file));
    return new File([content], file, { type: 'application/json' });
  });

  const cid = await client.storeDirectory(fileObjects);
  console.log('Uploaded to:', cid);
  return cid;
}

uploadFolder('./metadata');
```

### Fleek Deployment

Fleek is ideal for hosting dApp frontends:

**Step 1 — Connect Repository**

1. Go to [fleek.xyz](https://fleek.xyz/)
2. Connect your GitHub repository
3. Select the branch to deploy

**Step 2 — Configure Build**

```yaml title="fleek.yaml"
sites:
  - name: my-dapp
    buildCommand: npm run build
    publishDir: dist
    framework: vite
```

**Step 3 — Deploy**

Every push to the selected branch triggers automatic deployment to IPFS.

### Self-Hosted IPFS

For advanced users:

```bash title="Terminal"
# Install IPFS Kubo
wget https://dist.ipfs.io/kubo/v0.24.0/kubo_v0.24.0_linux-amd64.tar.gz
tar -xvzf kubo_v0.24.0_linux-amd64.tar.gz
cd kubo && sudo bash install.sh

# Initialize and start
ipfs init
ipfs daemon

# Add files
ipfs add -r metadata/
# Output: added QmHash metadata/
```

---

## NFT Metadata

### JSON Schema

Standard NFT metadata format:

```json
{
  "name": "XDC NFT #1",
  "description": "A unique NFT on XDC Network",
  "image": "ipfs://QmImageHash",
  "animation_url": "ipfs://QmAnimationHash",
  "external_url": "https://yourproject.com/nft/1",
  "attributes": [
    {
      "trait_type": "Rarity",
      "value": "Legendary"
    },
    {
      "trait_type": "Power",
      "value": 95,
      "display_type": "number"
    },
    {
      "trait_type": "Color",
      "value": "Blue"
    }
  ],
  "properties": {
    "creator": "0xYourAddress",
    "created": "2024-01-01T00:00:00Z"
  }
}
```

### Image Storage

Best practices for NFT images:

1. **Format**: PNG for pixel art, JPEG for photos, SVG for vector
2. **Size**: 1024x1024px recommended for marketplaces
3. **Optimization**: Use tools like TinyPNG before upload
4. **Organization**: Store images in `/images/` folder, metadata in root

### Batch Uploads

For large collections (10,000+ NFTs):

```bash title="Terminal"
# Create metadata folder structure
mkdir -p metadata/images

# Generate metadata with script
node generate-metadata.js

# Upload entire folder to IPFS
pinata-upload metadata/
```

```javascript title="generate-metadata.js"
const fs = require('fs');
const path = require('path');

const TOTAL_NFTS = 10000;
const baseImageCID = 'QmYourImageFolderCID';

for (let i = 0; i < TOTAL_NFTS; i++) {
  const metadata = {
    name: `XDC Pioneer #${i}`,
    description: `Pioneer NFT #${i} of ${TOTAL_NFTS}`,
    image: `ipfs://${baseImageCID}/${i}.png`,
    attributes: [
      { trait_type: 'Generation', value: 1 },
      { trait_type: 'Token ID', value: i }
    ]
  };
  
  fs.writeFileSync(
    path.join('metadata', `${i}.json`),
    JSON.stringify(metadata, null, 2)
  );
}

console.log(`Generated ${TOTAL_NFTS} metadata files`);
```

### Update Mechanisms

IPFS content is immutable. To "update" metadata:

1. Upload new metadata to IPFS (new CID)
2. Update contract's `baseURI` to point to new CID
3. Or use mutable storage (not recommended for NFTs)

```solidity
function setBaseURI(string memory _newBaseURI) public onlyOwner {
    baseURI = _newBaseURI;
}
```

---

## dApp Assets

### Frontend Hosting

Host your dApp frontend on IPFS via Fleek:

```bash title="Terminal"
# Install Fleek CLI
npm install -g @fleek-platform/cli

# Login
fleek login

# Deploy
fleek sites deploy
```

### Media Storage

Store videos, audio, and 3D models:

```json
{
  "name": "Interactive NFT",
  "animation_url": "ipfs://QmVideoHash",
  "properties": {
    "media_type": "video/mp4",
    "duration": 30
  }
}
```

### Documentation Hosting

Host docs on IPFS for censorship resistance:

```bash title="Terminal"
# Build your docs
mkdocs build

# Upload to IPFS
ipfs add -r site/

# Pin with Pinata
pinata-upload site/
```

### Backup Strategies

1. **Multi-pin**: Pin content on 2+ services (Pinata + NFT.Storage)
2. **Local backup**: Keep local copy of all files
3. **Gateway fallback**: Use multiple gateways (ipfs.io, pinata, cloudflare)
4. **Monitoring**: Check content availability weekly

---

## Cost Comparison

| Service | Storage | Monthly Cost | Bandwidth |
|---------|---------|--------------|-----------|
| Pinata | 100 GB | $20 | Unlimited |
| NFT.Storage | 31 GB | Free | Unlimited |
| Fleek | 100 GB | $18 | 1 TB |
| Web3.Storage | 100 GB | $4 | 1 TB |
| AWS S3 | 100 GB | $2.30 | $9/GB |
| Self-hosted | Unlimited | Server cost | Your bandwidth |

> 💡 IPFS pinning is competitive with centralized storage for small-to-medium projects.

---

## Performance Benchmarks

| Metric | IPFS | HTTP CDN |
|--------|------|----------|
| First fetch | 2-5s | 200ms |
| Cached fetch | 200ms | 50ms |
| Global availability | 95% | 99.9% |
| Censorship resistance | High | Low |
| Content verification | Built-in | None |

Tips for better IPFS performance:
1. Use dedicated gateways (faster than public)
2. Pre-warm cache by fetching before users
3. Use IPFS in combination with CDN for hot content

---

## Security Considerations

1. **Private Content**: IPFS is public by default. Use encryption for sensitive data:

```javascript
import { encrypt } from 'lit-js-sdk';

const encrypted = await encrypt(file, accessControlConditions);
const cid = await client.storeBlob(encrypted);
```

2. **Gateway Spoofing**: Verify CIDs match expected hashes
3. **Pinning Service Trust**: Don't rely on single provider
4. **Content Permanence**: Pin important content, don't assume persistence

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `504 Gateway Timeout` | Content not pinned | Check pinning status, re-pin |
| CID not resolving | Node not connected | Try different gateway |
| Slow loading | Far from nearest node | Use CDN + IPFS hybrid |
| Upload fails | File too large | Split into chunks, use CAR files |
| Content disappeared | Garbage collected | Re-pin with multiple services |

---

## Next Steps

- [NFT Tutorial →](../smartcontract/nft.md) — Build NFTs with IPFS metadata
- [Token Gating →](../smartcontract/token-gating.md) — Gate content by token ownership
- [Soulbound Tokens →](../smartcontract/sbt.md) — Non-transferable credentials
