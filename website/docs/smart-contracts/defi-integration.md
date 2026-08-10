---
title: DeFi Integration Guide
sidebar_position: 18
description: Build DeFi integrations on the XDC Network — XRC20 tokens, wrapped XDC, AMM swaps, liquidity provision, price reads, lending patterns, and DeFi security practices.
---

# DeFi Integration Guide: Protocols and DEX Development on XDC

The XDC Network is EVM-compatible, which means the standard DeFi building blocks — automated market makers (AMMs), liquidity pools, lending markets, and oracles — work on XDC with the same patterns and tooling used on Ethereum. This guide covers what those building blocks look like on XDC, how to interact with them, and the security practices that DeFi contracts demand.

## DeFi Building Blocks on XDC

- **XRC20 tokens:** Fungible tokens are the unit of account for all DeFi activity. Any OpenZeppelin ERC20 contract works unmodified on XDC — see [Tokens Built On XDC](/docs/smart-contracts/tokens) for the XRC20, XRC721, XRC1155, and XRC404 standards.
- **Wrapped XDC (WXDC):** Native XDC does not conform to the XRC20 interface, so DeFi protocols route XDC-denominated liquidity through a wrapped representation. WXDC is documented in the [Bridges guide](/docs/xdc-chain/developers/bridges) alongside bridged assets such as USDC (see the [USDC QuickStart](/docs/xdc-chain/developers/usdc-quickstart)).
- **Low fees and fast finality:** XDC's standard gas price is 0.25 Gwei, putting a DEX swap at roughly $0.0003–0.0006 (see [Gas & Fees](/docs/learn/gas-fees)). Combined with 2-second block times and deterministic finality, this makes frequent small swaps, rebalancing, and liquidations economically viable in a way they are not on high-fee chains.

## Ecosystem State

The XDC ecosystem documentation maintains a dedicated page for DeFi platforms at [DeFi Built On XDC](/docs/ecosystem/platforms/defi). That page is still a stub — this documentation does not currently catalog specific DEX or lending protocol deployments on XDC mainnet, so this guide does not claim any. Instead, it documents the generic integration patterns below, which apply to any Uniswap-V2-style DEX or standard DeFi protocol deployed on the network. Because XDC is EVM-equivalent, porting an existing Ethereum DeFi protocol is a compile-and-redeploy exercise; see the [Smart Contracts overview](/docs/smart-contracts) for the Solidity versions the network supports.

## Integrating Token Swaps: The AMM Pattern

Most DEXs use the **constant-product AMM** pattern: a pair contract holds reserves of two XRC20 tokens and prices trades so that `x * y = k` (minus fees). Trades route through a **router** contract, which handles approvals, multi-hop paths, and slippage bounds.

The snippet below uses ethers.js against the standard Uniswap V2 router interface. It is a generic example — it works with any DEX deployed on XDC that exposes that interface; substitute the actual router and token addresses for the DEX you integrate with:

```javascript
const { ethers } = require("ethers");

const provider = new ethers.JsonRpcProvider("https://rpc.xinfin.network");
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const ROUTER = "0xYourDexRouterAddress"; // router for the DEX on XDC
const TOKEN_IN = "0xTokenInAddress";     // XRC20 you are selling
const TOKEN_OUT = "0xTokenOutAddress";   // XRC20 you are buying

const erc20Abi = [
  "function approve(address spender, uint256 amount) returns (bool)",
];
const routerAbi = [
  "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) returns (uint[] memory amounts)",
];

async function swap() {
  const tokenIn = new ethers.Contract(TOKEN_IN, erc20Abi, wallet);
  const router = new ethers.Contract(ROUTER, routerAbi, wallet);

  const amountIn = ethers.parseUnits("100", 18);
  // Slippage protection: compute amountOutMin from a quote, never hardcode 0.
  const amountOutMin = ethers.parseUnits("95", 18);
  const deadline = Math.floor(Date.now() / 1000) + 60 * 10; // 10 minutes

  await (await tokenIn.approve(ROUTER, amountIn)).wait();
  const tx = await router.swapExactTokensForTokens(
    amountIn,
    amountOutMin,
    [TOKEN_IN, TOKEN_OUT],
    wallet.address,
    deadline
  );
  await tx.wait();
}
```

