---
title: Smart Contract Testing Guide
sidebar_position: 9
description: Test smart contracts for the XDC Network with Hardhat, Foundry, and Truffle — unit tests, fork testing, coverage, fuzzing, and testnet rehearsal.
---

# Smart Contract Testing Guide

Testing is not optional for smart contracts. Once deployed to the XDC Network, contract bytecode is immutable — bugs cannot be patched in place, only migrated away from. Because contracts routinely custody real value, a single untested code path can mean permanent loss of funds. XDC's full EVM compatibility means the standard Ethereum testing toolchains work out of the box: Hardhat (Mocha/Chai), Foundry (Solidity-native `forge`), and Truffle.

This guide covers setting up each framework for XDC, core testing patterns, coverage and gas reporting, fuzzing, and a full rehearsal on the Apothem Testnet before mainnet deployment.

## Why Test

- **Immutability:** Deployed contracts on XDC mainnet cannot be edited. A bug shipped to chain ID 50 stays there.
- **Real value at risk:** Contracts handle mainnet XDC and tokens with real economic value. Testnet XDC is free — there is no excuse for skipping tests.
- **Composability risk:** Your contract will interact with tokens, oracles, and other contracts you don't control. Fork testing against live Apothem state catches integration assumptions early.
- **Cheap iteration:** Catching a revert locally costs seconds; debugging a failed mainnet deployment costs real gas, time, and trust.

## Framework Options

- **Hardhat (recommended for teams):** JavaScript/TypeScript tests with Mocha and Chai. Rich plugin ecosystem (`@nomicfoundation/hardhat-toolbox`, `solidity-coverage`), console.log debugging, and mainnet/testnet forking.
- **Foundry (fastest):** Rust-based toolchain. Tests are written in Solidity itself with `forge test`, with built-in fuzzing, gas snapshots, and cheatcodes for time and state manipulation.
- **Truffle (legacy):** The original framework, still present in older XDC projects. See [Porting from Ethereum to XDC](/docs/xdc-chain/evmtoxdc) for context on existing Truffle-based codebases. New projects should prefer Hardhat or Foundry.

## Hardhat Setup for XDC

**Step 1: Initialize a project**

```bash
mkdir xdc-testing && cd xdc-testing
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npx hardhat init
```

**Step 2: Configure XDC networks**

Add mainnet and Apothem network blocks to `hardhat.config.js` using the canonical RPC URLs and chain IDs:

```javascript
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.24",
  networks: {
    xdc: {
      url: "https://rpc.xinfin.network",
      chainId: 50,
      accounts: [process.env.PRIVATE_KEY],
    },
    apothem: {
      url: "https://rpc.apothem.network",
      chainId: 51,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
};
```

**Note:** XDC Network supports Solidity up to 0.8.24. Keep your private key in a `.env` file and never commit it.

**Step 3: Write a test**

Create `test/Lock.js` (or adapt the scaffolded example). A typical test deploys the contract and asserts on state:

```javascript
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Vault", function () {
  let vault, owner, alice;

  beforeEach(async function () {
    [owner, alice] = await ethers.getSigners();
    const Vault = await ethers.getContractFactory("Vault");
    vault = await Vault.deploy();
  });

  it("sets the deployer as owner", async function () {
    expect(await vault.owner()).to.equal(owner.address);
  });

  it("accepts deposits and tracks balances", async function () {
    await vault.connect(alice).deposit({ value: ethers.parseEther("1.0") });
    expect(await vault.balances(alice.address)).to.equal(ethers.parseEther("1.0"));
  });

  it("rejects withdrawals above balance", async function () {
    await expect(
      vault.connect(alice).withdraw(ethers.parseEther("1.0"))
    ).to.be.revertedWith("Insufficient balance");
  });
});
```

**Run the tests:**

```bash
npx hardhat test
npx hardhat test --network apothem   # against the live testnet
```

## Foundry Setup for XDC

**Step 1: Install Foundry and initialize**

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
forge init xdc-forge-tests
cd xdc-forge-tests
```

**Step 2: Write a Solidity-native test**

Foundry tests are Solidity contracts inheriting from `forge-std/Test.sol`. Functions prefixed with `test` run as tests; `testFail` (or `vm.expectRevert`) asserts reverts:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/Vault.sol";

contract VaultTest is Test {
    Vault vault;
    address alice = address(0xA11CE);

    function setUp() public {
        vault = new Vault();
        vm.deal(alice, 10 ether);
    }

    function test_Deposit() public {
        vm.prank(alice);
        vault.deposit{value: 1 ether}();
        assertEq(vault.balances(alice), 1 ether);
    }

    function test_RevertWhen_Overdrawing() public {
        vm.prank(alice);
        vm.expectRevert("Insufficient balance");
        vault.withdraw(1 ether);
    }

    function testFuzz_Deposit(uint96 amount) public {
        vm.assume(amount > 0);
        vm.deal(alice, amount);
        vm.prank(alice);
        vault.deposit{value: amount}();
        assertEq(vault.balances(alice), amount);
    }
}
```

