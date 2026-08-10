---
title: XRC20 Tokens
sidebar_position: 29
description: The XRC20 fungible token standard on XDC Network — interface, OpenZeppelin implementation, allowance safety, and deployment.
---

# XRC20 Tokens

XRC20 is the fungible token standard on the XDC Network, fully compatible with Ethereum's ERC20. Because XDC is EVM-compatible, any ERC20 contract — including OpenZeppelin's audited implementations — works on XDC without modification. XRC20 tokens represent currencies, utility tokens, governance tokens, and other interchangeable assets.

## Interface Essentials

An XRC20 contract must implement the following functions and events:

```solidity
function totalSupply() external view returns (uint256);
function balanceOf(address account) external view returns (uint256);
function transfer(address to, uint256 amount) external returns (bool);
function allowance(address owner, address spender) external view returns (uint256);
function approve(address spender, uint256 amount) external returns (bool);
function transferFrom(address from, address to, uint256 amount) external returns (bool);

event Transfer(address indexed from, address indexed to, uint256 value);
event Approval(address indexed owner, address indexed spender, uint256 value);
```

## Decimals and the Allowance Pattern

- **Decimals:** XRC20 tokens are integers on-chain. The `decimals()` value (conventionally `18`, matching XDC itself) tells wallets and dApps how to render amounts. A token with 18 decimals and `totalSupply` of `10**18` displays as 1.0.
- **Allowance pattern:** Direct `transfer` moves tokens the caller owns. Third-party contracts (DEXs, lending protocols) instead use the two-step pattern: the owner calls `approve(spender, amount)`, then the spender calls `transferFrom(owner, to, amount)`, which debits the allowance.

## The Approve Race Condition

Calling `approve(spender, newAmount)` to *change* an existing non-zero allowance is unsafe: a malicious spender can front-run the second approval and spend both the old and new amounts. Mitigations:

1. Set the allowance to zero first, then set the new amount (two transactions).
2. Prefer `increaseAllowance` / `decreaseAllowance`, which adjust atomically and revert on underflow.

OpenZeppelin v5 removed `safeIncreaseAllowance`/`safeDecreaseAllowance`; use `increaseAllowance`/`decreaseAllowance` (or set the allowance to zero before a plain `approve`). Never approve more than a spender needs, and revoke unused approvals.

## Full Implementation Example

This contract mints an initial supply to the deployer, and adds owner-only minting plus holder-initiated burning via OpenZeppelin's mintable/burnable extensions:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyToken is ERC20, ERC20Burnable, Ownable {
    constructor(uint256 initialSupply)
        ERC20("MyToken", "MTK")
        Ownable(msg.sender)
    {
        _mint(msg.sender, initialSupply * 10 ** decimals());
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}
```

Key points:

- `ERC20Burnable` lets any holder destroy their own tokens via `burn`, reducing `totalSupply`.
- Owner-gated `mint` enables supply expansion; remove it (or renounce ownership) for a fixed-supply token.
- Override `decimals()` if the token needs a precision other than 18 (e.g., 6 for stablecoin-style assets).

## Deploying

- **Hardhat:** Compile and deploy this contract to Apothem or mainnet with the [Hardhat Guide](/docs/smart-contracts/hardhat-guide).
- **Testing:** Write unit tests for transfers, allowances, and access control with the [Smart Contract Testing Guide](/docs/smart-contracts/testing-guide).

## XRC20 in DeFi

XRC20 tokens integrate directly with DEXs, lending markets, and bridges in the XDC ecosystem. See [DeFi Integration](/docs/smart-contracts/defi-integration) for liquidity pools, swaps, and composability patterns.

## See Also

- [Tokens Built On XDC](/docs/smart-contracts/tokens) — overview and standard comparison
- [XRC721 Tokens](/docs/smart-contracts/xrc721-tokens)
- [XRC1155 Tokens](/docs/smart-contracts/xrc1155-tokens)
- [XRC404 Tokens](/docs/smart-contracts/xrc404-tokens)
