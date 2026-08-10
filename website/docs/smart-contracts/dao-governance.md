---
title: DAO Tooling and Governance
sidebar_position: 19
description: Build DAOs on the XDC Network — governance patterns, OpenZeppelin Governor with timelock, the proposal lifecycle, off-chain voting options, tooling comparison, and governance security.
---

# DAO Tooling and Governance on XDC

A DAO (decentralized autonomous organization) coordinates a community's decisions and funds through smart contracts instead of a central operator. Because the XDC Network is EVM-equivalent, the standard Ethereum DAO stack — OpenZeppelin Governor, multisig wallets, and off-chain voting tools — works unchanged on XDC mainnet (chain ID 50) and Apothem testnet (chain ID 51). This guide covers how to choose a governance pattern, deploy a Governor-based DAO, run proposals through their lifecycle, and secure the system. For the XDC Network's own on-chain treasury governance, see the [XDC Governance Overview](/docs/xdc-chain/governance/overview).

## DAO Governance Patterns

Three patterns cover most DAOs deployed today:

| Pattern | How Decisions Are Made | On-Chain Enforcement | Typical Use |
| --- | --- | --- | --- |
| **Token-weighted voting** | 1 token = 1 vote; voting power snapshotted per proposal | Yes — proposals execute automatically if they pass | Protocol DAOs, treasuries, parameter changes |
| **Multisig-based** | M-of-N designated signers approve each action | Yes — the multisig executes directly | Small teams, early-stage projects, emergency councils |
| **Governor contracts** | Token-weighted voting plus proposal states, timelock, and quorum | Yes — full lifecycle enforced by contracts | Mature DAOs needing transparent, trustless execution |

Token-weighted voting is the most common model and is what OpenZeppelin Governor implements. A multisig — see [Multisig Wallets on XDC](/docs/xdc-chain/developers/multisig) — is simpler and cheaper to run, but concentrates power in the signer set and is often used as an interim measure or as the admin of an upgradeable contract. Governor contracts combine token voting with a timelock so passed proposals are publicly visible before they execute.

Many DAOs hybridize: off-chain signaling votes for temperature checks, a Governor contract for binding decisions, and a multisig for emergencies.

## OpenZeppelin Governor on XDC

The standard on-chain stack has three parts:

- **Governance token** implementing `IVotes` (e.g., `ERC20Votes`) — records checkpoints of voting power so votes are counted at a past block, not at vote time.
- **Governor** with `GovernorVotes` (plus settings/quorum extensions) — manages proposals, voting, and quorum.
- **TimelockController** — the Governor queues passed proposals here; execution is delayed, giving users time to react.

Minimal example:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract GovToken is ERC20Votes, ERC20Permit {
    constructor() ERC20("GovToken", "GOV") ERC20Permit("GovToken") {
        _mint(msg.sender, 1_000_000 ether);
    }
}
```

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";

contract MyGovernor is
    Governor,
    GovernorSettings,
    GovernorVotes,
    GovernorVotesQuorumFraction,
    GovernorTimelockControl
{
    constructor(IVotes _token, TimelockController _timelock)
        Governor("MyGovernor")
        GovernorSettings(
            7200,   /* voting delay: 1 day (XDC ~2s blocks) */
            50400,  /* voting period: 1 week */
            0       /* proposal threshold */
        )
        GovernorVotes(_token)
        GovernorVotesQuorumFraction(4) /* 4% of supply */
        GovernorTimelockControl(_timelock)
    {}

    // Required overrides omitted for brevity — the OpenZeppelin
    // wizard (wizard.openzeppelin.com) generates the full contract.
}
```