**Step 3: Run tests — locally and forked against Apothem**

```bash
forge test
forge test -vvv                                   # verbose traces
forge test --fork-url https://rpc.apothem.network # fork live Apothem state
```

Fork testing lets you test against contracts already deployed on Apothem (tokens, DEX pairs) without spending test XDC.

## Testing Patterns

- **Arrange / Act / Assert:** Set up state in `beforeEach` (Hardhat) or `setUp()` (Foundry), perform one action, then assert on the result. One behavior per test.
- **Testing reverts:** Hardhat — `await expect(tx).to.be.revertedWith("reason")`. Foundry — `vm.expectRevert("reason")` immediately before the call.
- **Testing events:** Hardhat — `await expect(tx).to.emit(vault, "Deposit").withArgs(alice.address, amount)`. Foundry — `vm.expectEmit(true, true, true, true)` before the call.
- **Time manipulation:** Hardhat — `await network.provider.send("evm_increaseTime", [86400])` then `evm_mine`. Foundry — `vm.warp(block.timestamp + 1 days)`.
- **Balances:** Hardhat — `await ethers.provider.getBalance(addr)`. Foundry — `vm.deal(addr, amount)` to set and `addr.balance` to read.
- **Impersonation:** Foundry — `vm.prank(addr)` / `vm.startPrank(addr)`. Hardhat — `helpers.impersonateAccount` from hardhat-network-helpers.

## Coverage and Gas Snapshots

**Hardhat coverage** via `solidity-coverage`:

```bash
npm install --save-dev solidity-coverage
npx hardhat coverage
```

**Foundry coverage** is built in:

```bash
forge coverage
forge coverage --report lcov   # for CI tooling
```

**Gas reports:**

- Hardhat: enable the `hardhat-gas-reporter` plugin, which prints per-function gas costs alongside test output.
- Foundry: `forge test --gas-report` prints a table; `forge snapshot` records a baseline you can diff in CI to catch gas regressions.

Gas efficiency matters less for cost on XDC (near-zero fees) than for staying under block gas limits and keeping complex calls practical — see [Gas & Fees](/docs/learn/gas-fees) for how XDC's fee model works.

## Fuzzing and Invariant Testing

- **Foundry fuzzing:** Any `testFuzz_` function (or a `test` function with parameters) is fuzzed automatically. Tune run count in `foundry.toml`:

```toml
[fuzz]
runs = 1000
```

- **Invariant testing:** Use `invariant_` functions with a handler contract to assert properties that must hold across random call sequences (e.g., "total deposits always equal the contract balance").
- **Echidna:** For property-based testing with a dedicated fuzzer, run `echidna . --contract MyContractTest --config echidna.yaml` against properties written as `echidna_*` boolean functions.

## Testnet Rehearsal on Apothem

Before mainnet, run the full deployment lifecycle on Apothem Testnet (chain ID 51):

1. **Get test XDC** from the [Apothem faucet](https://faucet.apothem.network) — 1000 XDC per request, free.
2. **Deploy** with `npx hardhat run scripts/deploy.js --network apothem` or `forge create --rpc-url https://rpc.apothem.network --private-key $PRIVATE_KEY src/Vault.sol:Vault`.
3. **Exercise the contract** end-to-end: run your test suite against the live deployment and execute real transactions from a wallet.
4. **Verify the source** on the testnet explorer at [testnet.xdcscan.com](https://testnet.xdcscan.com) — follow [Deployment & Verification](/docs/smart-contracts/deployment-verification).
5. **Check behavior on the explorer:** confirm events, token transfers, and state read correctly before repeating the process on mainnet.

## See Also

- [Smart Contract Security Best Practices](/docs/smart-contracts/security-best-practices) — audit checklist and common vulnerabilities.
- [Deployment & Verification](/docs/smart-contracts/deployment-verification) — Remix, Hardhat, and Brownie deployment flows.
- [Porting from Ethereum to XDC](/docs/xdc-chain/evmtoxdc) — migrating existing projects, including Truffle codebases.
- [XDC FAQ — Smart Contracts](/docs/xdc-chain/faq#smart-contracts) — compiler versions, verification, and troubleshooting.
- [Gas & Fees](/docs/learn/gas-fees) — XDC's fee model and cost expectations.
