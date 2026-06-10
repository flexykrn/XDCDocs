---
title: Frequently Asked Questions
description: Common questions about XDC Network — wallets, gas, deployment, tokens, nodes, bridging, and troubleshooting. Covers everything from beginner setup to advanced validator operations.
---

Difficulty: All Levels | Time: ~10 minutes reading

# Frequently Asked Questions

Quick answers to the most common questions about building on XDC Network. Organized by topic for easy navigation.

---

## Getting Started

### What is XDC Network?

XDC Network is an EVM-compatible Layer 1 blockchain built for enterprise-grade decentralized applications. It features 2-second block times, near-zero gas fees (~$0.0001 per transaction), and deterministic finality through the XDPoS 2.0 consensus mechanism. The network is optimized for trade finance, RWA tokenization, and institutional DeFi.

### Is XDC compatible with Ethereum?

Yes. XDC is fully EVM-compatible, meaning:
- Solidity contracts work without modification
- MetaMask and other EVM wallets connect natively
- Hardhat, Foundry, and Remix work out of the box
- Ethereum tools and libraries (Ethers.js, Web3.js, Viem) function normally
- You can port existing Ethereum dApps with minimal changes

### What do I need to start building?

1. A wallet (MetaMask recommended)
2. Test XDC from the [faucet](https://faucet.apothem.network)
3. A development framework (Hardhat, Foundry, or Remix)

See the [Developer Onboarding Guide](./developers/onboarding.md) for step-by-step setup.

### How long does it take to deploy my first contract?

**5 minutes** with Remix (browser-only, no installation). **15 minutes** with Hardhat or Foundry including environment setup.

### Do I need to buy XDC to start developing?

No. Use the [Apothem Testnet Faucet](https://faucet.apothem.network) to get free test XDC. Only buy mainnet XDC when you're ready to deploy to production.

---

## Wallets & Accounts

### Which wallets support XDC?

Any EVM-compatible wallet works:
- **MetaMask** (recommended — most popular, best tooling support)
- **Rabby** (power users, enhanced security features)
- **Trust Wallet** (mobile-first)
- **Coinbase Wallet** (Coinbase ecosystem)
- **Frame** (desktop-native, hardware wallet focus)
- **Ledger/Trezor** (hardware wallets via MetaMask)

### Why does my address start with `0x` instead of `xdc`?

Both are valid. XDCScan displays addresses with `xdc` prefix for branding. EVM tools like MetaMask use `0x` prefix. They refer to the same account — only the prefix differs.

Example:
- XDCScan: `xdc1234567890abcdef1234567890abcdef12345678`
- MetaMask: `0x1234567890abcdef1234567890abcdef12345678`

**Conversion:** Simply replace `xdc` with `0x` (or vice versa) — the rest of the address is identical.

### How do I add XDC to MetaMask?

**Automatic (Recommended):**
1. Open MetaMask → Network dropdown
2. Click **Add Network**
3. Search "XDC" → Select **XDC Mainnet** or **XDC Apothem Testnet**
4. Click **Approve**

**Manual:** See [Wallet Configuration](./developers/wallet-configuration.md).

### Can I use the same wallet for mainnet and testnet?

Yes. Your wallet address is identical across all networks. However, your balances are separate:
- Mainnet XDC has real value
- Testnet XDC is free and has no value

Always verify which network you're on before transacting.

### How do I export my private key?

**MetaMask:**
1. Click the three dots menu → Account Details
2. Click **Export Private Key**
3. Enter your password
4. Copy the key

> ⚠️ **Security Warning:** Never share your private key or seed phrase. Anyone with access can steal your funds. Store offline in a secure location.

---

## Networks & RPC

### What are the XDC network details?

| Network | Chain ID | RPC URL | Explorer | Faucet |
|---------|----------|---------|----------|--------|
| **Mainnet** | 50 | `https://rpc.xinfin.network` | [xdcscan.com](https://xdcscan.com) | — |
| **Apothem Testnet** | 51 | `https://rpc.apothem.network` | [testnet.xdcscan.com](https://testnet.xdcscan.com) | [faucet.apothem.network](https://faucet.apothem.network) |
| **Devnet** | 551 | `https://devnetrpc.xinfin.network` | — | — |

### Which RPC should I use?

- **Development:** Apothem Testnet (free, safe to experiment)
- **Production:** Mainnet (real value, real users)
- **Testing new features:** Devnet (unstable, for core developers)

### How do I check if RPC is working?

```bash
curl -X POST https://rpc.apothem.network \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

Expected response:
```json
{"jsonrpc":"2.0","id":1,"result":"0x1234abcd"}
```

### What if the RPC is down?

Use backup RPC endpoints:
- Mainnet: `https://erpc.xinfin.network`
- Apothem: `https://erpc.apothem.network`

Or find more at [Chainlist](https://chainlist.org/?search=xdc).

---

## Testnet & Faucet

### How do I get test XDC?

Visit [faucet.apothem.network](https://faucet.apothem.network) and enter your wallet address. You'll receive 1000 XDC instantly.

### The faucet says "limit reached." What do I do?

Wait 24 hours, or use an alternative faucet:
- [BlocksScan Faucet](https://faucet.blocksscan.io/)
- [ChainTools Faucet](https://chains.tools/faucet)

### Can I use mainnet XDC for testing?

No. Mainnet XDC has real value. Always test on Apothem Testnet first. Accidentally deploying untested contracts to mainnet can result in lost funds.

### How do I switch between mainnet and testnet?

**MetaMask:** Click the network dropdown (top center) and select the desired network.

**Hardhat:** Use `--network xdc` for mainnet or `--network apothem` for testnet.

**Foundry:** Use `--rpc-url xdc` or `--rpc-url apothem`.

---

## Gas & Fees

### How much are gas fees on XDC?

XDC has effectively zero base fee. Typical costs:

| Operation | Cost (XDC) | Cost (USD) |
|-----------|------------|------------|
| Simple transfer | ~0.0001 | ~$0.00001 |
| Token transfer | ~0.0002 | ~$0.00002 |
| Contract deployment | ~0.01–0.1 | ~$0.001–$0.01 |
| Complex contract call | ~0.001 | ~$0.0001 |

### Why is my transaction stuck?

XDC transactions rarely get stuck due to low gas. If pending:
1. Check your wallet is on the correct network (Chain ID 50 for mainnet, 51 for testnet)
2. Ensure you have enough XDC for gas
3. Try resubmitting with slightly higher gas price
4. Check [XDCScan](https://xdcscan.com) to see if the network is congested

### Does XDC support EIP-1559?

EIP-1559 is being rolled out on Apothem Testnet. Mainnet currently uses legacy gas model. Both work — your tooling handles this automatically.

### How do I estimate gas for my transaction?

**Hardhat:**
```javascript
const gasEstimate = await contract.myFunction.estimateGas();
console.log(`Estimated gas: ${gasEstimate}`);
```

**Foundry:**
```bash
cast estimate --rpc-url apothem 0xCONTRACT_ADDRESS "myFunction()"
```

**MetaMask:** Automatically estimates when you confirm a transaction.

---

## Smart Contracts

### What Solidity version should I use?

XDC supports Solidity up to 0.8.24. Use:
```solidity
pragma solidity ^0.8.24;
```

### How do I deploy a contract?

Three options:

1. **Remix** (browser) — No setup, [open and deploy](https://remix.xinfin.network)
2. **Hardhat** (JavaScript) — Best for teams, see [Hardhat Guide](../smartcontract/hardhat.md)
3. **Foundry** (Rust) — Fastest, see [Foundry Guide](../smartcontract/foundry.md)

### How do I verify my contract on XDCScan?

**Automatic (Hardhat):**
```bash
npx hardhat verify --network apothem 0xYOUR_CONTRACT_ADDRESS
```

**Automatic (Foundry):**
```bash
forge verify-contract 0xADDRESS src/Contract.sol:Contract --chain 51
```

**Manual:** Go to [testnet.xdcscan.com](https://testnet.xdcscan.com), search your contract, click **Contract** → **Verify & Publish**.

### Can I use OpenZeppelin contracts?

Yes. Install via npm or forge:
```bash
npm install @openzeppelin/contracts
# or
forge install OpenZeppelin/openzeppelin-contracts
```

### Why is my contract deployment failing?

Common causes:
- **Insufficient funds** — Get more test XDC from faucet
- **Wrong network** — Ensure you're on Apothem, not mainnet
- **Compiler mismatch** — Match pragma to compiler version exactly
- **Gas limit too low** — Increase gas limit in your config
- **Bytecode too large** — Optimize contract or split into libraries

### How do I make my contract upgradeable?

Use proxy patterns:
- **UUPS** (recommended) — Upgrade logic in implementation
- **Transparent Proxy** — Classic pattern, simpler

See [Upgradeability Guide](../smartcontract/upgradeability.md) for full implementation.

### Can I call my contract from a frontend?

Yes. Use Ethers.js or Web3.js:

```javascript
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider("https://rpc.apothem.network");
const contract = new ethers.Contract(address, abi, provider);

const result = await contract.myFunction();
```

See [JavaScript SDK](../sdks/javascript.md) for detailed integration.

---

## Tokens

### What token standards does XDC support?

- **XRC20** — Fungible tokens (like ERC20)
- **XRC721** — NFTs (like ERC721)
- **XRC404** — Hybrid tokens (fungible + NFT)

See [Token Standards](../smartcontract/tokens.md) for details.

### How do I create a token?

Use OpenZeppelin's token contracts:
```solidity
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MyToken is ERC20 {
    constructor() ERC20("MyToken", "MTK") {
        _mint(msg.sender, 1000000 * 10**decimals());
    }
}
```

### Where can I see existing tokens?

Browse [XDCScan Tokens](https://xdcscan.io/tokens) for XRC20 tokens and [XDCScan NFTs](https://xdcscan.io/nft-top-contracts) for XRC721 collections.

### How do I add my token to MetaMask?

1. Open MetaMask → Assets tab
2. Click **Import tokens**
3. Paste your token contract address
4. MetaMask auto-fills symbol and decimals
5. Click **Add custom token**

### Can I bridge tokens from Ethereum to XDC?

Yes. Use the [XDC Bridge](https://bridge.xdc.network) or third-party bridges like Multichain. Always verify bridge contracts before transferring large amounts.

---

## Nodes & Validation

### How do I run an XDC node?

See the [Masternode Setup Guide](./developers/node_operators/masternode.md). Options include:
- Bootstrap script (quickest)
- Docker (containerized)
- Snapshot download (fast sync)

### What are the requirements to become a validator?

- **10,000,000 XDC** as stake
- Dedicated server (see [Node Architecture](./developers/node_operators/node_architecture.md))
- 24/7 uptime (99.9% expected)
- Static IP address

### How are validators rewarded?

Validators earn:
- Block rewards (newly minted XDC)
- Transaction fees
- Additional rewards for uptime and performance

See [Rewards Mechanism](./rewards.md) for detailed breakdown.

### What happens if my node goes offline?

Slashing penalties apply for:
- Extended downtime (> few hours)
- Double signing
- Malicious behavior

See [Slashing](./developers/node_operators/slashing.md) for penalty details.

### Can I run a node without becoming a validator?

Yes. You can run a **full node** or **archive node** without staking. These nodes:
- Validate transactions
- Store blockchain history
- Serve RPC requests
- Don't earn rewards

---

## Bridging & Cross-Chain

### How do I bridge assets to XDC?

Use official bridges:
- [XDC Bridge](https://bridge.xdc.network) — Ethereum ↔ XDC
- [Multichain](https://multichain.org) — Multi-chain support

**Steps:**
1. Connect wallet on source chain
2. Select asset and amount
3. Confirm transaction
4. Wait for confirmation (usually 10–30 minutes)
5. Receive wrapped asset on XDC

### What are wrapped tokens?

Wrapped tokens represent assets from other blockchains on XDC:
- **WXDC** — Wrapped XDC for DeFi compatibility
- **WETH** — Wrapped Ethereum
- **USDC** — Bridged from Ethereum

They maintain 1:1 peg with the original asset.

### Are bridges safe?

Bridges carry risks:
- Smart contract bugs
- Centralized validator sets
- Liquidity constraints

**Best practices:**
- Use official or audited bridges
- Start with small amounts
- Verify contract addresses
- Don't bridge more than you can afford to lose

---

## Security

### How do I secure my private keys?

**Best practices:**
- Use hardware wallets (Ledger, Trezor) for large amounts
- Store seed phrases offline (metal backup recommended)
- Never share private keys or seed phrases
- Use multi-sig wallets for team funds
- Separate hot wallets (development) from cold wallets (savings)

See [Key Management](../security/key-management.md) for detailed guide.

### Are there known vulnerabilities on XDC?

XDC uses battle-tested EVM code. Common smart contract vulnerabilities apply:
- Reentrancy
- Integer overflow/underflow
- Access control issues
- Front-running

See [Vulnerability Catalog](../security/vulnerabilities.md) for comprehensive list and mitigations.

### Should I audit my contract before mainnet?

**Yes.** Always audit before mainnet deployment:
- Internal review (team)
- Automated tools (Slither, Mythril)
- Professional audit (CertiK, Hacken, etc.)

See [Audit Preparation](../security/audit-prep.md) for checklist.

---

## Troubleshooting

### MetaMask won't connect to XDC

- Ensure you're on the correct network (Chain ID 50 or 51)
- Try refreshing the page
- Check that MetaMask is unlocked
- Clear browser cache and try again
- Try a different browser

### "Insufficient funds" error

- Get test XDC from the [faucet](https://faucet.apothem.network)
- For mainnet, purchase XDC from exchanges (KuCoin, Gate.io, Bitfinex)
- Check you're on the right network (testnet vs mainnet)

### Contract deployment fails

- Check you have enough gas
- Verify compiler version matches pragma
- Ensure contract has no syntax errors
- Check gas limit in your config (increase if needed)

### Can't verify contract on XDCScan

- Match exact compiler version
- Ensure optimization settings match
- For multi-file contracts, flatten first
- Verify constructor arguments (if any)

### Transaction pending for too long

XDC has 2-second block times, so transactions confirm quickly. If pending:
- Check network status on [XDCScan](https://xdcscan.com)
- Try resubmitting with higher gas price
- Ensure your wallet is synced to the latest block

### "Nonce too high" error

Reset your MetaMask account:
1. Settings → Advanced
2. Click **Reset Account**
3. This clears transaction history without affecting funds

---

## Ecosystem & Community

### Where can I get help?

| Resource | Link | Best For |
|----------|------|----------|
| Developer Discord | [discord.gg/xdc](https://discord.gg/xdc) | Quick questions, community support |
| Developer Forum | [www.xdc.dev](https://www.xdc.dev) | Detailed discussions, tutorials |
| GitHub Issues | [github.com/XinFinOrg](https://github.com/XinFinOrg) | Bug reports, feature requests |
| StackOverflow | Tag `xdc` | Technical coding questions |
| Telegram | [t.me/xinfintalk](https://t.me/xinfintalk) | General community chat |

### How do I report a bug?

Open an issue on [GitHub](https://github.com/XinFinOrg/XDPoSChain/issues) with:
- Clear title and description
- Steps to reproduce
- Expected vs actual behavior
- Environment details (wallet, network, tool versions)
- Screenshots or logs (if applicable)

### How can I contribute to XDC?

- **Code:** Submit PRs to [GitHub repos](https://github.com/XinFinOrg)
- **Documentation:** Improve docs (like this page!)
- **Community:** Answer questions on Discord/Forum
- **Testing:** Run testnet nodes, report bugs
- **Grants:** Apply for [XDC Foundation grants](https://xinfin.org)

### Where can I see XDC ecosystem projects?

- [XDC Ecosystem Directory](https://xinfin.org/ecosystem-dapps)
- [XDC Dev Forum Showcases](https://www.xdc.dev)
- [XDCScan](https://xdcscan.io) — browse deployed contracts

---

## Next Steps

- [Developer Onboarding →](./developers/onboarding.md)
- [Smart Contract Lifecycle →](../smartcontract/index.md)
- [Security Best Practices →](../security/security-practices.md)
- [JavaScript SDK →](../sdks/javascript.md)

---

*Didn't find your answer? Ask on the [Developer Forum](https://www.xdc.dev) or [Discord](https://discord.gg/xdc).*
