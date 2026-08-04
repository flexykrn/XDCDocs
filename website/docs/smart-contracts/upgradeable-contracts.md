---
title: Upgradeable Smart Contracts Guide
sidebar_position: 10
description: Deploy upgradeable smart contracts on the XDC Network using proxy patterns — transparent proxies, UUPS, beacons, storage layout rules, and upgrade security.
---

# Upgradeable Smart Contracts Guide: Proxy Patterns and Security on XDC

Smart contracts on the XDC Network are immutable once deployed — the bytecode at an address can never change. Upgradeability patterns work around this by separating a contract's storage (which lives in a fixed proxy address) from its logic (which can be swapped out). This guide covers why and when to make contracts upgradeable, the major proxy patterns, a full OpenZeppelin Upgrades + Hardhat workflow on XDC, storage layout rules, and the security practices that upgrades demand.

## Why Upgradeability — and Its Tradeoff

- **Bug fixes:** An upgradeable contract lets you patch a vulnerability after deployment instead of migrating all users and liquidity to a new address.
- **Feature additions:** Ship new functions, adjust parameters, and respond to ecosystem changes without breaking integrations that point at your contract address.
- **Preserved state and address:** The proxy address, balances, and storage carry over across upgrades — users never need to re-approve tokens or update their integrations.

The tradeoff is real: **upgradeability introduces trust**. Whoever holds the upgrade admin key can replace the contract's logic entirely — including with malicious code that drains funds. This weakens the trustlessness that makes smart contracts valuable, so upgrades must be paired with strong admin key management (multisig, timelock) covered below. If your contract does not genuinely need to evolve, prefer a simple immutable deployment.

## Proxy Patterns Overview

All proxy patterns follow the same principle: users interact with a **proxy contract** that holds the state, and the proxy `delegatecall`s into a **logic (implementation) contract** whose code executes against the proxy's storage. Upgrading means pointing the proxy at a new implementation.

| Pattern | Upgrade Authorization | Gas Overhead | Admin Model | When to Use |
| --- | --- | --- | --- | --- |
| **Transparent Proxy** | A separate `ProxyAdmin` contract; admin calls are routed to the admin, user calls to the implementation | Higher — every call checks `msg.sender` against the admin address | Dedicated ProxyAdmin contract owns upgrades | General-purpose upgrades; safest default for teams new to proxies |
| **UUPS (EIP-1822)** | Upgrade logic lives in the implementation itself (`_authorizeUpgrade`) | Lower — no per-call admin check | Implementation contract controls its own upgrade | Gas-sensitive deployments; requires discipline since forgetting upgrade logic in a new version bricks upgradeability |
| **Beacon Proxy** | A shared beacon contract holds the implementation address for many proxies | Low per proxy; beacon adds one extra call hop | Beacon owner upgrades all proxies at once | Deploying many instances of the same logic (e.g., per-user vaults) that must upgrade together |

The XDC Network's EVM equivalence means all three patterns work identically to Ethereum. Subnet-based deployments also use these patterns — see the [Subnet Checkpoint Contract](/docs/subnet/components/checkpoint-contract) for how transparent proxies are used in XDC Subnet infrastructure.

## OpenZeppelin Upgrades with Hardhat on XDC

**Step 1: Install dependencies**

```bash
npm install --save-dev @openzeppelin/hardhat-upgrades
npm install @openzeppelin/contracts-upgradeable
```

**Step 2: Write an upgradeable contract**

Upgradeable contracts replace constructors with an `initialize` function, because constructors run against the implementation's storage — not the proxy's. The constructor calls `_disableInitializers()` to lock the implementation itself:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract VaultV1 is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    uint256 public feeBps;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(uint256 _feeBps) public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        feeBps = _feeBps;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
```

**Step 3: Configure the Apothem network**

Enable the upgrades plugin in `hardhat.config.js`:

```javascript
require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");
require("dotenv").config();

