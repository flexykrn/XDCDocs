---
title: Developer Onboarding — Start Building on XDC
description: Unified developer onboarding portal for XDC Network. Wallet setup, testnet XDC, RPC configuration, and framework setup in one place.
---

Difficulty: Beginner | Time: ~10 minutes | Tools: MetaMask, Node.js 18+

# Developer Onboarding — Start Building on XDC

Welcome to XDC Network. This portal contains everything you need to go from zero to deploying your first smart contract. No prior blockchain experience required.

## 🚀 5-Minute Quickstart

New to XDC? Deploy your first contract in 5 minutes using only a browser:

**[Deploy Hello World with Remix →](./quick-guide.md)**

No installation. No configuration. Just a browser and MetaMask.

---

## 📋 Prerequisites Checklist

Before building on XDC, complete these 4 steps:

- [ ] **Wallet** — Install [MetaMask](#wallet-setup) or [Rabby](#alternative-wallets)
- [ ] **Network** — Add [XDC Apothem Testnet](#network-configuration)
- [ ] **Test Funds** — Get [1000 free XDC](#faucet)
- [ ] **Framework** — Choose [Hardhat](#hardhat), [Foundry](#foundry), or [Remix](#remix)

---

## 🔌 Wallet Setup

### MetaMask (Recommended)

MetaMask is the most popular EVM wallet. It supports XDC natively.

**Option 1: Automatic (Recommended)**

1. Open MetaMask and click the network dropdown (top center)
2. Click **Add Network**
3. Search for **"XDC"** and select **XDC Mainnet** or **XDC Apothem Testnet**
4. Click **Approve**

**Option 2: Manual Configuration**

If automatic setup doesn't work, add manually:

| Field | XDC Mainnet | XDC Apothem Testnet |
|-------|-------------|---------------------|
| Network Name | XDC Mainnet | XDC Apothem Testnet |
| RPC URL | `https://rpc.xinfin.network` | `https://rpc.apothem.network` |
| Chain ID | `50` | `51` |
| Currency Symbol | XDC | XDC |
| Block Explorer | `https://xdcscan.com` | `https://testnet.xdcscan.com` |

> 💡 **Tip:** XDCScan shows addresses with `xdc` prefix (e.g., `xdc1234…`). MetaMask uses `0x` prefix (e.g., `0x1234…`). Both refer to the same account.

**Download MetaMask:** [metamask.io/download](https://metamask.io/download/)

### Alternative Wallets

Any EVM-compatible wallet works with XDC:

| Wallet | Type | Best For |
|--------|------|----------|
| [Rabby](https://rabby.io/) | Browser | Power users, security-focused |
| [Trust Wallet](https://trustwallet.com/) | Mobile | Mobile-first developers |
| [Coinbase Wallet](https://www.coinbase.com/wallet) | Mobile/Browser | Coinbase ecosystem users |
| [Frame](https://frame.sh/) | Desktop | Desktop-native experience |

---

## 🌐 Network Configuration

### One-Click Network Add

Click to add XDC networks to your wallet automatically:

**[Add XDC Mainnet to MetaMask]** | **[Add XDC Apothem to MetaMask]**

### Manual Configuration

If one-click doesn't work, use the values from the [Wallet Setup](#wallet-setup) table above.

### RPC Endpoints

| Network | Primary RPC | Backup RPC | Chain ID |
|---------|-------------|------------|----------|
| Mainnet | `https://rpc.xinfin.network` | `https://erpc.xinfin.network` | 50 |
| Apothem | `https://rpc.apothem.network` | `https://erpc.apothem.network` | 51 |
| Devnet | `https://devnetrpc.xinfin.network` | — | 551 |

**Test RPC connectivity:**

```bash title="Terminal"
curl -X POST https://rpc.apothem.network \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

**Expected output:**

```json
{"jsonrpc":"2.0","id":1,"result":"0x1234abcd"}
```

---

## 🚰 Faucet

Get free test XDC for the Apothem Testnet:

### Official Faucet

**[faucet.apothem.network](https://faucet.apothem.network)**

- Amount: 1000 XDC per request
- Limit: 1 request per day per address
- Time: Instant

**Steps:**

1. Copy your wallet address from MetaMask
2. Visit [faucet.apothem.network](https://faucet.apothem.network)
3. Paste your address and click **Request**
4. Wait 10–30 seconds — 1000 XDC appears in MetaMask

### Alternative Faucets

| Faucet | Amount | Speed | Notes |
|--------|--------|-------|-------|
| [BlocksScan](https://faucet.blocksscan.io/) | 1000 XDC | Instant | Community-maintained |
| [ChainTools](https://chains.tools/faucet) | 500 XDC | Instant | Multi-chain faucet |

> ⚠️ **Mainnet XDC:** Testnet XDC has no value. For mainnet XDC, purchase from [exchanges](https://xinfin.org/xdc) or bridge from other chains.

---

## 🛠️ Development Frameworks

Choose your development environment:

### Hardhat (Recommended for Beginners)

JavaScript-based development environment. Best for:

- JavaScript/TypeScript developers
- Teams using npm ecosystem
- Complex deployment scripts

**Setup:**

```bash title="Terminal"
mkdir xdc-project && cd xdc-project
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npx hardhat init
# Select "Create a TypeScript project"
```

**Configure for XDC:**

```typescript title="hardhat.config.ts"
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    xdc: {
      url: "https://rpc.xinfin.network",
      chainId: 50,
      accounts: [process.env.PRIVATE_KEY!]
    },
    apothem: {
      url: "https://rpc.apothem.network",
      chainId: 51,
      accounts: [process.env.PRIVATE_KEY!]
    }
  }
};

export default config;
```

**Deploy:**

```bash title="Terminal"
npx hardhat run scripts/deploy.ts --network apothem
```

**[Full Hardhat Guide →](../../smartcontract/hardhat.md)**

---

### Foundry (Recommended for Advanced Users)

Rust-based toolkit. Best for:

- Speed (fastest compilation and tests)
- Solidity-native workflow
- Fuzzing and property-based testing

**Setup:**

```bash title="Terminal"
curl -L https://foundry.paradigm.xyz | bash
foundryup
forge init xdc-project
cd xdc-project
```

**Configure for XDC:**

```toml title="foundry.toml"
[profile.default]
src = "src"
out = "out"
libs = ["lib"]

[rpc_endpoints]
xdc = "https://rpc.xinfin.network"
apothem = "https://rpc.apothem.network"
```

**Deploy:**

```bash title="Terminal"
forge script script/Counter.s.sol --rpc-url apothem --broadcast
```

**[Full Foundry Guide →](../../smartcontract/foundry.md)**

---

### Remix (Browser IDE — Zero Setup)

Browser-based IDE. Best for:

- Quick prototyping
- Learning Solidity
- No local installation

**Open:** [remix.xinfin.network](https://remix.xinfin.network)

**Deploy:**

1. Write contract in browser
2. Select "Injected Provider — MetaMask"
3. Click Deploy

**[Full Remix Guide →](../../smartcontract/remix.md)**

---

## 📊 Framework Comparison

| Feature | Hardhat | Foundry | Remix |
|---------|---------|---------|-------|
| Setup time | 5 min | 5 min | 0 min |
| Language | JavaScript/TS | Solidity/Shell | Browser GUI |
| Test speed | Medium | Fast | N/A |
| Debugging | Excellent | Good | Basic |
| CI/CD | Excellent | Good | N/A |
| Best for | Teams, JS devs | Speed, testing | Learning, quick tests |

---

## ✅ Verify Your Setup

Run this checklist to confirm everything works:

```bash title="Terminal"
# 1. Check Node.js version
node --version  # Should be v18+

# 2. Check wallet balance
# Open MetaMask → Select XDC Apothem → Check balance > 0

# 3. Test RPC connection
curl -X POST https://rpc.apothem.network \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# 4. Compile a contract (Hardhat)
npx hardhat compile

# 5. Compile a contract (Foundry)
forge build
```

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| MetaMask won't connect | Ensure you're on XDC Apothem (Chain ID 51), not Ethereum |
| "Insufficient funds" | Get test XDC from [faucet](https://faucet.apothem.network) |
| Faucet says "limit reached" | Wait 24 hours or use [alternative faucet](https://faucet.blocksscan.io/) |
| RPC connection fails | Try backup RPC: `https://erpc.apothem.network` |
| `hardhat: command not found` | Use `npx hardhat` instead of global install |
| `forge: command not found` | Run `foundryup` to install |
| Compiler errors | Ensure Solidity version matches `pragma` statement |

---

## 📚 Next Steps

Choose your path:

**[Deploy Your First Contract →](./quick-guide.md)]**
Browser-only, 5 minutes, no setup required.

**[Smart Contract Lifecycle →](../../smartcontract/index.md)]**
Complete guide: setup → write → test → deploy → verify → monitor → upgrade.

**[JavaScript SDK →](../../sdks/javascript.md)]**
Build a frontend that interacts with your contract.

**[Security Best Practices →](../../security/security-practices.md)]**
Learn to protect your contracts before mainnet deployment.

---

## 🌐 Community & Support

| Resource | Link |
|----------|------|
| Developer Discord | [discord.gg/xdc](https://discord.gg/xdc) |
| Developer Forum | [www.xdc.dev](https://www.xdc.dev) |
| GitHub | [github.com/XinFinOrg](https://github.com/XinFinOrg) |
| StackOverflow | Tag `xdc` |
| Documentation | [docs.xdc.network](https://docs.xdc.network) |

---

## Related Topics

- **[Quick Start Guide →](./quick-guide.md)** — Deploy your first contract in 5 minutes
- **[Environment Setup →](../../smartcontract/setup.md)** — Configure Hardhat/Foundry
- **[Wallet Configuration →](./wallet-configuration.md)** — Set up MetaMask or Trust Wallet
- **[RPC Endpoints →](./rpc.md)** — Connect to XDC networks
- **[XDC Chain Overview →](../index.md)** — Understand the network
- **[Smart Contract Hub →](../../smartcontract/index.md)** — Full developer documentation

---

*Ready to build? Start with the [5-Minute Quickstart →](./quick-guide.md)]*
