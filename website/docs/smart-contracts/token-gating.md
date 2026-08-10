---
title: "Token Gating"
sidebar_position: 21
description: Restrict content and features by XRC20 or XRC721 ownership on the XDC Network — on-chain balance checks, signed-message verification, contract-side modifiers, and security best practices.
---

# Token Gating

Token gating restricts access to content, features, or actions based on whether a wallet holds a specific token. Because XDC is EVM-compatible, the same patterns used on Ethereum — XRC20 balance checks, XRC721 ownership checks, signed-message authentication — work unchanged.

Common use cases:

- **Gated communities:** only holders can join a Discord, forum, or chat.
- **Premium features:** unlock dashboards, analytics, or content for token holders.
- **Events and airdrops:** require an NFT ticket or minimum token balance to register.
- **Contract-level access:** limit who can call certain functions on-chain.

## On-Chain Verification Pattern

The core of every token gate is a **read-only** contract call — no transaction, no gas:

- **XRC20:** `balanceOf(address)` returns how many tokens an account holds. Compare against a threshold (e.g. ≥ 100 tokens).
- **XRC721:** `balanceOf(address)` returns how many NFTs from a collection an account holds (> 0 means "is a holder"), and `ownerOf(tokenId)` verifies ownership of a specific token.

These are `view` functions, so verifying access costs nothing for you or your users.

## Frontend Flow

The simplest gate runs entirely in the browser: connect the wallet (see [Frontend-Web3 Integration](/docs/smart-contracts/frontend-integration) for the full connection flow), call `balanceOf` with ethers, and show or hide the UI:

```javascript
import { BrowserProvider, Contract, parseUnits } from "ethers";

const TOKEN_ADDRESS = "0xYourXRC20TokenAddress";
const MIN_BALANCE = parseUnits("100", 18); // at least 100 tokens

const erc20Abi = ["function balanceOf(address) view returns (uint256)"];

async function checkAccess() {
  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const account = await signer.getAddress();

  const token = new Contract(TOKEN_ADDRESS, erc20Abi, provider);
  const balance = await token.balanceOf(account);

  return balance >= MIN_BALANCE;
}

// Gate the UI
if (await checkAccess()) {
  renderPremiumContent();
} else {
  renderUpgradePrompt();
}
```

For an XRC721 gate, swap the ABI for `["function balanceOf(address) view returns (uint256)"]` against the NFT collection address and require `balance > 0`.

## Signed-Message Verification (Server-Side Gating)

A frontend-only check is fine for convenience, but anything with real value must be verified by your backend. The standard pattern uses **EIP-191 signed messages** (`personal_sign`): the user signs a unique nonce, the server recovers the signer's address, checks their balance, and issues a session.

**Client side** — request a nonce, sign it, send the signature:

```javascript
import { BrowserProvider } from "ethers";

async function login() {
  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();

  // 1. Get a one-time nonce from your server
  const { nonce } = await fetch(`/api/nonce?address=${address}`).then((r) => r.json());

  // 2. Sign a human-readable message containing the nonce
  const message = `Sign in to MyDApp\nNonce: ${nonce}`;
  const signature = await signer.signMessage(message);

  // 3. Server verifies and returns a session token
  const res = await fetch("/api/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, message, signature }),
  });
  return res.ok;
}
```

**Server side** — recover the address, check the balance on-chain, issue a session:

```javascript
import { JsonRpcProvider, Contract, verifyMessage } from "ethers";

const provider = new JsonRpcProvider("https://erpc.xinfin.network");
const token = new Contract(TOKEN_ADDRESS, erc20Abi, provider);

async function verify(address, message, signature) {
  // Reject reused or stale nonces before this point
  const recovered = verifyMessage(message, signature);
  if (recovered.toLowerCase() !== address.toLowerCase()) return false;

  const balance = await token.balanceOf(recovered);
  return balance >= MIN_BALANCE; // if true: create session / JWT
}
```

No gas is spent anywhere — signing a message is free, and `balanceOf` is a read-only call.

## Contract-Side Gating

When the gated action is itself on-chain, enforce the check in Solidity with a modifier. This is the strongest form of gating — it cannot be bypassed:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
}

interface IERC721 {
    function balanceOf(address owner) external view returns (uint256);
}

contract GatedVault {
    IERC20 public immutable gateToken;
    IERC721 public immutable gateNft;
    uint256 public constant MIN_BALANCE = 100 * 1e18;

    constructor(address token, address nft) {
        gateToken = IERC20(token);
        gateNft = IERC721(nft);
    }

    modifier onlyTokenHolder() {
        require(
            gateToken.balanceOf(msg.sender) >= MIN_BALANCE ||
            gateNft.balanceOf(msg.sender) > 0,
            "Not a token holder"
        );
        _;
    }

    function claim() external onlyTokenHolder {
        // gated logic
    }
}
```

## NFT-Gated Example

To gate by a specific collection on XDC, first deploy the collection following the [NFT Tutorial](/docs/smart-contracts/nft-tutorial), then check ownership against its address:

```javascript
const nftAbi = ["function balanceOf(address) view returns (uint256)"];
const collection = new Contract(NFT_COLLECTION_ADDRESS, nftAbi, provider);

const isHolder = (await collection.balanceOf(userAddress)) > 0n;
```

The same collection address works on Apothem for testing and mainnet for production — only the RPC endpoint changes.

## Security Considerations

- **Never trust client-side-only checks for value.** Anyone can edit JavaScript in their browser. If access unlocks something valuable (tokens, discounts, private data), the check must happen server-side or on-chain.
- **Replay protection:** nonces must be single-use and short-lived. Include a timestamp in the signed message and reject stale or reused nonces, or attackers can replay an old signature to impersonate a holder.
- **Balance checks are instantaneous.** An attacker could borrow tokens, pass the check, and return them in the same flow (a flash-loan-style exploit). For high-stakes gates, use a snapshot (e.g. ERC20Votes checkpoints or a recorded block) instead of the live balance.
- Review the full [Smart Contract Security Best Practices](/docs/smart-contracts/security-best-practices) checklist before deploying any gating contract to mainnet.

## UX Best Practices

- **Graceful non-holder path:** show a clear "this feature requires holding X" message with a link to acquire the token — never a blank screen or cryptic revert.
- **Re-check on changes:** balances change; re-verify on wallet switches and periodically for long sessions.
- **Test on Apothem first:** deploy your token or NFT to the Apothem Testnet and gate against it with free test XDC — see the [Testnet & Faucet FAQ](/docs/xdc-chain/faq#testnet--faucet).

## See Also

- [Tokens Built On XDC](/docs/smart-contracts/tokens) — XRC20, XRC721, and XRC404 overview
- [NFT Tutorial — XRC721 on XDC](/docs/smart-contracts/nft-tutorial) — deploy the collection you'll gate by
- [Frontend-Web3 Integration](/docs/smart-contracts/frontend-integration) — wallet connection and contract reads with ethers v6
- [Smart Contract Security Best Practices](/docs/smart-contracts/security-best-practices) — audit checklist and common vulnerabilities
