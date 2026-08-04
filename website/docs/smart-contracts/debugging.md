---
title: Smart Contract Debugging Guide
sidebar_position: 12
description: Debug smart contracts on the XDC Network with Hardhat, Foundry, fork testing, transaction tracing, and simulation tools — plus XDC-specific gotchas and a systematic workflow.
---

# Smart Contract Debugging Guide

Bugs are inevitable; shipping them to an immutable chain is optional. Because contracts deployed to the XDC Network cannot be patched in place, debugging discipline matters as much as testing discipline. XDC's full EVM compatibility means the standard Ethereum debugging toolchains — Hardhat traces, Foundry cheatcodes, fork testing, and `debug_trace*` RPC methods — all work against XDC mainnet (chain ID 50) and Apothem Testnet (chain ID 51).

This guide covers how to reproduce failures locally, decode revert data, trace live transactions, and avoid XDC-specific pitfalls.

## The Debugging Mindset on a Live Chain

- **There is no console on-chain.** Once a transaction is mined, you cannot add logging, pause execution, or inspect a stack frame. Everything you learn must come from the transaction's receipt, revert data, event logs, and traces.
- **Simulate before you investigate.** Reproduce the failing call locally or against a fork before touching live state. A failed mainnet transaction costs real gas and gives you exactly one artifact to study.
- **Replay, don't re-send.** Re-executing a buggy transaction on mainnet usually just burns more gas. Fork the chain at the block before the failure and replay it safely instead.
- **Work backward from the revert.** The revert reason (or its absence) tells you which class of bug you have: a logic guard tripped, an arithmetic overflow, an out-of-gas abort, or an external call failing.

## Reading Revert Data

### Custom Errors vs Revert Strings

Solidity 0.8 contracts can revert in two ways:

- **Revert strings** — `require(condition, "Insufficient balance")` ABI-encodes an `Error(string)` with the human-readable message.
- **Custom errors** — `revert InsufficientBalance(have, want)` encodes only the error selector and parameters. Cheaper on gas, but the raw revert data is opaque until you decode it.

Custom errors are common in OpenZeppelin 5.x and modern token contracts, so expect to see hex revert data like `0xfb8f41b2...` with no readable string.

### Decoding with ethers.js

Look up the 4-byte selector against your contract's error definitions:

```javascript
const { ethers } = require("ethers");

const iface = new ethers.Interface([
  "error InsufficientBalance(uint256 have, uint256 want)",
  "error Unauthorized(address caller)",
]);

try {
  await contract.withdraw(amount);
} catch (err) {
  const data = err.data ?? err.info?.error?.data;
  if (!data) throw err;

  const selector = data.slice(0, 10); // e.g. 0xfb8f41b2
  const decoded = iface.parseError(data);

  console.log("Selector:", selector);
  console.log("Error:", decoded?.name);          // InsufficientBalance
  console.log("Args:", decoded?.args);           // [have, want]
}
```

If the selector doesn't match your contract's errors, the revert came from a downstream call — check the errors of every contract your function calls. Public selector databases (e.g., openchain.xyz) can help identify unknown selectors.

## Local Debugging

### Hardhat console.log

Hardhat's `console.log` works inside Solidity and prints during test execution — the fastest way to inspect intermediate state:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "hardhat/console.sol";

contract Vault {
    mapping(address => uint256) public balances;

    function withdraw(uint256 amount) external {
        console.log("caller:", msg.sender, "amount:", amount);
        console.log("balance before:", balances[msg.sender]);
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "Transfer failed");
    }
}
```

Remove `console.sol` imports before deploying — they are development-only.

### Hardhat Stack Traces

When a test transaction reverts on the in-process Hardhat network, the error includes a Solidity stack trace pointing to the exact file and line that reverted. Run with full verbosity when the default output is too terse:

```bash
npx hardhat test --verbose
npx hardhat node --show-stack-traces
```

### Foundry Trace Output

`forge test -vvvv` prints a full call trace for every test: each internal and external call, gas consumed per call, return values, and the exact revert point:

```bash
forge test -vvvv
forge test --match-test test_Withdraw -vvvv   # trace one test only
```

Read the trace top-down until the deepest call that reverts — the indentation level shows the call depth, and `└─ ← [Revert]` lines mark where execution unwound.

## Fork Testing Against Live State

Forking runs a local EVM seeded with real chain state, so you can replay failures against the exact contracts and balances involved.

**Hardhat** — configure forking in `hardhat.config.js` or via CLI:

```javascript
networks: {
  hardhat: {
    forking: {
      url: "https://rpc.apothem.network",
      // blockNumber: 12345678,  // pin to the block before the failure
    },
  },
},
```

```bash
npx hardhat test                    # runs against the forked state
```

**Foundry** — fork directly from the CLI (consistent with the commands in the [Testing Guide](/docs/smart-contracts/testing-guide)):

```bash
forge test --fork-url https://rpc.apothem.network -vvvv
forge test --fork-url https://rpc.apothem.network --fork-block-number 12345678 -vvvv
```

Pin the block number to just before the failing transaction so you replay the exact state that caused the bug. For mainnet issues, use `https://rpc.xinfin.network` instead.

