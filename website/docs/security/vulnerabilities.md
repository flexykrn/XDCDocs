---
title: Vulnerability Catalog
sidebar_position: 2
description: Common smart contract vulnerability classes on XDC with vulnerable and fixed Solidity examples — reentrancy, access control, oracle manipulation, flash loans, and more.
---

# Smart Contract Vulnerability Catalog

XDC is fully EVM-compatible, so the standard EVM vulnerability classes apply unchanged. Because gas on XDC costs a fraction of a cent, attackers can probe your deployed bytecode with thousands of transactions at near-zero cost — assume every pattern below will be tried against your contract. For secure coding habits and the pre-deployment checklist, see [Security Best Practices](/docs/smart-contracts/security-best-practices).

## Reentrancy

An external call lets an attacker re-enter your function before its state has been updated, draining funds in a loop.

**Vulnerable:**

```solidity
function withdraw(uint256 amount) public {
    require(balances[msg.sender] >= amount, "Insufficient balance");
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success, "Transfer failed");
    balances[msg.sender] -= amount;
}
```

**Fixed — checks-effects-interactions:**

```solidity
function withdraw(uint256 amount) public {
    require(balances[msg.sender] >= amount, "Insufficient balance");
    balances[msg.sender] -= amount;
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success, "Transfer failed");
}
```

For defense in depth, add OpenZeppelin's `ReentrancyGuard` (`nonReentrant`) to any function making external calls.

## Access Control

Missing authorization checks let anyone call privileged functions.

**Vulnerable:**

```solidity
function setFee(uint256 newFee) public {
    fee = newFee;
}
```

**Fixed:**

```solidity
import "@openzeppelin/contracts/access/Ownable.sol";

contract FeeManager is Ownable {
    function setFee(uint256 newFee) public onlyOwner {
        fee = newFee;
    }
}
```

Use OpenZeppelin's `AccessControl` for multi-role systems (minter, pauser, admin) instead of a single owner.

## Front-Running

Pending transactions are visible before confirmation, so bots can observe and reorder profitable operations.

- **Token sales / auctions:** use commit-reveal or batch settlement instead of first-come-first-served ordering.
- **DEX-style swaps:** always enforce a minimum output amount and a deadline.

```solidity
function swap(uint256 amountIn, uint256 minOut, uint256 deadline) external {
    require(block.timestamp <= deadline, "Expired");
    uint256 out = getAmountOut(amountIn);
    require(out >= minOut, "Slippage exceeded");
    // ...
}
```

See [MEV Protection](/docs/smart-contracts/mev-protection) for a full treatment.

## Oracle Manipulation

Reading a spot price from a single on-chain source lets an attacker skew it within one transaction — typically to over-borrow against inflated collateral or underpay during redemption.

**Vulnerable:**

```solidity
function borrow(uint256 collateralAmount) external {
    uint256 price = dexPair.getReserves(); // spot price, manipulable
    uint256 maxBorrow = collateralAmount * price / 1e18;
    // ...
}
```

**Mitigation:** use medianizers or time-weighted average prices (TWAP) across multiple sources, and sanity-bound every price feed with min/max circuit breakers.

## Flash-Loan Attacks

Flash loans give an attacker unlimited temporary capital within a single transaction, amplifying oracle manipulation, governance attacks, and arbitrage exploits.

**Mitigation:** never make critical decisions (prices, votes, withdrawals) based on state that can be altered intra-transaction; snapshot balances across blocks. See [Flash Loans](/docs/smart-contracts/flash-loans) for how these mechanics work on XDC.

## Integer Issues

Solidity 0.8.x reverts automatically on overflow and underflow — always build with 0.8.x. Do not add SafeMath or `unchecked` blocks unless you fully understand the consequences; an unjustified `unchecked` reintroduces silent wraparound.

**Vulnerable (0.8.x):**

```solidity
unchecked {
    balances[msg.sender] -= amount; // silently wraps if amount > balance
}
```

## Unchecked External Calls

Low-level calls return a boolean instead of reverting; ignoring it silently swallows failures.

**Vulnerable:**

```solidity
to.call{value: amount}("");
```

**Fixed:**

```solidity
(bool success, ) = to.call{value: amount}("");
require(success, "Payout failed");
```

## tx.origin Authorization

`tx.origin` is the account that started the transaction; `msg.sender` is the immediate caller. Authorizing on `tx.origin` lets a malicious intermediate contract phish your users.

**Vulnerable:**

```solidity
require(tx.origin == owner, "Not owner");
```

**Fixed:**

```solidity
require(msg.sender == owner, "Not owner");
```

## DoS via Gas Griefing

Unbounded loops over user-controlled arrays — or push payments to many recipients — let one bad entry block the whole function.

**Vulnerable:**

```solidity
function payAll() external {
    for (uint256 i = 0; i < payees.length; i++) {
        payees[i].transfer(amounts[i]); // one reverting payee blocks everyone
    }
}
```

**Fixed:** use pull payments — let each user withdraw their own funds.

```solidity
function withdraw() external {
    uint256 amount = pending[msg.sender];
    pending[msg.sender] = 0;
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success, "Withdraw failed");
}
```

## Signature Replay

A signed message valid on one chain or contract can be replayed elsewhere unless bound to context.

**Vulnerable:**

```solidity
bytes32 digest = keccak256(abi.encodePacked(to, amount)); // replayable anywhere
```

**Fixed:** include chain ID, contract address, and a nonce — or use EIP-712 typed data:

```solidity
bytes32 digest = keccak256(abi.encodePacked(
    block.chainid, address(this), to, amount, nonces[to]++
));
```

## Upgradeability Storage Collision

In proxy patterns, the implementation and proxy share one storage layout. Reordering, inserting, or changing variable types in an upgrade shifts every slot and corrupts state.

**Mitigation:**

- Never reorder or retype existing storage variables between upgrades — only append.
- Reserve storage gaps (`uint256[50] private __gap;`) in base contracts.
- Always call initializers; an uninitialized implementation contract can be taken over directly.
- Test upgrades against a fork of the live state before executing on mainnet.

## Cross-References

- [Security Best Practices](/docs/smart-contracts/security-best-practices) — secure development habits and the pre-deployment checklist
- [MEV Protection](/docs/smart-contracts/mev-protection) — front-running and sandwich attack defenses
- [Flash Loans](/docs/smart-contracts/flash-loans) — flash loan mechanics and risks on XDC
- [Audit Preparation](/docs/security/audit-prep) — turn this catalog into an audit-ready review
