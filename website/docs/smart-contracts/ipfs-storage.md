---
title: IPFS Integration Guide
sidebar_position: 16
description: Store NFT metadata, images, and dApp assets on IPFS for XDC Network applications — content addressing, pinning services, gateways, and metadata URI patterns.
---

# IPFS Integration Guide

Smart contracts on the XDC Network are excellent at storing ownership and logic, but terrible at storing files. A single 1 MB image stored in contract storage would cost an impractical amount of gas even at XDC's near-zero fees, and bloating state hurts every node on the network. The standard solution is decentralized storage: keep the file on IPFS, keep only its hash (CID) on-chain.

This guide covers IPFS fundamentals, upload workflows, pinning for persistence, gateway usage in dApps, and the metadata patterns used by XDC NFT projects.

## Why Decentralized Storage

- **On-chain storage is expensive and heavy:** Storing data in contract state costs gas per 32-byte slot and permanently grows the chain. Rich media — images, video, audio, documents — simply doesn't belong in contract storage.
- **NFT metadata and images:** An ERC-721 token on XDC only stores a `tokenURI` string. The JSON it points to (name, description, image) must live somewhere durable and tamper-evident — IPFS is the de facto standard.
- **dApp assets:** Front-end files, token lists, avatars, and user-generated content for XDC dApps can be served from IPFS so no single server outage takes your app offline.
- **Integrity by design:** Because content is addressed by its hash, on-chain references are cryptographically bound to exact bytes. See [Smart Contract Security Best Practices](/docs/smart-contracts/security-best-practices) for why this matters.

## IPFS Basics

- **CID (Content Identifier):** A hash of the content itself, e.g. `bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku`. Change one byte of the file and the CID changes — so a CID on-chain proves the off-chain content hasn't been altered.
- **Content addressing:** You fetch data by *what it is*, not *where it is*. Any node or gateway holding the content can serve the same CID.
- **Gateways:** HTTP bridges that translate `ipfs://CID` into a normal HTTPS URL (e.g. `https://ipfs.io/ipfs/CID`) so browsers and wallets can load content without running a node.
- **Pinning:** Telling a node or service "keep this data, don't garbage-collect it." Unpinned content eventually disappears from the network.

## Getting Started

**Option 1: Local node (Kubo)**

```bash
# Windows (with Scoop)
scoop install ipfs

# Or download Kubo from https://docs.ipfs.tech/install/command-line/

ipfs init
ipfs daemon
```

A local node is great for development and testing uploads, but your content is only available while your machine is online and reachable.

**Option 2: Hosted pinning services (recommended for production)**

Pinning services store your content on their infrastructure and serve it through fast dedicated gateways. Popular options in the category include:

- **Pinata** — API-first pinning with dedicated gateways and generous free tier.
- **web3.storage** — IPFS backed by Filecoin persistence deals.
- **NFT.Storage** — purpose-built free storage for NFT assets and metadata.

All three expose HTTP APIs, so your upload pipeline looks the same regardless of provider.

## Uploading Files and Directories

**Single file:**

```bash
ipfs add my-image.png
# added QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG my-image.png
```

**Directory — the pattern for NFT collections:**

```bash
ipfs add -r ./collection-images
# added QmImage1 collection-images/1.png
# added QmImage2 collection-images/2.png
# added QmCollectionRoot collection-images
```

Uploading a directory with `-r` gives you one root CID; each file is then reachable as `ipfs://<rootCID>/1.png`. This is how most XDC NFT collections structure their assets: one folder of images, one folder of metadata JSON files referencing those images.

## Using IPFS from JavaScript

**With `ipfs-http-client`** (talks to a local node or any node exposing the API):

