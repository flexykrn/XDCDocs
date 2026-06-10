---
title: Upgrade Smart Contracts
description: Implement upgradeable smart contracts on XDC using proxy patterns. Covers UUPS, Transparent Proxy, and best practices.
---

Difficulty: Advanced | Time: ~30 minutes | Tools: OpenZeppelin, Hardhat/Foundry

# Upgrade Smart Contracts

Smart contracts are immutable by design. Once deployed, the code cannot be changed. Upgradeable contracts solve this using proxy patterns — the proxy holds the state and delegates execution to an implementation contract that can be replaced.

## Prerequisites

- [Environment Setup](./setup.md) completed
- Understanding of delegatecall
- OpenZeppelin Contracts installed

---

## Proxy Patterns

### UUPS (Universal Upgradeable Proxy Standard)

**Recommended for new projects.**

- Upgrade logic is in the implementation contract
- More gas-efficient
- Smaller proxy footprint

```solidity title="UUPSProxy.sol"
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract CounterV1 is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    uint256 public count;

    event CountIncremented(uint256 newCount);

    function initialize() public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        count = 0;
    }

    function increment() external {
        count += 1;
        emit CountIncremented(count);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
```

### Transparent Proxy

**Classic pattern, more established.**

- Upgrade logic is in the proxy contract
- Simpler to understand
- Slightly more gas per call

```solidity title="TransparentProxy.sol"
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract CounterV1 is Initializable, OwnableUpgradeable {
    uint256 public count;

    function initialize() public initializer {
        __Ownable_init(msg.sender);
        count = 0;
    }

    function increment() external {
        count += 1;
    }
}
```

---

## Hardhat Deployment

### Install Dependencies

```bash title="Terminal"
npm install @openzeppelin/contracts-upgradeable @openzeppelin/hardhat-upgrades
```

### Deploy Script

```typescript title="scripts/deploy-upgradeable.ts"
import { ethers, upgrades } from "hardhat";

async function main() {
  const Counter = await ethers.getContractFactory("CounterV1");
  const counter = await upgrades.deployProxy(Counter, [], {
    initializer: "initialize",
  });

  await counter.waitForDeployment();
  const address = await counter.getAddress();

  console.log(`Counter deployed to: ${address}`);
  console.log(`Implementation: ${await upgrades.erc1967.getImplementationAddress(address)}`);
}

main();
```

### Upgrade Script

```typescript title="scripts/upgrade.ts"
import { ethers, upgrades } from "hardhat";

async function main() {
  const CounterV2 = await ethers.getContractFactory("CounterV2");
  const counter = await upgrades.upgradeProxy("0xPROXY_ADDRESS", CounterV2);

  console.log("Counter upgraded");
  console.log(`New implementation: ${await upgrades.erc1967.getImplementationAddress("0xPROXY_ADDRESS")}`);
}

main();
```

---

## Foundry Deployment

### Install OpenZeppelin

```bash title="Terminal"
forge install OpenZeppelin/openzeppelin-contracts-upgradeable
```

### Deploy Script

```solidity title="script/DeployUUPS.s.sol"
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../src/CounterV1.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        CounterV1 implementation = new CounterV1();
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(implementation),
            abi.encodeWithSelector(CounterV1.initialize.selector)
        );

        vm.stopBroadcast();

        console.log("Proxy deployed to:", address(proxy));
        console.log("Implementation:", address(implementation));
    }
}
```

---

## Upgrade Checklist

- [ ] New implementation tested thoroughly
- [ ] Storage layout compatible (no variable deletion/reordering)
- [ ] Upgrade function access-controlled
- [ ] Emergency pause ready
- [ ] Rollback plan documented
- [ ] Multi-sig for upgrade authorization (recommended)

---

## Security Considerations

### Storage Collision

```solidity
// V1
contract V1 {
    uint256 public count;        // slot 0
    address public owner;        // slot 1
}

// V2 — SAFE: append only
contract V2 {
    uint256 public count;        // slot 0
    address public owner;        // slot 1
    uint256 public newVariable;  // slot 2 — NEW
}

// V2 — UNSAFE: reordering
contract V2Unsafe {
    address public owner;        // slot 0 — WAS slot 1!
    uint256 public count;        // slot 1 — WAS slot 0!
}
```

### Initialization

Always use `initializer` modifier:

```solidity
function initialize() public initializer {
    __Ownable_init(msg.sender);
}
```

Never use `constructor` in upgradeable contracts.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `delegatecall` failed | Wrong proxy pattern | Use OpenZeppelin's proxy contracts |
| Storage corrupted | Layout changed | Maintain append-only storage |
| Upgrade reverted | Not authorized | Check `_authorizeUpgrade` |
| Initialization failed | Already initialized | Use `reinitializer` for V2+ |

---

## Next Steps

- [Security Best Practices →](../security/security-practices.md)
- [Audit Preparation →](../security/audit-prep.md)
- [Vulnerability Catalog →](../security/vulnerabilities.md)
