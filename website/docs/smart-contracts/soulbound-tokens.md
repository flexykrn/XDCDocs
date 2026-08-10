---
title: Soulbound Tokens (SBTs) — Non-Transferable Credentials on XDC
sidebar_position: 22
description: Build Soulbound Tokens on the XDC Network — non-transferable ERC721 credentials for certificates, reputation, and KYC attestations, with revocation, recovery, and verification patterns.
---

# Soulbound Tokens (SBTs)

Soulbound Tokens (SBTs) are non-transferable tokens permanently bound to a wallet address — its "soul". Unlike NFTs, they cannot be sold or moved, which makes them suitable for representing things that belong to an identity rather than an owner: academic certificates, professional credentials, reputation scores, membership badges, and KYC/AML attestations.

Because they encode trust and compliance on-chain, SBTs are a natural fit for XDC's enterprise focus — see [XDC Enterprise Solutions](/docs/enterprise/) for the broader context of institutional use cases on the network.

## SBTs vs NFTs

| Property | NFT (XRC721) | Soulbound Token |
|---|---|---|
| Transferable | Yes | No (mint and burn only) |
| Recovery if keys lost | Asset is lost | Re-issuance / social recovery possible |
| Primary use | Tradable assets (art, collectibles, RWAs) | Identity-bound credentials & attestations |
| Value source | Market price | Issuer's reputation |
| Ownership proof | Current holder | Permanent binding to soul address |

## Implementation: ERC721 with Transfers Disabled

The standard approach is an ERC721 contract that overrides the transfer hook to allow minting (from the zero address) and burning (to the zero address), but revert any address-to-address transfer. With OpenZeppelin Contracts v5, that hook is `_update`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SoulboundToken is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    constructor() ERC721("XDCCredential", "XDCSBT") Ownable(msg.sender) {}

    function mint(address soul, string memory tokenURI) public onlyOwner {
        uint256 tokenId = _nextTokenId++;
        _safeMint(soul, tokenId);
        _setTokenURI(tokenId, tokenURI);
    }

    function revoke(uint256 tokenId) public onlyOwner {
        _burn(tokenId);
    }

    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);
        require(from == address(0) || to == address(0), "SBT: non-transferable");
        return super._update(to, tokenId, auth);
    }
}
```

> On OpenZeppelin v4, override `_beforeTokenTransfer(from, to, tokenId, batchSize)` with the same `from == address(0) || to == address(0)` check instead — the logic is identical, only the hook signature differs.

Compile as usual:

```bash
npx hardhat compile
```

## Issuance Flow

The typical issuance flow for an SBT is:

1. **Off-chain verification** — the issuer (university, bank, KYC provider) verifies the user's identity or achievement through its normal process.
2. **On-chain mint** — the issuer's wallet calls `mint(soul, tokenURI)` to bind the credential to the user's address.
3. **User holds the SBT** — the token can be read by any dApp but never moved.

Deploy to the Apothem Testnet (chain ID 51) with the same Hardhat setup used in the [NFT Tutorial](/docs/smart-contracts/nft-tutorial):

```javascript
// scripts/deploy.js
const { ethers } = require("hardhat");

async function main() {
  const SBT = await ethers.getContractFactory("SoulboundToken");
  const sbt = await SBT.deploy();
  await sbt.waitForDeployment();
  console.log("SoulboundToken deployed to:", await sbt.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

```bash
npx hardhat run scripts/deploy.js --network apothem
```

This assumes `hardhat.config.js` points at `https://rpc.apothem.network` with `chainId: 51`, and that the deployer (the future issuer) is funded from the Apothem faucet.

## Revocation and Expiry

Credentials often need to be revoked (misconduct, expired license, revoked KYC). Two complementary patterns:

- **Burn by issuer** — the `revoke` function above is `onlyOwner`, so only the issuing institution can destroy a token. This permanently removes the credential.
- **Expiry metadata** — include an `expiresAt` timestamp in the token metadata (or as an on-chain attribute) and treat tokens past expiry as invalid during verification. Burning then becomes unnecessary for naturally expiring credentials.

## The Recovery Problem

If a user loses the private key to their soul address, every SBT bound to it is stranded. Because SBTs are non-transferable, there is no on-chain escape hatch by design. Common mitigations:

- **Re-issuance policy** — the issuer burns the token on the old address (if still accessible) or simply mints a fresh credential to the user's new address after re-verifying identity off-chain. The issuer's off-chain records are the source of truth.
- **Social recovery wallets** — souls held in smart contract wallets (e.g. multisig or guardian-based recovery) reduce the single-key loss risk.

Whichever you choose, document the recovery policy at issuance time so verifiers know how to treat duplicate credentials.

## Reading and Verifying SBTs

Any application can check whether an address holds a credential with a simple `balanceOf` call:

```javascript
const sbt = await ethers.getContractAt("SoulboundToken", SBT_ADDRESS);
const hasCredential = (await sbt.balanceOf(userAddress)) > 0n;
```

Combined with expiry checks, this is the basis for on-chain access control — see [Token Gating](/docs/smart-contracts/token-gating) for patterns that gate dApp features behind token ownership.

## Privacy Considerations

Everything on-chain is public. **Never embed personal data (names, ID numbers, documents) in `tokenURI` or metadata.** Instead, store a hash or commitment of the off-chain record (e.g. `keccak256(documentHash)`) and reveal the underlying data only through the issuer's off-chain verification channel.

## Use Cases on XDC

- **Trade finance credentials** — attesting that a participant is a verified importer/exporter or financier, complementing the workflows described under [XDC Enterprise Solutions](/docs/enterprise/).
- **KYC'd participant badges** — DeFi protocols can restrict pools to addresses holding a KYC SBT from a trusted issuer.
- **Subnet participant identity** — operators and validators on private subnets can carry SBTs proving organizational membership; see the [Subnet Overview](/docs/subnet/overview).

## See Also

- [NFT Tutorial — XRC721 on XDC](/docs/smart-contracts/nft-tutorial)
- [Tokens Built On XDC](/docs/smart-contracts/tokens)
- [Token Gating](/docs/smart-contracts/token-gating)
