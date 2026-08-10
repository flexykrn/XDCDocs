---
title: Foundry Guide
sidebar_position: 26
description: Build, test, deploy, and verify smart contracts on the XDC Network with Foundry — forge, cast, Solidity-native tests, fuzzing, deployment to Apothem, and XDCScan verification.
---

# Foundry Guide

Foundry is a Rust-based smart contract toolchain — `forge` for building, testing, and deploying, and `cast` for interacting with live chains. Because the XDC Network is fully EVM-compatible, Foundry works against XDC mainnet (chain ID 50) and Apothem Testnet (chain ID 51) with no XDC-specific plugins.

This guide covers installing Foundry, configuring a project for XDC, writing Solidity-native tests, deploying with `forge create`, interacting with `cast`, and verifying on the explorer.

## When to Use Foundry

Choose Foundry when you want speed (compiles and tests run in milliseconds), Solidity-native tests with built-in fuzzing and cheatcodes, and shell-friendly scripting via `forge script` and `cast`. If you prefer a JavaScript/TypeScript workflow and a larger plugin ecosystem, use [Hardhat](/docs/smart-contracts/hardhat-guide) instead.

## Install Foundry

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

`foundryup` installs and updates `forge`, `cast`, `anvil` (local node), and `chisel` (Solidity REPL). On Windows, use WSL or the prebuilt binaries from the Foundry releases page.

## Initialize a Project

```bash
forge init xdc-foundry
cd xdc-foundry
```

This scaffolds a standard layout:

- `src/` — your contracts
- `script/` — deployment and interaction scripts
- `test/` — Solidity tests
- `lib/` — dependencies (git submodules, starting with `forge-std`)
- `foundry.toml` — project configuration

## Configure foundry.toml for XDC

Define RPC endpoint aliases and pin the compiler settings. XDC Network supports Solidity up to 0.8.24:

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc_version = "0.8.24"
# XDC's precompiled/opcode support predates Shanghai; verify against a live
# node if you upgrade the toolchain — "paris" is the safe default.
evm_version = "paris"

[rpc_endpoints]
apothem = "https://rpc.apothem.network"
xdc = "https://rpc.xinfin.network"
```

With these aliases, `--rpc-url apothem` resolves to the Apothem RPC (chain ID 51) and `--rpc-url xdc` to mainnet (chain ID 50) in every `forge` and `cast` command.

## Write and Build a Contract

Create `src/Vault.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Vault {
    address public owner;
    mapping(address => uint256) public balances;

    event Deposit(address indexed from, uint256 amount);
    event Withdrawal(address indexed to, uint256 amount);

    constructor() {
        owner = msg.sender;
    }

    function deposit() external payable {
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        payable(msg.sender).transfer(amount);
        emit Withdrawal(msg.sender, amount);
    }
}
```

Build:

```bash
forge build
```

Compiled artifacts land in `out/`.

## Solidity-Native Tests

Tests live in `test/` and inherit from `forge-std/Test.sol`. Functions prefixed with `test` pass if they don't revert; `testFuzz_` functions are fuzzed automatically:

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
        vm.deal(alice, amount);
        vm.prank(alice);
        vault.deposit{value: amount}();
        assertEq(vault.balances(alice), amount);
    }
}
```

Run the suite:

```bash
forge test
forge test -vvv            # verbose traces for failing tests
forge test --gas-report    # per-function gas table
```

## Deploy to Apothem

Get free test XDC from the [Apothem faucet](https://faucet.apothem.network). Export your deployer key as an environment variable — never hardcode it or pass it on the command line where it lands in shell history:

```bash
export PRIVATE_KEY=0x...
forge create src/Vault.sol:Vault --rpc-url apothem --private-key $PRIVATE_KEY
```

Expected output:

```text
Deployer: 0xYourAddress
Deployed to: 0x1234567890abcdef1234567890abcdef12345678
Transaction hash: 0xabc...
```

## Interact with cast

`cast` reads and writes chain state from the shell:

```bash
# Read a value (balances is a public mapping getter)
cast call 0x1234...5678 "balances(address)(uint256)" 0xYourAddress --rpc-url apothem

# Send a state-changing transaction (deposit 1 XDC)
cast send 0x1234...5678 "deposit()" --value 1ether --rpc-url apothem --private-key $PRIVATE_KEY

# Check the transaction receipt
cast receipt 0xabc... --rpc-url apothem
```

## Verify on the Explorer

XDCScan's API is Blockscout-compatible, so verify with `forge verify-contract` pointed at the explorer API. Check the current endpoint URLs at https://docs.xdcscan.com/getting-started/endpoint-urls:

```bash
# Apothem
forge verify-contract 0x1234...5678 src/Vault.sol:Vault \
  --chain-id 51 \
  --verifier blockscout \
  --verifier-url https://testnet.xdcscan.com/api

# Mainnet
forge verify-contract 0x1234...5678 src/Vault.sol:Vault \
  --chain-id 50 \
  --verifier blockscout \
  --verifier-url https://xdcscan.com/api
```

If CLI verification fails, the explorer UI supports Standard Input JSON and multi-part verification — see [Deployment & Verification](/docs/smart-contracts/deployment-verification).

## Fork Testing Against Apothem

Run your test suite against live Apothem state — useful for testing integrations with contracts already deployed on the testnet, without spending test XDC:

```bash
forge test --fork-url apothem
```

For fork testing patterns, coverage, invariant testing, and a full testnet rehearsal, see the [Smart Contract Testing Guide](/docs/smart-contracts/testing-guide).

## See Also

- [Hardhat Guide](/docs/smart-contracts/hardhat-guide) — the JavaScript/TypeScript alternative.
- [Smart Contract Testing Guide](/docs/smart-contracts/testing-guide) — coverage, fuzzing, fork testing, and Apothem rehearsal.
- [CI/CD Pipelines for Smart Contract Deployment](/docs/smart-contracts/ci-cd-pipelines) — run `forge test` in GitHub Actions and gate mainnet deploys.
- [Deployment & Verification](/docs/smart-contracts/deployment-verification) — explorer verification via the UI.
- [Smart Contract Debugging Guide](/docs/smart-contracts/debugging) — cheatcodes, traces, and fork debugging.
