---
title: Security Best Practices & Audit Checklist
sidebar_position: 8
---

# Smart Contract Security Best Practices & Pre-Deployment Audit Checklist

Smart contracts on the XDC Network are immutable once deployed and frequently manage real funds. A single vulnerability can lead to irreversible loss, so security must be part of the development process from day one — not an afterthought. This guide covers the most common vulnerability classes, secure development habits, testing practices, and a pre-deployment audit checklist to help you ship safer contracts on XDC.

## Why Security Matters on XDC

- **Immutability:** Once a contract is deployed to the XDC Network, its code cannot be changed. Bugs can't be patched in place — only mitigated through upgrade patterns or full redeployments.
- **Real value at stake:** Contracts custody XDC and [XRC20 tokens](/docs/smart-contracts/tokens) with real economic value. Attackers actively scan deployed bytecode for exploitable patterns.
- **Low-cost attacks:** Because gas fees on XDC are extremely low (see [Gas & Fees](/docs/learn/gas-fees)), it costs an attacker almost nothing to probe your contract with thousands of transactions.

## Common Vulnerabilities

### Reentrancy

Reentrancy occurs when an external call lets an attacker re-enter your function before its state has been updated.

**Vulnerable:**

```solidity
function withdraw(uint256 amount) public {
    require(balances[msg.sender] >= amount, "Insufficient balance");
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success, "Transfer failed");
    balances[msg.sender] -= amount;
}
```

**Fixed — checks-effects-interactions pattern:**

```solidity
function withdraw(uint256 amount) public {
    require(balances[msg.sender] >= amount, "Insufficient balance");
    balances[msg.sender] -= amount;
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success, "Transfer failed");
}
```

**Fixed — using OpenZeppelin's ReentrancyGuard:**

```solidity
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Vault is ReentrancyGuard {
    function withdraw(uint256 amount) public nonReentrant {
        // ...
    }
}
```

### Access Control

Missing or incorrect authorization checks let anyone call privileged functions.

**Vulnerable:**

```solidity
function setFee(uint256 newFee) public {
    fee = newFee;
}
```

**Fixed — using OpenZeppelin's Ownable:**

```solidity
import "@openzeppelin/contracts/access/Ownable.sol";

contract FeeManager is Ownable {
    function setFee(uint256 newFee) public onlyOwner {
        fee = newFee;
    }
}
```

For multi-role systems (minter, pauser, admin), use OpenZeppelin's `AccessControl` instead of a single owner.

### Integer Issues

Solidity 0.8 and later has built-in overflow and underflow protection — arithmetic reverts automatically. Because the XDC Network supports up to the 0.8.23 compiler version, you should always build with Solidity 0.8.x and **do not** add SafeMath libraries or `unchecked` blocks unless you fully understand the consequences.

### Front-Running

Because pending transactions are visible in the mempool, miners and bots can observe and reorder transactions. Be aware of front-running when designing:

- **Token sales and auctions:** Use commit-reveal schemes or batch settlement instead of first-come-first-served ordering on sensitive operations.
- **DEX-like logic:** Always include slippage protection (minimum output amounts and deadlines) in swap-style functions.

### Unchecked External Calls

Low-level calls (`call`, `delegatecall`, `send`) return a boolean instead of reverting. Ignoring the return value silently swallows failures.

**Vulnerable:**

```solidity
function payout(address payable to, uint256 amount) public {
    to.call{value: amount}("");
}
```

**Fixed:**

```solidity
function payout(address payable to, uint256 amount) public {
    (bool success, ) = to.call{value: amount}("");
    require(success, "Payout failed");
}
```

### tx.origin vs msg.sender

`tx.origin` is the externally owned account that started the transaction; `msg.sender` is the immediate caller. Using `tx.origin` for authorization makes your contract vulnerable to phishing through intermediate malicious contracts.

**Vulnerable:**

```solidity
function emergencyWithdraw() public {
    require(tx.origin == owner, "Not owner");
    payable(msg.sender).transfer(address(this).balance);
}
```

**Fixed:**

```solidity
function emergencyWithdraw() public {
    require(msg.sender == owner, "Not owner");
    payable(msg.sender).transfer(address(this).balance);
}
```

## Secure Development Practices

