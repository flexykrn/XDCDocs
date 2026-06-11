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

---

## Additional Resources

### Beacon Proxy Pattern

Used when multiple proxies should share the same implementation and upgrade simultaneously.

**Architecture:**

```
Beacon Contract
├── implementation() → returns current implementation
└── upgradeTo(address) → updates implementation for all proxies

Proxy Contracts (multiple)
├── beacon() → returns beacon address
└── fallback() → delegatecall to beacon.implementation()
```

**Use Cases:**

- Multi-tenant systems (each tenant gets a proxy)
- Factory patterns (create many identical contracts)
- Protocol-wide upgrades (upgrade all pools at once)

**OpenZeppelin Implementation:**

```solidity
import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";

// Deploy beacon with initial implementation
UpgradeableBeacon beacon = new UpgradeableBeacon(address(implementation));

// Deploy multiple proxies pointing to same beacon
BeaconProxy proxy1 = new BeaconProxy(address(beacon), initData);
BeaconProxy proxy2 = new BeaconProxy(address(beacon), initData);

// Upgrade all proxies at once
beacon.upgradeTo(address(newImplementation));
```

### Pattern Comparison

| Feature | Transparent | UUPS | Beacon |
|---------|-------------|------|--------|
| Proxy Size | Larger | Smaller | Small |
| Upgrade Logic | In proxy | In implementation | In beacon |
| Gas Overhead | Admin check | None | Beacon call |
| Multi-Proxy Upgrade | Individual | Individual | Atomic |
| Brick Risk | Low | Medium | Low |
| Complexity | Low | Medium | Medium |
| Recommended For | Most use cases | Gas-sensitive contracts | Multi-proxy systems |

### Storage Layout Best Practices

**Critical:** Storage layout must be preserved across upgrades. New variables can only be appended, never inserted or reordered.

**Correct Upgrade (Append Only):**

```solidity
// V1
contract MyContractV1 {
    uint256 public value1;    // Slot 0
    address public owner;     // Slot 1
}

// V2 - Correct: Append new variables
contract MyContractV2 {
    uint256 public value1;    // Slot 0 (preserved)
    address public owner;     // Slot 1 (preserved)
    uint256 public newValue;  // Slot 2 (new, appended)
}
```

**Storage Gap Pattern:**

Reserve storage slots for future upgrades:

```solidity
contract MyContract is Initializable {
    uint256 public value;
    address public owner;
    
    // Reserve 50 slots for future upgrades
    uint256[50] private __gap;
}
```

### Testing Upgrades

**Unit Test Pattern:**

```javascript
const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("Upgradeable Contract", function () {
    let proxy;
    
    beforeEach(async function () {
        const ContractV1 = await ethers.getContractFactory("MyContractV1");
        proxy = await upgrades.deployProxy(ContractV1, [100], { kind: "uups" });
    });
    
    it("Should preserve state after upgrade", async function () {
        expect(await proxy.value()).to.equal(100);
        
        const ContractV2 = await ethers.getContractFactory("MyContractV2");
        await upgrades.upgradeProxy(await proxy.getAddress(), ContractV2);
        
        // State preserved
        expect(await proxy.value()).to.equal(100);
        
        // New function works
        await proxy.setNewFeature(200);
        expect(await proxy.newFeature()).to.equal(200);
    });
    
    it("Should reject unauthorized upgrades", async function () {
        const [owner, attacker] = await ethers.getSigners();
        const ContractV2 = await ethers.getContractFactory("MyContractV2", attacker);
        
        await expect(
            upgrades.upgradeProxy(await proxy.getAddress(), ContractV2)
        ).to.be.reverted;
    });
});
```

### Rollback Procedures

**Emergency Rollback:**

If an upgrade introduces a bug, immediately roll back to the previous implementation:

```javascript
async function rollback() {
    const PreviousImplementation = await ethers.getContractFactory("MyContractV1");
    
    // Deploy previous version as new implementation
    const previousImpl = await PreviousImplementation.deploy();
    
    // Upgrade proxy to previous implementation
    const proxy = await ethers.getContractAt("MyContractV1", "0xProxyAddress");
    await proxy.upgradeTo(await previousImpl.getAddress());
}
```

**Important:** Rollback only works if the previous implementation is compatible with current storage layout.

### Admin Key Management

**The Risk:**

If the admin private key is compromised, attackers can upgrade to malicious implementations.

**Mitigation Strategies:**

**1. Multi-Sig Admin:**

```solidity
import "@openzeppelin/contracts/access/AccessControl.sol";

contract Admin is AccessControl {
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    constructor(address[] memory admins) {
        for (uint i = 0; i < admins.length; i++) {
            _grantRole(UPGRADER_ROLE, admins[i]);
        }
    }
    
    function upgrade(address proxy, address newImpl) external {
        require(getRoleMemberCount(UPGRADER_ROLE) >= 2, "Need multi-sig");
        // Multi-sig logic
    }
}
```

