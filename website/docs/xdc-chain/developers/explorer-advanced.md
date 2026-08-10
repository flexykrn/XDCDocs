---
title: "Advanced Explorer Usage"
sidebar_position: 19
description: "Advanced XDC explorer techniques — internal transactions, decoding event logs, auditing token approvals, watching addresses, comparing mainnet and testnet state, masternode and epoch pages, and CSV exports."
---

# Advanced Explorer Usage

The [Block Explorer Usage Guide](/docs/xdc-chain/developers/explorer-guide) covers the basics of transaction, address, and token pages. This page digs into the tabs and workflows that matter when debugging contracts, auditing tokens, or reconciling accounts.

## Reading Internal Transactions

A single transaction can trigger a chain of contract-to-contract calls that move XDC without appearing as normal transactions. Open the **Internal Txns** tab on a transaction or address page to see them:

- Each row shows the calling contract, the callee, the value moved, and the call type (`call`, `delegatecall`, `create`).
- A `Success` outer transaction can still contain failed internal calls that were caught and handled by the contract — the internal tab is the only place to see them.
- If XDC "moved" without a matching normal transaction, it almost always moved through an internal call.

Internal transactions are also queryable via the API's `txlistinternal` action — see [Explorer API Access](/docs/xdc-chain/developers/explorer-api-access).

## Decoding Event Logs

The **Logs** tab on a transaction page lists every event emitted during execution:

- For verified contracts, logs are decoded into event names and named, typed arguments.
- For unverified contracts you see raw topics and data. Topic 0 is the keccak hash of the event signature; indexed parameters occupy topics 1–3 and non-indexed parameters are packed into the data field.
- Comparing the emitted logs against what your contract *should* emit is the fastest way to find a logic bug — a missing `Transfer` event means the branch you expected never ran.

For programmatic log decoding, use `eth_getLogs` from the [JSON-RPC Reference](/docs/api-reference/json-rpc) or index them with a subgraph — see [The Graph & Subgraphs on XDC](/docs/xdc-chain/developers/subgraph-guide).

## Auditing Token Approvals

Every `approve()` you have ever signed persists until the allowance is spent or revoked. To audit an address:

1. Open the address page and filter the token-transfer view, or use the API's `tokentx` action.
2. For each XRC20 contract, use the token page's **Read Contract** tab to call `allowance(owner, spender)` for spenders you recognize (DEX routers, bridges, staking contracts).
3. Treat any unlimited (`type(uint256).max`) allowance to a contract you no longer use as exposure — revoke it by sending `approve(spender, 0)` from the token's **Write Contract** tab.

Make approval audits a habit after interacting with new contracts, and prefer exact-amount approvals over unlimited ones in your own dApps.

## Watching Addresses

Explorers let you track addresses without polling:

- Bookmark the address page; transaction lists update in near-real time.
- Logged-in watch lists (available on both XDCScan and BlocksScan) can send email notifications on incoming or outgoing activity for addresses you do not control — useful for monitoring a deployer wallet, a treasury multisig, or a contract you integrate with.
- For automated monitoring, poll the API or subscribe over WebSocket instead — see [WebSocket & Real-Time Events](/docs/xdc-chain/developers/websocket-events).

## Comparing Testnet vs Mainnet Contract State

Before promoting a deployment from Apothem to mainnet, compare the two side by side:

1. Deploy the same bytecode to Apothem and verify the source on [testnet.xdcscan.com](https://testnet.xdcscan.com).
2. Exercise the contract, then read key state variables via **Read Contract** on both [testnet.xdcscan.com](https://testnet.xdcscan.com) and [xdcscan.com](https://xdcscan.com) — constructor arguments, ownership, fee settings, token supply.
3. Diff the verified source on both networks to confirm you deployed what you think you deployed; a mismatched compiler version or optimizer setting is a red flag.

The same flow applies when debugging: if behavior differs between networks, the explorer's Read Contract tabs give you a no-code way to isolate which state variable diverged.

## Masternode and Epoch Pages

XDC's XDPoS consensus groups blocks into epochs of 900 blocks, with checkpoint blocks finalizing validator rewards. The explorer's masternode pages show:

- **Current masternode set:** The validators eligible to propose blocks, with their staked amounts and coinbase addresses.
- **Epoch views:** Per-epoch block counts, missed blocks, and reward distribution per masternode.
- **Masternode detail pages:** Signing performance and historical rewards for an individual validator.

Use these to evaluate a validator's uptime before delegating stake, or to confirm your own node stayed in the set. For how rewards are calculated and distributed, see [Rewards](/docs/xdc-chain/rewards); to run a node, see [Masternode](/docs/xdc-chain/developers/node-operators/masternode).

## CSV Export for Accounting

Address pages offer a CSV export of transaction history:

- Export normal transactions, internal transactions, and token transfers separately — each is a different CSV.
- Set explicit date or block ranges to keep exports under row limits; pull multiple files and concatenate for long histories.
- Token transfer CSVs include contract addresses, so you can split income by token in a spreadsheet.
- For anything beyond one-off reconciliation, automate with the API (`txlist`, `tokentx`) instead of manual exports — see [Explorer API Access](/docs/xdc-chain/developers/explorer-api-access).

## See Also

- [Block Explorer Usage Guide](/docs/xdc-chain/developers/explorer-guide) — explorer basics
- [Explorer API Access](/docs/xdc-chain/developers/explorer-api-access) — programmatic access
- [Rewards](/docs/xdc-chain/rewards) — epoch rewards and validator economics
- [Debugging](/docs/smart-contracts/debugging) — tracing reverted transactions