Deploy all three contracts to Apothem (chain ID 51, RPC `https://rpc.apothem.network`) for a full rehearsal before mainnet — fund the deployer from the [Apothem faucet](https://faucet.apothem.network), then follow the flow in [Deployment & Verification](/docs/smart-contracts/deployment-verification). Note that XDC's ~2-second block time means Governor parameters expressed in blocks are much shorter in wall-clock time than the same values on Ethereum — compute delays and periods accordingly, or use a timestamp-based Governor variant.

## Proposal Lifecycle

A Governor proposal moves through four phases: **propose** → **vote** → **queue** → **execute**. The timelock sits between queue and execute, enforcing the delay.

```javascript
const { ethers } = require("hardhat");

async function main() {
  const governor = await ethers.getContractAt("MyGovernor", GOVERNOR_ADDRESS);
  const token = await ethers.getContractAt("GovToken", TOKEN_ADDRESS);

  // 1. Propose: transfer 100 GOV from the timelock treasury
  const targets = [TOKEN_ADDRESS];
  const values = [0];
  const calldatas = [
    token.interface.encodeFunctionData("transfer", [RECIPIENT, ethers.parseEther("100")]),
  ];
  const description = "Proposal #1: Fund the grants program";
  const tx = await governor.propose(targets, values, calldatas, description);
  const receipt = await tx.wait();

  const proposalId = receipt.logs
    .map((log) => governor.interface.parseLog(log))
    .find((parsed) => parsed && parsed.name === "ProposalCreated").args.proposalId;

  // 2. Vote: 0 = Against, 1 = For, 2 = Abstain
  await governor.castVote(proposalId, 1);

  // 3. After the voting period ends and the proposal passes, queue it
  const descriptionHash = ethers.id(description);
  await governor.queue(targets, values, calldatas, descriptionHash);

  // 4. After the timelock delay, anyone can execute
  await governor.execute(targets, values, calldatas, descriptionHash);
}

main();
```

Token holders must call `delegate()` (including to themselves) before voting power counts — delegation is what activates checkpoints in `ERC20Votes`.

## Off-Chain Voting

For signaling and temperature checks, DAOs commonly vote off-chain to avoid gas costs per vote. The widely used option is **Snapshot** (snapshot.org), which records signed messages and counts voting power at a chosen block. Snapshot does not list XDC as a preconfigured network; using it with XDC requires adding the XDC network configuration (chain ID 50/51 and an RPC endpoint) to your space setup. Because votes are off-chain, results are not self-executing — a multisig or Governor contract must carry out the decision on-chain, which is why off-chain voting suits signaling rather than treasury control.

## Choosing Your Tooling

| Tool | Execution | Cost per Vote | Trust Model | When to Use |
| --- | --- | --- | --- | --- |
| **OpenZeppelin Governor + Timelock** | Automatic on-chain | Gas (low on XDC) | Trustless — contracts enforce outcomes | Binding decisions: treasury spends, parameter changes, upgrades |
| **Multisig** | Signers execute manually | One transaction per action | Trust in the M-of-N signer set | Small teams, emergency powers, admin for upgradeable contracts |
| **Snapshot (off-chain)** | None — manual follow-through | Gasless | Trust in whoever executes the result | Temperature checks, sentiment polls, high-frequency community input |

## XDC Network Governance Context

The XDC Network operates its own governance through XDCDAO and an on-chain DAO Treasury that funds protocol enhancements, community projects, security, and ecosystem growth. If you are participating in network-level governance rather than building your own DAO, start with the [XDC Governance Overview](/docs/xdc-chain/governance/overview).

## Security Considerations

- **Flash-loan voting defense:** Never count voting power from current balances at vote time — an attacker can borrow tokens, vote, and repay in one transaction. Snapshot-based voting power (`ERC20Votes` checkpoints, as used by `GovernorVotes`) fixes power at the proposal's snapshot block, before any voter knows the proposal exists.
- **Timelock necessity:** A Governor without a timelock can execute a malicious proposal the moment voting ends. The delay lets users exit positions or react before execution. Apply the same rule to multisigs that hold admin or upgrade keys.
- **Quorum tuning:** Too low, and a small motivated group captures the DAO; too high, and nothing passes. Start around 4–10% of supply, and set a proposal threshold so spam proposals cannot be created cheaply.
- **Parameter sanity on XDC:** With ~2-second blocks, block-based delays and periods are roughly 6x shorter per block count than on Ethereum — verify wall-clock durations before deploying.
- Review the full [Security Best Practices & Audit Checklist](/docs/smart-contracts/security-best-practices) before deploying governance contracts that control real funds.

## See Also

- [XDC Governance Overview](/docs/xdc-chain/governance/overview) — the network's own DAO Treasury governance.
- [Multisig Wallets on XDC](/docs/xdc-chain/developers/multisig) — multisig setup for DAO treasuries and admin keys.
- [Tokens on XDC](/docs/smart-contracts/tokens) — deploying ERC-20 tokens, the basis of voting power.
- [Security Best Practices & Audit Checklist](/docs/smart-contracts/security-best-practices) — pre-deployment security review.
- [Upgradeable Smart Contracts Guide](/docs/smart-contracts/upgradeable-contracts) — making Governor-controlled contracts upgradeable.
- [Deployment & Verification](/docs/smart-contracts/deployment-verification) — deploying and verifying on Apothem and mainnet.