## Tracing Live Transactions

### debug_traceTransaction

The `debug_traceTransaction` RPC method replays a mined transaction and returns every opcode executed, with stack, memory, and storage at each step. The `debug_traceCall` variant traces a hypothetical call without sending it. XDC nodes expose the standard `debug` module — see the full method reference and request examples in [debug API Methods](/docs/api-reference/method-reference/debug). Use it when you have a failed transaction hash and need instruction-level detail beyond what a fork test shows.

### Explorer Inspection

Often the explorer is enough:

- Open the failed transaction on [XDCScan](https://xdcscan.com) (mainnet) or [testnet.xdcscan.com](https://testnet.xdcscan.com) (Apothem).
- Check the **status** and any decoded revert reason shown on the transaction page.
- Compare **gas used vs gas limit** — usage at or near 100% usually means out of gas, not a logic revert.
- Inspect the **event logs**: events emitted before the revert are rolled back on-chain, so their absence confirms the whole call failed.
- Trace the **internal transactions** view to see which downstream call (token transfer, delegatecall, external contract) actually reverted.

## Simulation Tools

Transaction simulation services (such as Tenderly and similar platforms) let you replay a transaction against live or forked state through a web UI, with step-through debugging, state diffs, and decoded traces — no local setup required. They are useful when:

- **The bug only reproduces on mainnet state** and you want an interactive view of the failing call.
- **You need to share a trace** with teammates or auditors as a link rather than console output.
- **You want to preview a transaction** before signing it, confirming it will succeed and produce the expected state changes.

Check whether your simulation tool of choice supports XDC Network chains before relying on it in your workflow; capabilities vary by provider.

## Common XDC Gotchas

- **`xdc`-prefixed addresses in `0x`-only tools:** XDC addresses are conventionally displayed with an `xdc` prefix, but most EVM tooling expects `0x`. Replace `xdc` with `0x` when pasting addresses into Hardhat configs, `cast`, scripts, or MetaMask. See the FAQ entry on [address prefixes](/docs/xdc-chain/faq#wallets--accounts).
- **Gas price too low on mainnet:** XDC's standard gas price is **0.25 Gwei** (see [Gas & Fees](/docs/learn/gas-fees)). Transactions priced far below this can sit pending indefinitely or be rejected by RPC nodes. If a deployment or call never mines, check the gas price before assuming a contract bug.
- **Stuck nonce:** A single low-priced pending transaction blocks all later ones from the same account. Resubmit the stuck transaction with the same nonce and a higher gas price, or cancel it. See the FAQ [Troubleshooting](/docs/xdc-chain/faq#troubleshooting) section.
- **Fork block pinning:** Public RPCs may not serve archive state for very old blocks. If a forked replay fails with missing-state errors, choose a more recent block or a different RPC endpoint.
- **Testnet/mainnet asymmetry:** Apothem (chain ID 51) mirrors mainnet, but contract addresses, oracle feeds, and liquidity differ. A passing Apothem run is necessary, not sufficient — re-validate assumptions that depend on specific deployed contracts before mainnet.

## A Systematic Debugging Workflow

1. **Reproduce locally.** Write a failing unit test in Hardhat or Foundry that triggers the bug against a fresh deployment. If you can't reproduce it, the bug depends on external state.
2. **Fork the live chain.** Replay the exact failing call against forked Apothem or mainnet state at the block just before the failure.
3. **Trace it.** Read the Foundry `-vvvv` trace, Hardhat stack trace, or `debug_traceTransaction` output to find the precise revert point and the state that caused it.
4. **Build a minimal reproduction.** Strip the failing scenario down to the smallest test that still fails — this becomes your regression test.
5. **Fix and add a regression test.** Fix the root cause, confirm the minimal reproduction now passes, and keep it in the suite permanently.
6. **Re-verify on Apothem.** Redeploy to Apothem Testnet and exercise the full user flow before touching mainnet again.

## See Also

- [Smart Contract Testing Guide](/docs/smart-contracts/testing-guide) — unit tests, fork testing, fuzzing, and Apothem rehearsal.
- [Security Best Practices & Audit Checklist](/docs/smart-contracts/security-best-practices) — common vulnerabilities and the pre-deployment checklist.
- [debug API Methods](/docs/api-reference/method-reference/debug) — `debug_traceTransaction` and related RPC reference.
- [Gas & Fees](/docs/learn/gas-fees) — XDC's fee model and standard gas prices.
- [XDC FAQ](/docs/xdc-chain/faq) — network details, troubleshooting, and common errors.