**2. Timelock Controller:**

```solidity
import "@openzeppelin/contracts/governance/TimelockController.sol";

// 2-day delay before upgrades execute
TimelockController timelock = new TimelockController(
    2 days,           // Min delay
    proposers,        // Addresses that can propose
    executors,        // Addresses that can execute
    admin             // Admin address
);
```

**3. Remove Upgradeability:**

For maximum security, permanently disable upgrades after sufficient testing:

```solidity
function renounceUpgradeability() external onlyOwner {
    // Set implementation to current (no further changes possible)
    // Or transfer admin to zero address
}
```

### XDC-Specific Considerations

XDC's lower gas costs make some optimization trade-offs different from Ethereum:

| Factor | Ethereum | XDC | Impact |
|--------|----------|-----|--------|
| Deployment Cost | $500-$5000 | $0.10-$1 | Cheaper to deploy proxies |
| Upgrade Cost | $100-$500 | $0.02-$0.10 | Frequent upgrades affordable |
| Call Overhead | Expensive | Negligible | Proxy overhead less concerning |

**Recommendation:** On XDC, the gas overhead of proxy patterns is negligible. Prioritize security and maintainability over micro-optimizations.

### Common Pitfalls

**Pitfall 1: Constructor in Implementation**

```solidity
// WRONG: Constructor sets state in implementation, not proxy
contract BadImplementation {
    uint256 public value;
    
    constructor(uint256 _value) {
        value = _value; // Sets implementation's storage, not proxy's
    }
}

// CORRECT: Use initializer
contract GoodImplementation is Initializable {
    uint256 public value;
    
    function initialize(uint256 _value) public initializer {
        value = _value; // Sets proxy's storage via delegatecall
    }
}
```

**Pitfall 2: Selfdestruct in Implementation**

```solidity
// DANGEROUS: Selfdestruct in implementation kills the proxy
function destroy() external {
    selfdestruct(payable(msg.sender));
}

// NEVER use selfdestruct in upgradeable contracts
```

**Pitfall 3: Delegatecall in Implementation**

```solidity
// DANGEROUS: Delegatecall can manipulate proxy storage unexpectedly
function unsafeCall(address target, bytes memory data) external {
    target.delegatecall(data);
}
```

**Pitfall 4: Removing Upgrade Function (UUPS)**

```solidity
// V2 removes upgrade function - bricks the contract!
contract BadV2 is UUPSUpgradeable {
    // _authorizeUpgrade removed - cannot upgrade anymore
}

// ALWAYS keep upgrade function in UUPS
contract GoodV2 is UUPSUpgradeable {
    function _authorizeUpgrade(address) internal override onlyOwner {}
}
```

**Pitfall 5: Storage Layout Changes**

```solidity
// V1
contract V1 {
    uint256 public a; // slot 0
    uint256 public b; // slot 1
}

// V2 - WRONG: Reordered variables
contract V2 {
    uint256 public b; // slot 0 (was a!) - CORRUPTION
    uint256 public a; // slot 1 (was b!) - CORRUPTION
}
```

### Best Practices

**For Developers:**

1. **Start Simple:** Use Transparent Proxy for first upgradeable contracts
2. **Test Thoroughly:** Test upgrades on testnet before mainnet
3. **Document Storage:** Maintain storage layout documentation
4. **Version Control:** Tag each implementation version in Git
5. **Audit Every Version:** Each new implementation needs security audit
6. **Monitor Admin Keys:** Use multi-sig or timelock for production

**For Protocols:**

1. **Governance Integration:** Tie upgrades to DAO governance votes
2. **Emergency Pause:** Include pause functionality before upgrades
3. **Upgrade Windows:** Schedule upgrades during low-activity periods
4. **Communication:** Notify users before and after upgrades
5. **Bug Bounty:** Maintain active bug bounty for upgradeable contracts

**For Users:**

1. **Verify Implementation:** Check current implementation address on explorer
2. **Monitor Upgrades:** Subscribe to upgrade notifications
3. **Understand Risks:** Be aware of admin key risks
4. **Check Audits:** Verify each implementation version is audited

### Related Topics

- [Smart Contract Development](../index.md): General development guide
- [Security Practices](../../security/security-practices.md): Security considerations
- [Gas Optimization](../gas-optimization.md): Optimizing proxy gas costs
- [Testing](../testing.md): Testing strategies for upgradeable contracts
- [Deployment](../deploy.md): Deployment procedures
- [Token Standards](../tokens/index.md): Upgradeable token implementations
- [XDC Architecture](../../learn/xdc-architecture.md): Understanding XDC's consensus
