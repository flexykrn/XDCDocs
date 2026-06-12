---
title: Testing Smart Contracts
description: Write and run unit tests for XDC smart contracts using Hardhat and Foundry. Covers test structure, coverage, and best practices.
---

Difficulty: Intermediate | Time: ~25 minutes | Tools: Hardhat/Foundry, Chai, Forge

# Testing Smart Contracts

Testing is critical for smart contract security. This guide covers writing comprehensive unit tests for XDC contracts using Hardhat and Foundry.

## Prerequisites

- [Environment Setup](./setup.md) completed
- [Writing Your First Contract](./writing.md) completed

---

## Testing Philosophy

Smart contracts are immutable once deployed. Bugs cost real money. Test everything:

- **Happy paths**: Normal operation
- **Edge cases**: Zero values, maximum values
- **Access control**: Unauthorized access attempts
- **Reentrancy**: External call safety
- **Gas limits**: Transaction efficiency

Target: **100% branch coverage** before mainnet deployment.

---

## Hardhat Testing

### Test Structure

Create `test/Counter.test.ts`:

```typescript title="test/Counter.test.ts"
import { expect } from "chai";
import { ethers } from "hardhat";
import { Counter } from "../typechain-types";

describe("Counter", function () {
  let counter: Counter;
  let owner: any;
  let addr1: any;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();
    const CounterFactory = await ethers.getContractFactory("Counter");
    counter = await CounterFactory.deploy();
    await counter.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set count to 0", async function () {
      expect(await counter.getCount()).to.equal(0);
    });

    it("Should set owner to deployer", async function () {
      expect(await counter.owner()).to.equal(owner.address);
    });
  });

  describe("Increment", function () {
    it("Should increment count by 1", async function () {
      await counter.increment();
      expect(await counter.getCount()).to.equal(1);
    });

    it("Should emit CountIncremented event", async function () {
      await expect(counter.increment())
        .to.emit(counter, "CountIncremented")
        .withArgs(1);
    });
  });

  describe("Decrement", function () {
    it("Should decrement count by 1", async function () {
      await counter.increment();
      await counter.increment();
      await counter.decrement();
      expect(await counter.getCount()).to.equal(1);
    });

    it("Should revert when count is 0", async function () {
      await expect(counter.decrement()).to.be.revertedWith(
        "Counter: cannot decrement below zero"
      );
    });
  });

  describe("Access Control", function () {
    it("Should allow owner to reset", async function () {
      await counter.increment();
      await counter.reset();
      expect(await counter.getCount()).to.equal(0);
    });

    it("Should not allow non-owner to reset", async function () {
      await expect(counter.connect(addr1).reset()).to.be.revertedWith(
        "Counter: not owner"
      );
    });
  });
});
```

### Run Tests

```bash title="Terminal"
npx hardhat test
```

**Expected output:**

```
  Counter
    Deployment
      ✔ Should set count to 0
      ✔ Should set owner to deployer
    Increment
      ✔ Should increment count by 1
      ✔ Should emit CountIncremented event
    Decrement
      ✔ Should decrement count by 1
      ✔ Should revert when count is 0
    Access Control
      ✔ Should allow owner to reset
      ✔ Should not allow non-owner to reset

  8 passing (2s)
```

### Coverage Report

```bash title="Terminal"
npx hardhat coverage
```

**Expected output:**

```
-----------------|----------|----------|----------|----------|----------------|
File             |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
-----------------|----------|----------|----------|----------|----------------|
 contracts/      |      100 |      100 |      100 |      100 |                |
  Counter.sol    |      100 |      100 |      100 |      100 |                |
-----------------|----------|----------|----------|----------|----------------|
All files        |      100 |      100 |      100 |      100 |                |
-----------------|----------|----------|----------|----------|----------------|
```

---

## Foundry Testing

### Test Structure

Create `test/Counter.t.sol`:

