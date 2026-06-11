---
title: Environment Setup
description: Set up your local development environment for XDC smart contracts — Node.js, Hardhat, Foundry, VS Code, MetaMask, and testnet XDC.
---

Difficulty: Beginner | Time: ~15 minutes | Tools: Node.js 18+, Git, VS Code, MetaMask

# Environment Setup

This guide installs everything you need to develop, test, and deploy smart contracts on the XDC Network. By the end, you will have a working development environment with both Hardhat and Foundry configured for XDC.

## Prerequisites

- A computer running Windows, macOS, or Linux
- Administrator access to install software
- An internet connection

---

## Step 1 — Install Node.js

Hardhat requires Node.js 18 or later.

=== "Windows"

    1. Download the LTS installer from [nodejs.org](https://nodejs.org/)
    2. Run the installer and follow the prompts
    3. Verify installation:

    ```powershell title="PowerShell"
    node --version
    # v20.x.x or higher
    npm --version
    # 10.x.x or higher
    ```

=== "macOS"

    ```bash title="Terminal"
    # Using Homebrew
    brew install node

    # Verify
    node --version
    npm --version
    ```

=== "Linux"

    ```bash title="Terminal"
    # Ubuntu/Debian
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs

    # Verify
    node --version
    npm --version
    ```

---

## Step 2 — Install Git

Git is required for cloning repositories and managing project versions.

=== "Windows"

    Download from [git-scm.com](https://git-scm.com/download/win) and run the installer.

=== "macOS"

    ```bash title="Terminal"
    brew install git
    ```

=== "Linux"

    ```bash title="Terminal"
    sudo apt-get install git
    ```

Verify:

```bash title="Terminal"
git --version
# 2.40.x or higher
```

---

## Step 3 — Install VS Code

Download from [code.visualstudio.com](https://code.visualstudio.com/) and install.

**Required extensions:**

1. **Solidity** by Juan Blanco — Syntax highlighting and IntelliSense
2. **Solidity + Hardhat** by Nomic Foundation — Hardhat-specific features
3. **Prettier** — Code formatting

Install via VS Code:

```bash title="Terminal"
code --install-extension JuanBlanco.solidity
code --install-extension NomicFoundation.hardhat-solidity
code --install-extension esbenp.prettier-vscode
```

---

## Step 4 — Install MetaMask

1. Visit [metamask.io/download](https://metamask.io/download/)
2. Install the extension for your browser
3. Follow the setup wizard to create a new wallet
4. **Save your Secret Recovery Phrase** somewhere safe (offline)

> ⚠️ **Security Warning**  
> Never share your seed phrase. Anyone with access to it can steal your funds.

---

## Step 5 — Add XDC Networks to MetaMask

### XDC Apothem Testnet

| Field | Value |
|-------|-------|
| Network Name | XDC Apothem Testnet |
| RPC URL | `https://rpc.apothem.network` |
| Chain ID | `51` |
| Currency Symbol | XDC |
| Block Explorer | `https://testnet.xdcscan.com` |

### XDC Mainnet

| Field | Value |
|-------|-------|
| Network Name | XDC Mainnet |
| RPC URL | `https://rpc.xinfin.network` |
| Chain ID | `50` |
| Currency Symbol | XDC |
| Block Explorer | `https://xdcscan.com` |

**To add manually:**

1. Open MetaMask and click the network dropdown (top center)
2. Click **Add Network** → **Add a network manually**
3. Fill in the fields above
4. Click **Save**

---

## Step 6 — Get Test XDC

You need test XDC to pay for gas on the Apothem Testnet.

1. Copy your wallet address from MetaMask (click the address to copy)
2. Visit [faucet.apothem.network](https://faucet.apothem.network)
3. Paste your address and click **Request 1000 XDC**
4. Wait 10–30 seconds — 1000 XDC will appear in your MetaMask

> 💡 **Tip:** If the faucet is slow, try the [BlocksScan faucet](https://faucet.blocksscan.io/)

---

## Step 7 — Install Hardhat

Hardhat is a JavaScript-based development environment.

```bash title="Terminal"
mkdir xdc-project && cd xdc-project
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npx hardhat init
```

Select **"Create a TypeScript project"** when prompted.

**Configure for XDC:**

Replace `hardhat.config.ts` with:

```typescript title="hardhat.config.ts"
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    xdc: {
      url: "https://rpc.xinfin.network",
      chainId: 50,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    apothem: {
      url: "https://rpc.apothem.network",
      chainId: 51,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: {
      xdc: "none",
      apothem: "none",
    },
    customChains: [
      {
        network: "xdc",
        chainId: 50,
        urls: {
          apiURL: "https://xdcscan.com/api",
          browserURL: "https://xdcscan.com",
        },
      },
      {
        network: "apothem",
        chainId: 51,
        urls: {
          apiURL: "https://testnet.xdcscan.com/api",
          browserURL: "https://testnet.xdcscan.com",
        },
      },
    ],
  },
};

export default config;
```

Create `.env`:

```bash title="Terminal"
echo "PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE" > .env
npm install --save-dev dotenv
```

> ⚠️ **Security**  
> Add `.env` to `.gitignore`:
> ```bash
> echo ".env" >> .gitignore
> ```

---

## Step 8 — Install Foundry (Optional)

Foundry is a fast, Rust-based toolkit. It's optional but recommended for advanced users.

```bash title="Terminal"
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

Verify:

```bash title="Terminal"
forge --version
# 0.2.x or higher
cast --version
```

**Configure for XDC:**

Create `foundry.toml`:

```toml title="foundry.toml"
[profile.default]
src = "src"
out = "out"
libs = ["lib"]

[rpc_endpoints]
xdc = "https://rpc.xinfin.network"
apothem = "https://rpc.apothem.network"

[etherscan]
xdc = { key = "none", url = "https://xdcscan.com/api" }
apothem = { key = "none", url = "https://testnet.xdcscan.com/api" }
```

---

## Verification

Test your setup:

```bash title="Terminal"
# Hardhat
npx hardhat compile

# Foundry
forge build
```

Both should compile without errors.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `node: command not found` | Node.js not installed | Reinstall Node.js |
| `hardhat: command not found` | Not installed globally | Use `npx hardhat` instead |
| MetaMask won't connect | Wrong network | Switch to XDC Apothem |
| Faucet says "insufficient funds" | Out of test XDC | Wait 24 hours or use alternate faucet |
| `PRIVATE_KEY` not found | `.env` not loaded | Install `dotenv` and import it |

---

## 🚀 Next Steps

Your environment is ready. Continue your developer journey:

1. **[Write Your First Contract →](./writing.md)** — Learn Solidity with a Counter example (⏱️ 20 min)
2. **[Test Your Contract →](./testing.md)** — Write unit tests with Hardhat/Foundry (⏱️ 25 min)
3. **[Deploy with Hardhat →](./hardhat.md)** — Deploy to XDC testnet (⏱️ 15 min)

Or explore:
- [Smart Contract Overview →](./index.md) — Full developer hub
- [Security Best Practices →](../security/security-practices.md) — Before mainnet deployment
- [JavaScript SDK →](../sdks/javascript.md) — Interact with contracts programmatically