Every swap needs the `approve` step first, and both `amountOutMin` and `deadline` are mandatory protections — never omit them.

## Providing Liquidity

Liquidity providers deposit equal values of both tokens into a pair via the router's `addLiquidity` function and receive **LP tokens** representing their pool share:

```javascript
const tx = await router.addLiquidity(
  TOKEN_A,
  TOKEN_B,
  amountADesired,
  amountBDesired,
  amountAMin, // slippage bound for token A
  amountBMin, // slippage bound for token B
  wallet.address,
  deadline
);
```

LP tokens are themselves XRC20 and can be transferred, staked, or redeemed via `removeLiquidity`. Warn your users about **impermanent loss**: if the relative price of the two tokens moves after deposit, the LP position can be worth less than simply holding the tokens. The larger the price divergence, the larger the loss, and it is only recovered if prices return to the deposit ratio.

## Reading Prices: Reserves vs Oracles

You can derive a spot price from a pair contract's reserves (`getReserves()`), but a single-transaction spot price is trivially manipulable — an attacker can skew the pool, read the distorted price in the same transaction, and profit. For any contract that depends on a price (lending, minting, settlement):

- Prefer a dedicated oracle or a time-weighted average price (TWAP) over raw reserves.
- If you must read reserves, sample across multiple blocks, not within one transaction.
- Review the oracle manipulation checklist item in [Security Best Practices & Audit Checklist](/docs/smart-contracts/security-best-practices) before shipping price-dependent logic.

## Lending and Borrowing Patterns

Collateralized lending protocols share a common structure:

- **Collateralized positions:** Users deposit collateral (e.g., WXDC) and borrow another asset up to a fraction of its value — the **loan-to-value (LTV)** ratio.
- **Health factor:** A single number summarizing position safety, typically `(collateral value × liquidation threshold) / debt value`. A health factor below 1 makes the position liquidatable.
- **Liquidation threshold:** The LTV at which liquidators may repay part of the debt in exchange for discounted collateral, keeping the protocol solvent.

Liquidations depend on timely, manipulation-resistant prices — which is why lending protocols must use oracle-grade pricing rather than AMM spot reserves, and why XDC's 2-second finality and low fees make keeper-style liquidation bots practical.

## Security for DeFi

DeFi contracts custody user funds, so the stakes are higher than for ordinary dApps. Key practices:

- **Reentrancy:** Follow checks-effects-interactions and guard state-changing functions with `nonReentrant` — the [Security Best Practices](/docs/smart-contracts/security-best-practices) guide has worked vulnerable/fixed examples.
- **Oracle manipulation:** Never trust a single-block price; see the pricing section above.
- **Slippage protection and deadlines:** Every swap and liquidity function takes `amountOutMin`/`amountAMin`/`amountBMin` and a `deadline`. Passing `0` or `type(uint256).max` exposes users to sandwich attacks and stale transactions.
- **Test on Apothem first:** Rehearse the full integration — approvals, swaps, liquidity, and failure cases — against the Apothem Testnet using the [Smart Contract Testing Guide](/docs/smart-contracts/testing-guide), including fork tests against live state.

## See Also

- [Tokens Built On XDC](/docs/smart-contracts/tokens) — XRC20 and other token standards.
- [DeFi Built On XDC](/docs/ecosystem/platforms/defi) — ecosystem page for DeFi platforms.
- [Bridges](/docs/xdc-chain/developers/bridges) — WXDC and bridged assets such as USDC.
- [Security Best Practices & Audit Checklist](/docs/smart-contracts/security-best-practices) — vulnerabilities and pre-deployment checklist.
- [Smart Contract Testing Guide](/docs/smart-contracts/testing-guide) — Hardhat/Foundry setup and Apothem rehearsal.
- [Gas & Fees](/docs/learn/gas-fees) — fee model and per-operation costs.
- [XDC Chain FAQ](/docs/xdc-chain/faq) — network parameters, wrapped tokens, and troubleshooting.
