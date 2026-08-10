---
title: Account Abstraction (ERC-4337) and Smart Accounts
sidebar_position: 17
description: Build account abstraction on the XDC Network with ERC-4337 — UserOperations, bundlers, paymasters, smart accounts, session keys, and gas sponsorship with permissionless.js.
---

# Account Abstraction (ERC-4337) and Smart Accounts

Account abstraction replaces the "one private key controls one account" model with **smart accounts** — contracts that define their own rules for validating and executing transactions. This guide explains what ERC-4337 is, how its architecture works, its current status on the XDC Network, and how to deploy a simple smart account and sponsor user gas with a paymaster.

## Why Account Abstraction

Traditional Externally Owned Accounts (EOAs) are controlled by a single private key. Smart accounts remove that constraint:

- **Seedless onboarding:** Users can sign in with passkeys, social logins, or biometrics — no seed phrase to lose, and no single key that drains everything if leaked.
- **Gas sponsorship:** A dApp or third party pays transaction fees on the user's behalf, so new users do not need XDC before their first transaction.
- **Batched transactions:** Approve-and-swap, or multi-step DeFi flows, execute as a single atomic operation instead of multiple signed transactions.
- **Session keys:** Grant a temporary key limited permissions (specific contracts, spending caps, expiry) so a game or app can transact without prompting for every action.
- **Programmable recovery:** Social recovery, guardian-based resets, and multisig-style policies live in the account itself.

## ERC-4337 Architecture

ERC-4337 achieves account abstraction **without changing the protocol layer** — it works on any EVM chain, including XDC, using a higher-level mempool and standard contracts:

| Component | Role |
| --- | --- |
| **UserOperation** | A pseudo-transaction object describing intent: sender smart account, calldata, gas limits, fees, signature, and optional paymaster data. |
| **Bundler** | An off-chain node that collects UserOperations, simulates them, and submits them on-chain in a single `handleOps` transaction. |
| **EntryPoint** | A singleton contract that verifies and executes bundles of UserOperations. Canonical audited versions: v0.6 and v0.7. |
| **Paymaster** | A contract that agrees to pay gas for UserOperations it approves — e.g., sponsoring users or accepting ERC-20 fee payment. |
| **Account Factory** | Deploys smart account contracts deterministically (via `CREATE2`) so the account address is known before its first transaction. |

**Flow:** the user signs a UserOperation off-chain → it goes to a bundler → the bundler calls `EntryPoint.handleOps` → the EntryPoint deploys the account via the factory if needed, validates the signature (and paymaster), executes the calldata, and settles gas costs.

## Status on XDC

The XDC Network is fully EVM-compatible, so the canonical ERC-4337 contracts (EntryPoint v0.6/v0.7, account factories, paymasters) **can be deployed and will function** on XDC mainnet (chain ID 50) and Apothem testnet (chain ID 51) exactly as they do on Ethereum.

However, ERC-4337 is an ecosystem, not just contracts. Before building on XDC, verify the off-chain infrastructure:

- **No hosted bundler or paymaster service is currently documented for the XDC Network.** Do not assume providers support chain ID 50/51 — confirm directly with each provider.
- If no hosted option fits, you can **self-host an open-source bundler** (e.g., Stackup's bundler, Alchemy's Rundler, or Pimlico's Alto) pointed at an XDC RPC endpoint such as `https://rpc.xinfin.network` or `https://rpc.apothem.network`.
- You must also **deploy the EntryPoint and account factory yourself** (or verify existing deployments) since the canonical addresses on Ethereum are not automatically present on XDC.

Always test the full flow on Apothem before mainnet.

## Reference Stack

The ERC-4337 ecosystem is tooling-agnostic; the pieces below work on any EVM chain with a deployed EntryPoint:

- **Bundlers:** Stackup, Alchemy (Rundler), and Pimlico (Alto) are established bundler implementations/providers — check each for custom-chain support or run them self-hosted against XDC RPC.
- **Smart account implementations:** audited reference accounts such as the eth-infinitism SimpleAccount or Safe Wallet's 4337 module.
- **Client library:** [`permissionless.js`](https://www.npmjs.com/package/permissionless) — a TypeScript library built on viem for creating smart accounts, building UserOperations, and talking to bundlers and paymasters.

## Example: Smart Account + UserOperation with permissionless.js

The skeleton below shows the shape of the flow. It is an **illustrative example** — substitute your own deployed EntryPoint, factory, and bundler endpoint, and confirm the exact API against the permissionless.js version you install:

```javascript
// npm install permissionless viem
import { createPublicClient, http } from "viem";
import { createSmartAccountClient } from "permissionless";
import { toSimpleSmartAccount } from "permissionless/accounts";
import { privateKeyToAccount } from "viem/accounts";

// Placeholder — replace with the EntryPoint address YOU deploy/verify on XDC.
const ENTRYPOINT_ADDRESS = "0x0000000000000000000000000000000000000000";

const xdc = {
  id: 50,
  name: "XDC Network",
  nativeCurrency: { name: "XDC", symbol: "XDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.xinfin.network"] } },
};

const publicClient = createPublicClient({ chain: xdc, transport: http() });
const owner = privateKeyToAccount(process.env.PRIVATE_KEY);

// 1. Create (counterfactual) smart account via the factory.
const smartAccount = await toSimpleSmartAccount({
  client: publicClient,
  owner,
  entryPoint: { address: ENTRYPOINT_ADDRESS, version: "0.7" },
  factoryAddress: "0xYourAccountFactoryAddress", // deployed on XDC
});

// 2. Wrap it in a client pointed at your bundler.
const smartAccountClient = createSmartAccountClient({
  account: smartAccount,
  chain: xdc,
  bundlerTransport: http("https://your-bundler-endpoint.example/rpc"),
});

// 3. Send a UserOperation — the account is deployed on first use.
const userOpHash = await smartAccountClient.sendUserOperation({
  calls: [{ to: "0xRecipientAddress", value: 0n, data: "0x" }],
});
console.log("UserOperation submitted:", userOpHash);
```

Fund the account (or attach a paymaster) before its first UserOperation, and always rehearse on Apothem with the [Apothem faucet](https://faucet.apothem.network).

## Paymaster Pattern: Sponsoring Gas

A paymaster lets a dApp pay user fees, which pairs naturally with XDC's low gas costs — a standard transaction costs roughly **0.25 Gwei** per gas unit (see [Gas Fees & Optimization](/docs/learn/gas-fees)), so sponsoring users costs fractions of a cent each.

Two common patterns:

- **Verifying paymaster:** Your backend signs off on which UserOperations to sponsor (e.g., only calls to your contracts, only for allowlisted users). The paymaster contract checks the signature during validation.
- **ERC-20 paymaster:** Users pay gas in a token; the paymaster swaps it for XDC to reimburse the bundler.

Budget controls belong in the paymaster: per-user daily caps, per-operation limits, and target-contract allowlists prevent a sponsored-gas feature from becoming a drain vector.

## Security Notes

- **Signature validation is the account's job.** A smart account executes whatever its `validateUserOp` accepts. Use audited account implementations and never roll custom signature logic without review.
- **Trust the EntryPoint — and only the EntryPoint.** Accounts and paymasters should accept validation calls exclusively from the canonical EntryPoint address; anything else is a forgery vector.
- **Scope session keys tightly.** Limit them to specific target contracts and functions, cap value transferred, and set short expiries. A leaked session key should be an inconvenience, not a wallet drain.
- **Simulate before submitting.** Bundlers simulate `handleOps`; do the same client-side to catch validation failures before paying for them.
- **Paymasters hold funds.** A paymaster keeps a deposit at the EntryPoint to reimburse bundlers — secure its approval logic and monitor its balance.
- Review the full [Security Best Practices & Audit Checklist](/docs/smart-contracts/security-best-practices) before deploying accounts, factories, or paymasters to mainnet.

## See Also

- [Upgradeable Smart Contracts Guide](/docs/smart-contracts/upgradeable-contracts) — making account factories and paymasters upgradeable safely.
- [Frontend Integration](/docs/smart-contracts/frontend-integration) — connecting dApp frontends to XDC contracts.
- [Multisig on XDC](/docs/xdc-chain/developers/multisig) — multisig wallets, an adjacent account-security pattern.
- [Gas Fees & Optimization](/docs/learn/gas-fees) — XDC gas pricing used when budgeting sponsorship.