module.exports = {
  solidity: "0.8.23",
  networks: {
    apothem: {
      url: "https://rpc.apothem.network",
      chainId: 51,
      accounts: [process.env.PRIVATE_KEY],
    },
    xdc: {
      url: "https://rpc.xinfin.network",
      chainId: 50,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
};
```

**Step 4: Deploy the proxy**

```javascript
const { ethers, upgrades } = require("hardhat");

async function main() {
  const Vault = await ethers.getContractFactory("VaultV1");
  const vault = await upgrades.deployProxy(Vault, [50], { kind: "uups" });
  await vault.waitForDeployment();
  console.log("Proxy deployed to:", await vault.getAddress());
}

main();
```

Run against Apothem (chain ID 51) after funding your deployer from the [Apothem faucet](https://faucet.apothem.network):

```bash
npx hardhat run scripts/deploy.js --network apothem
```

**Step 5: Upgrade to a new implementation**

```javascript
const { ethers, upgrades } = require("hardhat");

async function main() {
  const proxyAddress = "0xYourProxyAddress";
  const VaultV2 = await ethers.getContractFactory("VaultV2");
  const upgraded = await upgrades.upgradeProxy(proxyAddress, VaultV2);
  console.log("Upgraded at:", await upgraded.getAddress());
}

main();
```

The plugin validates storage layout compatibility automatically and reverts if the new version would corrupt existing state.

## Storage Layout Rules

Because the implementation's code operates on the proxy's storage, the layout of state variables must stay compatible across versions:

- **Append-only:** New state variables go at the end, after all existing variables. Never insert a variable in the middle.
- **Never reorder or retype:** Changing a variable's order, type, or name position shifts every slot after it — silently corrupting stored data.
- **Reserve storage gaps:** In base contracts meant to be inherited, include a gap so future versions can add variables without shifting child contract slots:

```solidity
contract VaultV1 is Initializable, OwnableUpgradeable {
    uint256 public feeBps;

    uint256[49] private __gap;
}
```

- **No constructors for logic:** Constructors write to the implementation's storage, which is never used through the proxy. All setup belongs in `initialize()` guarded by the `initializer` modifier.
- **Mind inheritance order:** Upgrading to a version that changes the inheritance list can shift storage slots just like reordering variables.

## Security Considerations

- **Admin key management:** The upgrade key is a single point of total compromise. Put upgrade authority behind a **multisig** and ideally a **timelock**, so upgrades are publicly visible before execution and no single key holder can act alone. Never leave it on an EOA in production.
- **initialize() front-running:** Anyone can call an unprotected `initialize()` on a freshly deployed proxy and take ownership. `upgrades.deployProxy` atomically deploys and initializes in one transaction — never deploy the proxy and initialize in separate steps.
- **Lock the implementation:** Call `_disableInitializers()` in the implementation's constructor so attackers cannot initialize the logic contract directly and selfdestruct or manipulate it (as in past UUPS exploits).
- **Test every upgrade:** Deploy V1, seed state, upgrade to V2, and assert all V1 state survived. The hardhat-upgrades plugin's `upgrades.upgradeProxy` performs storage-layout validation, but behavior regressions need real tests — see the [Smart Contract Testing Guide](/docs/smart-contracts/testing-guide).
- **Audit before mainnet:** Upgradeable contracts add attack surface beyond a normal deployment. Run the full [Security Best Practices & Audit Checklist](/docs/smart-contracts/security-best-practices) before shipping.

## Verifying Proxies on the Explorer

After deploying to Apothem or mainnet, verify your contracts so users can read the code. A proxy deployment involves multiple contracts — the proxy itself, the implementation, and (for transparent proxies) the ProxyAdmin — and explorers need to link them. The hardhat-upgrades plugin records deployment metadata that helps with this; follow the verification workflow in [Deployment & Verification](/docs/smart-contracts/deployment-verification) to verify on [testnet.xdcscan.com](https://testnet.xdcscan.com) for Apothem or XDCScan for mainnet. Once the proxy is verified, explorers typically detect the proxy pattern and route reads through the implementation ABI automatically.

## See Also

- [Smart Contract Testing Guide](/docs/smart-contracts/testing-guide) — unit tests, fork testing, and Apothem rehearsal.
- [Security Best Practices & Audit Checklist](/docs/smart-contracts/security-best-practices) — vulnerabilities and pre-deployment checklist.
- [Deployment & Verification](/docs/smart-contracts/deployment-verification) — deployment flows and explorer verification.
- [Subnet Checkpoint Contract](/docs/subnet/components/checkpoint-contract) — transparent proxy usage in XDC Subnet contracts.
- [XDC FAQ — Smart Contracts](/docs/xdc-chain/faq#smart-contracts) — compiler versions, tooling, and troubleshooting.
- [Porting from Ethereum to XDC](/docs/xdc-chain/evmtoxdc) — migrating existing upgradeable projects to XDC.