```javascript
import { create } from "ipfs-http-client";

const ipfs = create({ url: "http://localhost:5001/api/v0" });

const metadata = {
  name: "XDC Pioneer #1",
  description: "First NFT in the XDC Pioneer collection.",
  image: "ipfs://QmImageCID/1.png",
};

const { cid } = await ipfs.add(JSON.stringify(metadata));
console.log("tokenURI:", `ipfs://${cid}`);
```

**Retrieving through a gateway:**

```javascript
const url = `https://ipfs.io/ipfs/${cid}`;
const metadata = await fetch(url).then((r) => r.json());
```

Hosted pinning services offer equivalent REST endpoints (`POST` the file with your API key, receive a CID) — swap the client, keep the flow.

## NFT Metadata Pattern

The standard layout for an XDC ERC-721 collection:

1. Upload the image folder → get image root CID.
2. Write one metadata JSON per token, pointing `image` at `ipfs://<imageRootCID>/<tokenId>.png`:

```json
{
  "name": "XDC Pioneer #1",
  "description": "First NFT in the XDC Pioneer collection.",
  "image": "ipfs://QmImageRootCID/1.png",
  "attributes": [{ "trait_type": "Background", "value": "Teal" }]
}
```

3. Upload the metadata folder → get metadata root CID.
4. Set the contract's `baseURI` to `ipfs://<metadataRootCID>/` so `tokenURI(1)` resolves to `ipfs://<metadataRootCID>/1`.

For the full contract-side walkthrough (ERC-721, `baseURI`, minting on XDC), see the [NFT Tutorial](/docs/smart-contracts/nft-tutorial).

## Gateways in dApps

Public gateways like `https://ipfs.io/ipfs/` are fine for demos but rate-limited and shared — production dApps should use a dedicated gateway from their pinning provider (e.g. `https://<subdomain>.mypinata.cloud/ipfs/`) for speed and reliability.

A small resolver keeps the rest of your code gateway-agnostic:

```javascript
const GATEWAY = "https://ipfs.io/ipfs/";

function resolveIpfsUri(uri) {
  if (!uri) return "";
  return uri.startsWith("ipfs://")
    ? GATEWAY + uri.slice(7)
    : uri;
}

// resolveIpfsUri("ipfs://QmRoot/1.png")
// → "https://ipfs.io/ipfs/QmRoot/1.png"
```

Use this helper everywhere you render `image` or fetch `tokenURI` — switching gateways later is then a one-line change.

## Pinning Strategy and Persistence

IPFS is not permanent by default. Content that nobody pins gets garbage-collected, and dead NFT images are a common failure mode. Rules of thumb:

- **Anything referenced on-chain must be pinned.** Minting an NFT whose metadata isn't pinned is shipping a broken link.
- **Pin on at least two independent services** for production (e.g. a paid pinning service plus your own node). If one provider shuts down, the other keeps serving.
- **Verify pins after upload** — re-fetch the CID through a gateway and confirm the bytes match before minting against it.
- **Back up the raw files** outside IPFS as well; pinning is redundancy, not a backup of your only copy.

## Best Practices

- **Never store private or sensitive data on IPFS.** Everything is public by default; anyone with the CID can read the content. Encrypt before uploading if confidentiality is needed — and think twice about putting encrypted secrets on an immutable network at all.
- **Trust the CID, not the server.** Always reference content by CID (ideally the `ipfs://` scheme on-chain) so integrity is enforced by the hash itself, not by whoever hosts it.
- **Plan gateway redundancy.** Don't hardcode a single public gateway in your dApp; keep the resolver configurable and know your fallback.
- **Immutable by design:** You cannot "update" a CID. To change content, upload new content, get a new CID, and update the on-chain reference (requires a mutable `baseURI` pattern — see [Upgradeable Contracts](/docs/smart-contracts/upgradeable-contracts) for update patterns).

## See Also

- [NFT Tutorial](/docs/smart-contracts/nft-tutorial) — build and mint an ERC-721 collection on XDC using the metadata pattern from this guide.
- [Frontend Integration](/docs/smart-contracts/frontend-integration) — connecting XDC dApp front-ends to contracts and wallets.
- [Tokens on XDC](/docs/smart-contracts/tokens) — XRC-20 and XRC-721 token standards and implementation.
- [Gas & Fees](/docs/learn/gas-fees) — why on-chain file storage is impractical even with XDC's near-zero fees.