```solidity title="test/Counter.t.sol"
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/Counter.sol";

contract CounterTest is Test {
    Counter public counter;
    address public owner;
    address public addr1;

    function setUp() public {
        owner = address(this);
        addr1 = makeAddr("addr1");
        counter = new Counter();
    }

    function test_InitialCount() public view {
        assertEq(counter.getCount(), 0);
    }

    function test_InitialOwner() public view {
        assertEq(counter.owner(), owner);
    }

    function test_Increment() public {
        counter.increment();
        assertEq(counter.getCount(), 1);
    }

    function test_IncrementEmitsEvent() public {
        vm.expectEmit(true, true, true, true);
        emit Counter.CountIncremented(1);
        counter.increment();
    }

    function test_Decrement() public {
        counter.increment();
        counter.increment();
        counter.decrement();
        assertEq(counter.getCount(), 1);
    }

    function test_DecrementRevertsAtZero() public {
        vm.expectRevert("Counter: cannot decrement below zero");
        counter.decrement();
    }

    function test_ResetAsOwner() public {
        counter.increment();
        counter.reset();
        assertEq(counter.getCount(), 0);
    }

    function test_ResetAsNonOwnerReverts() public {
        vm.prank(addr1);
        vm.expectRevert("Counter: not owner");
        counter.reset();
    }

    function testFuzz_Increment(uint8 times) public {
        uint8 bounded = uint8(bound(times, 0, 100));
        for (uint8 i = 0; i < bounded; i++) {
            counter.increment();
        }
        assertEq(counter.getCount(), bounded);
    }
}
```

### Run Tests

```bash title="Terminal"
forge test
```

**Expected output:**

```
[⠊] Compiling...
[⠒] Compiling 2 files with Solc 0.8.24
[⠢] Solc 0.8.24 finished in 1.45s
Compiler run successful!

Ran 9 tests for test/Counter.t.sol:CounterTest
[PASS] test_Decrement() (gas: 28345)
[PASS] test_DecrementRevertsAtZero() (gas: 8962)
[PASS] test_Increment() (gas: 26789)
[PASS] test_IncrementEmitsEvent() (gas: 27123)
[PASS] test_InitialCount() (gas: 7845)
[PASS] test_InitialOwner() (gas: 7845)
[PASS] test_ResetAsNonOwnerReverts() (gas: 12345)
[PASS] test_ResetAsOwner() (gas: 23456)
[PASS] testFuzz_Increment(uint8) (runs: 256, μ: 45234, ~: 45234)
Suite result: ok. 9 passed; 0 failed; 0 skipped;
```

### Coverage Report

```bash title="Terminal"
forge coverage
```

**Expected output:**

```
| File          | % Lines | % Statements | % Branches | % Funcs |
|---------------|---------|--------------|------------|---------|
| src/Counter.sol | 100.00% | 100.00% | 100.00% | 100.00% |
| Total         | 100.00% | 100.00% | 100.00% | 100.00% |
```

---

## Integration Testing

Integration tests verify multiple contracts working together.

### Hardhat Integration Test

```typescript title="test/Integration.test.ts"
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Token + Vault Integration", function () {
  let token, vault, owner, user;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();
    
    const Token = await ethers.getContractFactory("Token");
    token = await Token.deploy("Test Token", "TST");
    
    const Vault = await ethers.getContractFactory("Vault");
    vault = await Vault.deploy(await token.getAddress());
    
    // Fund user with tokens
    await token.transfer(user.address, ethers.parseEther("1000"));
  });

  it("Should deposit and withdraw tokens", async function () {
    // Approve vault to spend tokens
    await token.connect(user).approve(await vault.getAddress(), ethers.parseEther("100"));
    
    // Deposit
    await vault.connect(user).deposit(ethers.parseEther("100"));
    expect(await vault.balanceOf(user.address)).to.equal(ethers.parseEther("100"));
    
    // Withdraw
    await vault.connect(user).withdraw(ethers.parseEther("50"));
    expect(await vault.balanceOf(user.address)).to.equal(ethers.parseEther("50"));
    expect(await token.balanceOf(user.address)).to.equal(ethers.parseEther("950"));
  });
});
```

---

## XDC-Specific Testing

### Apothem Testnet Testing

```typescript title="test/Apothem.test.ts"
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Apothem Testnet Tests", function () {
  // Increase timeout for testnet (10 seconds block time)
  this.timeout(30000);

  it("Should interact with deployed contract on Apothem", async function () {
    const provider = new ethers.JsonRpcProvider("https://rpc.apothem.network");
    const contract = new ethers.Contract(
      "0xDEPLOYED_CONTRACT_ADDRESS",
      ["function getCount() view returns (uint256)"],
      provider
    );
    
    const count = await contract.getCount();
    expect(count).to.be.a("bigint");
  });
});
```

### Local Node Testing

```bash title="Terminal"
# Start local XDC node (if available)
# Or use Hardhat Network for local testing
npx hardhat node

# Run tests against local node
npx hardhat test --network localhost
```

### Fork Testing

