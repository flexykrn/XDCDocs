---
title: "Multisig Wallet Setup and Usage Guide"
sidebar_position: 13
description: Set up and use a multisignature (multisig) wallet on XDC Network for team treasuries and contract admin keys, using Safe (Gnosis Safe) contracts with Hardhat.
---

# Multisig Wallet Setup and Usage Guide

A multisignature (multisig) wallet is a smart contract wallet that requires **M of N** owner signatures before a transaction executes. For example, a 2-of-3 multisig holds funds controlled by three owner keys, and any two of them must approve a transaction before it goes through. No single key can move funds or change settings on its own.

## What Is a Multisig and When to Use One

A regular externally owned account (EOA) is a single point of failure: whoever holds the one private key controls everything, and losing the key means losing the funds. A multisig removes that single point of failure.

Use a multisig when you have:

- **Team treasuries:** Funds belonging to a project or DAO should never sit in one person's wallet. A multisig enforces collective approval for spending.
- **Contract admin keys:** Owner functions like `pause()`, `setFee()`, or upgrade authority on a proxy give total control over a contract. Putting them behind a multisig means no single compromised key can drain or brick the contract. This is a core recommendation in [Upgradeable Smart Contracts — Security Considerations](/docs/smart-contracts/upgradeable-contracts#security-considerations).
- **Shared operational accounts:** Any account where more than one person should approve actions, or where one key's loss must not be catastrophic.

## Multisig Options on XDC

The most widely used and battle-tested multisig in the EVM ecosystem is **Safe** (formerly Gnosis Safe). Because the XDC Network is fully EVM-compatible — see [Is XDC compatible with Ethereum?](/docs/xdc-chain/faq) and [Migrating from EVM to XDC](/docs/xdc-chain/evmtoxdc) — the standard Safe contracts compile and run on XDC unchanged. You can deploy the Safe singleton, proxy factory, and a Safe proxy directly with ordinary EVM tooling such as Hardhat.

:::note
At the time of writing, these docs do not document a hosted Safe web interface (safe.global) for XDC. Check with the XDC community and ecosystem listings for the current status of any hosted UI. Regardless of UI availability, the Safe **contracts** can always be deployed and driven programmatically with scripts, as shown below.
:::

Alternatives include writing a custom multisig (OpenZeppelin patterns exist) or using a threshold-signature custody service, but for most teams a Safe deployment is the standard choice.

## Deploying a Safe on Apothem with Hardhat

Always rehearse on the **Apothem testnet (Chain ID 51, RPC `https://rpc.apothem.network`)** before touching mainnet. Get free test XDC from the [faucet](https://faucet.apothem.network). The full list of endpoints is on the [RPC](/docs/xdc-chain/developers/rpc) page.

High-level steps:

1. Set up a Hardhat project configured for Apothem (`chainId: 51`, RPC above). See [Deploying Smart Contracts](/docs/smart-contracts/) for the standard setup.
2. Install the Safe contracts package: `npm install @safe-global/safe-contracts`.
3. Deploy (or reference already-deployed) the Safe singleton and `SafeProxyFactory`.
4. Call `createProxyWithNonce` on the factory with a `setup()` payload listing your owners and threshold.
5. Record the resulting Safe proxy address — that is your multisig wallet.

The following is a **simplified example skeleton** to illustrate the shape of the deployment script — adapt addresses, ABIs, and gas settings to your Safe version:

```javascript
// scripts/deploy-safe.js — EXAMPLE SKELETON, adapt before use
require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  // Owners and threshold for a 2-of-3 multisig
  const owners = [
    "0xOwner1Address00000000000000000000000001",
    "0xOwner2Address00000000000000000000000002",
    "0xOwner3Address00000000000000000000000003",
  ];
  const threshold = 2;

  // Address of the deployed Safe singleton (master copy) on this network
  const singleton = "0xSafeSingletonAddress00000000000000000000";

  const factory = await ethers.getContractAt(
    "SafeProxyFactory",
    "0xSafeProxyFactoryAddress00000000000000000"
  );

  // Encode the Safe setup() initializer
  const safeInterface = new ethers.Interface([
    "function setup(address[] owners, uint256 threshold, address to, bytes data, address fallbackHandler, address paymentToken, uint256 payment, address paymentReceiver)",
  ]);
  const initializer = safeInterface.encodeFunctionData("setup", [
    owners,
    threshold,
    ethers.ZeroAddress, // to: optional module setup call
    "0x",               // data
    ethers.ZeroAddress, // fallbackHandler
    ethers.ZeroAddress, // paymentToken
    0,                  // payment
    ethers.ZeroAddress, // paymentReceiver
  ]);

  const tx = await factory.createProxyWithNonce(singleton, initializer, Date.now());
  const receipt = await tx.wait();

  // Parse the ProxyCreation event to get the new Safe address
  console.log("Safe deployed, tx:", receipt.hash);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

Verify the deployed contracts on [testnet.xdcscan.com](https://testnet.xdcscan.com) (Apothem) or [XDCScan](https://xdcscan.com) (mainnet) following the workflow in [Deployment & Verification](/docs/smart-contracts/deployment-verification).

## Using a Multisig as Contract Owner or Admin

To protect a contract, hand its privileged role to the multisig address instead of an EOA:

```javascript
// Example: transfer ownership of an Ownable contract to the multisig
const myContract = await ethers.getContractAt("MyContract", contractAddress);
const tx = await myContract.transferOwnership(safeAddress);
await tx.wait();
```

For proxies, transfer the upgrade admin (or the proxy's owner role) to the multisig the same way.

Once the multisig is the owner, every privileged action follows the **propose → confirm → execute** flow:

1. **Propose:** One owner submits the transaction to the Safe via `submitTransaction`/`execTransaction` (or the Safe UI, if one is available for the network). This records the transaction and counts as the first confirmation.
2. **Confirm:** Other owners call `confirmTransaction` (or sign off-chain and aggregate signatures) until the threshold is reached.
3. **Execute:** Once M-of-N confirmations exist, anyone can trigger `executeTransaction` — the Safe performs the call (for example, `pause()` on your contract) as its owner.

The same flow covers plain XDC transfers, token transfers, and arbitrary contract calls, so the multisig works both as a treasury and as an admin account.

## Best Practices

- **Threshold choice:** Common configurations are **2-of-3** for small teams and **3-of-5** for larger organizations. The threshold should be high enough that no single compromised or rogue key can act, but low enough that the group can still operate if one or two keys are lost or unavailable.
- **Distribute owner keys:** Each owner key should be held by a different person, on a different device, ideally in a different physical location. Never store all owner keys in one password manager or on one laptop.
- **Use hardware wallets for signers:** Owner keys that control real funds or production contracts should live on Ledger or Trezor devices — see [Which wallets support XDC?](/docs/xdc-chain/faq#wallets--accounts).
- **Rehearse regularly:** Run drills on Apothem — propose, confirm, and execute a transaction end to end — and periodically verify every owner can still access their key. A multisig you cannot reach is as bad as a lost key.
- **Add a timelock for admin powers:** For contract admin actions, consider routing the multisig through a timelock so changes are publicly visible before execution.
- **Audit the full setup:** Multisig ownership is one layer of a security posture. Work through the [Security Best Practices & Audit Checklist](/docs/smart-contracts/security-best-practices) before mainnet.

## See Also

- [XDC Wallet guide](/docs/smart-contracts/xdc-wallet) — wallet setup and account management
- [FAQ: Wallets & Accounts](/docs/xdc-chain/faq#wallets--accounts) — supported wallets, address formats, and MetaMask setup
- [Upgradeable Smart Contracts](/docs/smart-contracts/upgradeable-contracts) — protecting upgrade authority with a multisig
- [Security Best Practices & Audit Checklist](/docs/smart-contracts/security-best-practices) — the full pre-mainnet checklist