- **Pin your compiler version:** Use an exact `pragma solidity 0.8.23;` (not a floating range) so every build and verification produces identical bytecode.
- **Use audited libraries:** Build on [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts) instead of writing token, access control, and math logic from scratch.
- **Use the latest supported Solidity:** Compile with the newest version supported by the network (up to 0.8.23 on XDC) to benefit from the latest compiler security fixes.
- **Keep contracts simple:** Favor small, single-purpose contracts. Complexity is the enemy of auditability.
- **Prefer pull over push payments:** Let users withdraw funds themselves rather than pushing payments in loops, which can fail or run out of gas.
- **Emit events for state changes:** Every critical action (transfers, role changes, parameter updates) should emit an event for off-chain monitoring.
- **Fail loudly:** Use `require` for input validation, `revert` for explicit errors, and `assert` only for invariants.

## Testing Before Mainnet

- **Write unit tests:** Cover every external function, including expected failure paths. Aim for high branch coverage using Hardhat, Foundry, or Truffle.
- **Fuzz your contracts:** Use Foundry's fuzz testing (`forge test --fuzz-runs`) or Echidna to throw thousands of random inputs at your invariants.
- **Deploy to Apothem Testnet first:** Apothem (Chain ID `51`, RPC `https://rpc.apothem.network`) mirrors mainnet behavior. Get free test XDC from the [faucet](https://faucet.apothem.network) and exercise the contract end-to-end. See the [Smart Contracts FAQ](/docs/xdc-chain/faq#smart-contracts) for testnet setup details.
- **Simulate attacks:** Try to break your own contract on Apothem — reenter it, call privileged functions from unauthorized accounts, and feed it extreme values.

## Pre-Deployment Audit Checklist

Run through this checklist before deploying to XDC Mainnet (Chain ID `50`):

- [ ] **Access control:** Every privileged function is protected by `onlyOwner`, a role check, or equivalent — verified by tests from unauthorized accounts.
- [ ] **Reentrancy:** All external calls follow checks-effects-interactions and/or are guarded by `nonReentrant`.
- [ ] **External call return values:** Every low-level call's success flag is checked.
- [ ] **No tx.origin authorization:** `msg.sender` is used for all access decisions.
- [ ] **Oracle manipulation resistance:** Price feeds can't be skewed by a single transaction; consider medianizers or time-weighted averages.
- [ ] **Integer safety:** Compiled with Solidity 0.8.x; no unjustified `unchecked` blocks.
- [ ] **Front-running review:** Sensitive functions have slippage, deadline, or commit-reveal protections.
- [ ] **Upgradeability storage gaps:** Proxy/upgradeable contracts reserve storage gaps and initialize correctly (no uninitialized implementation).
- [ ] **Event emission:** All critical state changes emit events.
- [ ] **Gas limits:** No unbounded loops over user-controlled arrays; withdrawals use pull patterns.
- [ ] **Compiler pinned:** Exact Solidity version and optimizer settings recorded for verification.
- [ ] **Dependencies audited:** OpenZeppelin (or equivalent) versions are current and pinned.
- [ ] **Tests pass:** Unit, integration, and fuzz tests all pass; coverage reviewed.
- [ ] **Testnet deployment exercised:** Full user flows tested on Apothem Testnet.
- [ ] **Source verification ready:** Contract source and build metadata prepared for verification on XDCScan/BlocksScan immediately after deployment.
- [ ] **Incident plan:** Pause mechanisms, admin key custody (multisig/hardware wallet), and a response runbook are in place.

## Getting an Audit

For contracts that will hold meaningful value, commission a professional audit. Auditors typically need:

- **Frozen source code** with a pinned compiler version and build instructions.
- **Documentation** describing intended behavior, trust assumptions, and privileged roles.
- **A test suite** so auditors can run and extend your tests.
- **Deployed testnet instances** (Apothem) for live interaction.

The process usually runs: scoping and quote → manual review plus automated analysis → findings report (critical/high/medium/low) → your fixes → re-review and final report. Budget time for at least one remediation round.

After mainnet deployment, verify your contract source on [XDCScan](https://xdcscan.com/) or BlocksScan so users can read the audited code — follow the steps in [Deployment & Verification](/docs/smart-contracts/deployment-verification).

## Additional Resources

- [Deployment & Verification](/docs/smart-contracts/deployment-verification) — deploy with Remix, Hardhat, or Brownie and verify on XDCScan
- [Tokens Built On XDC](/docs/smart-contracts/tokens) — XRC20, XRC721, and XRC404 token standards
- [Smart Contracts FAQ](/docs/xdc-chain/faq#smart-contracts) — network details, faucet, and tooling answers
- [Gas & Fees](/docs/learn/gas-fees) — what deployments and contract calls cost on XDC
- [Solidity Documentation](https://docs.soliditylang.org/) — official language reference and security considerations
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts) — audited building blocks and security utilities