```javascript title="hardhat.config.js"
module.exports = {
  networks: {
    hardhat: {
      forking: {
        url: "https://rpc.xinfin.network",
        blockNumber: 50000000, // Optional: specific block
      },
    },
  },
};
```

```typescript title="test/Fork.test.ts"
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Fork Testing", function () {
  it("Should have XDC balance on forked mainnet", async function () {
    // Impersonate a mainnet account
    const address = "0x0000000000000000000000000000000000000000";
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [address],
    });
    
    const signer = await ethers.getSigner(address);
    const balance = await ethers.provider.getBalance(address);
    
    expect(balance).to.be.gt(0);
  });
});
```

### Gas Estimation Testing

```typescript title="test/Gas.test.ts"
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Gas Estimation", function () {
  let counter;

  beforeEach(async function () {
    const Counter = await ethers.getContractFactory("Counter");
    counter = await Counter.deploy();
  });

  it("Should estimate gas correctly", async function () {
    const gasEstimate = await counter.increment.estimateGas();
    
    // XDC gas is cheap (~0.0001 XDC per tx)
    // Verify gas is within reasonable bounds
    expect(gasEstimate).to.be.lt(100000);
    expect(gasEstimate).to.be.gt(20000);
  });

  it("Should track gas costs", async function () {
    const tx = await counter.increment();
    const receipt = await tx.wait();
    
    console.log("Gas used:", receipt.gasUsed.toString());
    console.log("Effective gas price:", receipt.gasPrice.toString());
    
    // XDC-specific: 2-second block time means fast confirmation
    expect(receipt.blockNumber).to.be.gt(0);
    expect(receipt.status).to.equal(1);
  });
});
```

---

## Truffle Testing (Legacy)

For teams using Truffle:

```javascript title="test/counter.js"
const Counter = artifacts.require("Counter");
const { expect } = require("chai");

describe("Counter (Truffle)", function () {
  let counter;

  beforeEach(async function () {
    counter = await Counter.new();
  });

  it("Should increment", async function () {
    await counter.increment();
    const count = await counter.getCount();
    expect(count.toNumber()).to.equal(1);
  });
});
```

```bash title="Terminal"
truffle test
```

---

## Advanced Testing Patterns

### Property-Based Testing (Invariant Testing)

```solidity title="test/Invariant.t.sol"
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/Token.sol";

contract InvariantTest is Test {
    Token public token;
    
    function setUp() public {
        token = new Token("Test", "TST");
    }
    
    // Invariant: total supply never changes without mint/burn
    function invariant_totalSupply() public view {
        assertEq(token.totalSupply(), token.balanceOf(address(this)));
    }
    
    // Invariant: balances are always positive
    function invariant_positiveBalances() public view {
        assertGe(token.balanceOf(address(this)), 0);
    }
}
```

### Time-Based Testing

```solidity title="test/TimeTest.t.sol"
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/Vesting.sol";

contract TimeTest is Test {
    Vesting public vesting;
    
    function setUp() public {
        vesting = new Vesting();
    }
    
    function test_VestingSchedule() public {
        uint256 startTime = block.timestamp;
        
        // Fast forward 30 days
        vm.warp(startTime + 30 days);
        
        // Check vested amount
        assertEq(vesting.vestedAmount(), expectedAmount);
        
        // Fast forward full vesting period
        vm.warp(startTime + 365 days);
        assertEq(vesting.vestedAmount(), totalAmount);
    }
}
```

### Multi-User Scenario Testing

```typescript title="test/MultiUser.test.ts"
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Multi-User Scenario", function () {
  let token, owner, alice, bob, charlie;

  beforeEach(async function () {
    [owner, alice, bob, charlie] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("Token");
    token = await Token.deploy("Test", "TST");
    
    // Distribute tokens
    await token.transfer(alice.address, ethers.parseEther("100"));
    await token.transfer(bob.address, ethers.parseEther("100"));
    await token.transfer(charlie.address, ethers.parseEther("100"));
  });

  it("Should handle concurrent transfers", async function () {
    // Alice sends to Bob
    const tx1 = await token.connect(alice).transfer(bob.address, ethers.parseEther("10"));
    
    // Bob sends to Charlie
    const tx2 = await token.connect(bob).transfer(charlie.address, ethers.parseEther("5"));
    
    // Charlie sends to Alice
    const tx3 = await token.connect(charlie).transfer(alice.address, ethers.parseEther("3"));
    
    await Promise.all([tx1.wait(), tx2.wait(), tx3.wait()]);
    
    expect(await token.balanceOf(alice.address)).to.equal(ethers.parseEther("93"));
    expect(await token.balanceOf(bob.address)).to.equal(ethers.parseEther("105"));
    expect(await token.balanceOf(charlie.address)).to.equal(ethers.parseEther("102"));
  });
});
```

