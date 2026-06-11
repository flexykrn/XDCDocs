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