---

## Security Testing Checklist

Before mainnet deployment, verify:

- [ ] **Reentrancy**: Test all external calls with reentrancy guards
- [ ] **Access Control**: Verify only authorized roles can execute sensitive functions
- [ ] **Integer Overflow**: Test boundary conditions (max/min values)
- [ ] **Race Conditions**: Test concurrent access scenarios
- [ ] **Gas Limits**: Verify functions don't exceed block gas limit
- [ ] **DoS**: Test for denial of service via unbounded loops
- [ ] **Front-running**: Consider MEV implications for time-sensitive operations
- [ ] **Upgrade Safety**: Test upgrade paths if using proxy patterns

### Reentrancy Test Example

```solidity title="test/Reentrancy.t.sol"
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/Vault.sol";

contract Attacker {
    Vault public vault;
    uint256 public attackCount;
    
    constructor(Vault _vault) {
        vault = _vault;
    }
    
    function attack() external {
        vault.deposit{value: 1 ether}();
        vault.withdraw(1 ether);
    }
    
    receive() external payable {
        if (attackCount < 5) {
            attackCount++;
            vault.withdraw(1 ether);
        }
    }
}

contract ReentrancyTest is Test {
    Vault public vault;
    Attacker public attacker;
    
    function setUp() public {
        vault = new Vault();
        attacker = new Attacker(vault);
    }
    
    function test_ReentrancyProtection() public {
        vm.deal(address(attacker), 1 ether);
        
        // Should revert due to reentrancy guard
        vm.expectRevert();
        attacker.attack();
    }
}
```

---

## CI/CD Integration

### GitHub Actions Testing

```yaml title=".github/workflows/test.yml"
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npx hardhat test
      - run: npx hardhat coverage
```

### Foundry in CI

```yaml title=".github/workflows/foundry.yml"
name: Foundry Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: foundry-rs/foundry-toolchain@v1
      - run: forge test
      - run: forge coverage
```

---

## Test Best Practices

### 1. Test Every Function

Every `public` and `external` function should have at least one test.

### 2. Test Revert Conditions

```solidity
vm.expectRevert("Counter: not owner");
counter.reset();
```

### 3. Test Events

```solidity
vm.expectEmit(true, true, true, true);
emit Counter.CountIncremented(1);
counter.increment();
```

### 4. Use Fuzzing

```solidity
function testFuzz_Increment(uint8 times) public {
    uint8 bounded = uint8(bound(times, 0, 100));
    // Test with random inputs
}
```

### 5. Test Access Control

```solidity
vm.prank(addr1);  // Act as addr1
vm.expectRevert();
counter.reset();  // Should fail
```

### 6. Test State Changes

```solidity
uint256 balanceBefore = token.balanceOf(user);
token.transfer(user, 100);
uint256 balanceAfter = token.balanceOf(user);
assertEq(balanceAfter - balanceBefore, 100);
```

### 7. Test Edge Cases

```solidity
// Zero value
function test_ZeroValue() public {
    vm.expectRevert("Amount must be greater than 0");
    token.transfer(user, 0);
}

// Maximum value
function test_MaxValue() public {
    uint256 max = type(uint256).max;
    vm.expectRevert();
    token.mint(user, max + 1);
}
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `TypeError` | Import path wrong | Check `@openzeppelin` path |
| `Invalid BigNumber` | Value too large | Use `ethers.parseEther()` |
| `Timeout` | Test too slow | Increase timeout in config |
| `Coverage 0%` | Wrong file path | Check `contracts/` vs `src/` |
| `vm.expectRevert` fails | Wrong error message | Match exact revert string |

---

## 🚀 Next Steps

Your contracts are tested and ready. Move to deployment:

1. **[Deploy with Hardhat →](./hardhat.md)** — Deploy to XDC testnet (⏱️ 15 min)
2. **[Deploy with Foundry →](./foundry.md)** — Alternative deployment workflow (⏱️ 15 min)
3. **[Verify on XDCScan →](./verify.md)** — Publish source code for transparency (⏱️ 5 min)

Or explore:
- [Deployment Overview →](./deploy.md) — Compare deployment methods
- [Contract Monitoring →](./monitoring.md)** — Track events and transactions
- [Security Best Practices →](../security/security-practices.md) — Pre-mainnet checklist
