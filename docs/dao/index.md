---
title: DAO Development on XDC
description: Comprehensive guide for building Decentralized Autonomous Organizations (DAOs) on XDC Network including governance tokens, voting mechanisms, treasury management, and security best practices.
---

# DAO Development on XDC

This guide provides everything needed to build, deploy, and operate Decentralized Autonomous Organizations (DAOs) on XDC Network. From governance token design to treasury management, voting mechanisms to security audits.

## Table of Contents

1. [DAO Concepts](#dao-concepts)
2. [Architecture Overview](#architecture-overview)
3. [Governance Token Design](#governance-token-design)
4. [Voting Mechanisms](#voting-mechanisms)
5. [Treasury Management](#treasury-management)
6. [Proposal Systems](#proposal-systems)
7. [Timelock and Execution](#timelock-and-execution)
8. [Tool Integration](#tool-integration)
9. [Security Best Practices](#security-best-practices)
10. [Legal and Compliance](#legal-and-compliance)
11. [Example: Building a Community DAO](#example-building-a-community-dao)
12. [Testing and Deployment](#testing-and-deployment)
13. [Related Topics](#related-topics)

---

## DAO Concepts

### What is a DAO

A Decentralized Autonomous Organization (DAO) is an entity governed by smart contracts and community voting rather than centralized leadership. On XDC Network, DAOs leverage EVM compatibility to deploy proven governance patterns with fast finality and low transaction costs.

### Key Characteristics

| Characteristic | Description | XDC Advantage |
|---------------|-------------|---------------|
| Decentralized | No single point of control | XDPoS consensus ensures fast, fair validation |
| Autonomous | Smart contracts execute decisions | 2-second finality for rapid execution |
| Transparent | All actions on-chain | Public ledger with XDCScan explorer |
| Token-Governed | Voting power through tokens | Low gas costs enable frequent participation |

### Governance Models

**Token-Based Voting**
- One token equals one vote
- Simplest model, used by most DAOs
- Risk: Plutocracy (wealth concentration)

**Quadratic Voting**
- Voting cost increases quadratically
- Formula: Cost = Votes^2
- Reduces whale dominance

**Delegated Voting**
- Token holders delegate votes to representatives
- Similar to representative democracy
- Reduces voter apathy

**Reputation-Based**
- Voting power from contributions, not wealth
- Meritocratic approach
- Harder to implement fairly

**Multi-Sig Governance**
- Predefined signers required for actions
- Useful for treasury management
- Common in early-stage DAOs

---

## Architecture Overview

### Core Components

```
DAO Architecture
|
|-- Governance Token (XRC20)
|   |-- Voting power delegation
|   |-- Balance tracking
|   |-- Transfer restrictions (optional)
|
|-- Governor Contract
|   |-- Proposal creation
|   |-- Voting logic
|   |-- Quorum calculation
|   |-- Execution scheduling
|
|-- Timelock Contract
|   |-- Delayed execution
|   |-- Emergency pause
|   |-- Cancellation logic
|
|-- Treasury Contract
|   |-- Asset management
|   |-- Spending limits
|   |-- Multi-sig requirements
|
|-- Proposal System
    |-- Discussion phase
    |-- Voting phase
    |-- Execution phase
    |-- Cancellation
```

### Component Interactions

1. **Token holders** delegate voting power or vote directly
2. **Governor** receives proposals, tracks votes, checks quorum
3. **Timelock** queues successful proposals with delay
4. **Treasury** holds assets and releases per approved proposals
5. **Executors** carry out proposal actions after timelock expires

---

## Governance Token Design

### XRC20 Governance Token

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract XDCGovernanceToken is ERC20, ERC20Votes, ERC20Permit, Ownable {
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) ERC20(name, symbol) ERC20Permit(name) Ownable(msg.sender) {
        _mint(msg.sender, initialSupply);
    }

    // Required overrides for ERC20Votes
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Votes)
    {
        super._update(from, to, value);
    }

    function nonces(address owner)
        public
        view
        override(ERC20Permit, Nonces)
        returns (uint256)
    {
        return super.nonces(owner);
    }

    // Optional: Minting controlled by governance
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    // Optional: Burn functionality
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
```

### Token Distribution Strategies

| Strategy | Allocation | Use Case |
|----------|-----------|----------|
| Fair Launch | 100% to community | Maximum decentralization |
| Team + Community | 20% team, 80% community | Balanced incentives |
| Gradual Release | Vesting over 4 years | Long-term alignment |
| Airdrop + Liquidity | 50% airdrop, 50% DEX | Rapid distribution |

### Voting Power Calculation

```solidity
// Checkpoint-based voting (prevents flash loan attacks)
function getVotes(address account) public view returns (uint256) {
    return getPastVotes(account, block.number - 1);
}

// Delegation
function delegate(address delegatee) public {
    _delegate(msg.sender, delegatee);
}
```

**Security Note:** Always use `block.number - 1` for vote snapshots to prevent manipulation within the same block.

---

## Voting Mechanisms

### OpenZeppelin Governor

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";

contract XDCGovernor is
    Governor,
    GovernorSettings,
    GovernorCountingSimple,
    GovernorVotes,
    GovernorVotesQuorumFraction,
    GovernorTimelockControl
{
    constructor(
        IVotes _token,
        TimelockController _timelock,
        uint256 _votingDelay,      // Blocks before voting starts
        uint256 _votingPeriod,     // Blocks voting remains open
        uint256 _quorumPercentage  // % of total supply required
    )
        Governor("XDCGovernor")
        GovernorSettings(
            _votingDelay,          // e.g., 1 block (~2 seconds on XDC)
            _votingPeriod,         // e.g., 50400 blocks (~1 day)
            0                      // Proposal threshold (0 tokens)
        )
        GovernorVotes(_token)
        GovernorVotesQuorumFraction(_quorumPercentage)
        GovernorTimelockControl(_timelock)
    {}

    // Required overrides
    function votingDelay()
        public
        view
        override(IGovernor, GovernorSettings)
        returns (uint256)
    {
        return super.votingDelay();
    }

    function votingPeriod()
        public
        view
        override(IGovernor, GovernorSettings)
        returns (uint256)
    {
        return super.votingPeriod();
    }

    function quorum(uint256 blockNumber)
        public
        view
        override(IGovernor, GovernorVotesQuorumFraction)
        returns (uint256)
    {
        return super.quorum(blockNumber);
    }

    function state(uint256 proposalId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (ProposalState)
    {
        return super.state(proposalId);
    }

    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) public override(Governor, IGovernor) returns (uint256) {
        return super.propose(targets, values, calldatas, description);
    }

    function _execute(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) {
        super._execute(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) returns (uint256) {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    function _executor()
        internal
        view
        override(Governor, GovernorTimelockControl)
        returns (address)
    {
        return super._executor();
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
```

### Voting Configuration for XDC

| Parameter | Mainnet Value | Testnet Value | Rationale |
|-----------|--------------|---------------|-----------|
| Voting Delay | 1 block | 1 block | 2-second finality means minimal delay |
| Voting Period | 50,400 blocks | 7,200 blocks | ~1 day mainnet, ~4 hours testnet |
| Quorum | 4% | 1% | Low enough for participation, high enough for legitimacy |
| Proposal Threshold | 100 tokens | 10 tokens | Prevents spam |
| Timelock Delay | 2 days | 1 hour | Time to review before execution |

### Advanced: Quadratic Voting Implementation

```solidity
contract QuadraticVoting {
    mapping(uint256 => mapping(address => uint256)) public votesCast;
    mapping(uint256 => uint256) public totalQuadraticVotes;

    function castQuadraticVote(
        uint256 proposalId,
        uint256 voteCount,
        bool support
    ) external {
        uint256 cost = voteCount * voteCount;
        governanceToken.transferFrom(msg.sender, address(this), cost);

        votesCast[proposalId][msg.sender] = voteCount;
        totalQuadraticVotes[proposalId] += voteCount;

        emit QuadraticVoteCast(proposalId, msg.sender, voteCount, support);
    }
}
```

---

## Treasury Management

### Treasury Contract

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract XDCTreasury is AccessControl, ReentrancyGuard {
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    // Spending limits
    mapping(address => uint256) public dailyLimits;
    mapping(address => uint256) public spentToday;
    uint256 public lastResetDay;

    // Asset tracking
    address[] public heldTokens;
    mapping(address => bool) public isTrackedToken;

    event FundsReceived(address indexed sender, uint256 amount);
    event FundsSent(address indexed token, address indexed recipient, uint256 amount);
    event LimitUpdated(address indexed token, uint256 newLimit);

    constructor(address governance) {
        _grantRole(DEFAULT_ADMIN_ROLE, governance);
        _grantRole(GOVERNANCE_ROLE, governance);
        lastResetDay = block.timestamp / 1 days;
    }

    receive() external payable {
        emit FundsReceived(msg.sender, msg.value);
    }

    // Governance-controlled spending
    function executeTransfer(
        address token,
        address recipient,
        uint256 amount
    ) external onlyRole(GOVERNANCE_ROLE) nonReentrant {
        _resetDailySpending();

        require(
            spentToday[token] + amount <= dailyLimits[token],
            "Exceeds daily limit"
        );

        spentToday[token] += amount;

        if (token == address(0)) {
            (bool success, ) = recipient.call{value: amount}("");
            require(success, "XDC transfer failed");
        } else {
            IERC20(token).transfer(recipient, amount);
        }

        emit FundsSent(token, recipient, amount);
    }

    // Guardian can pause in emergency
    function emergencyPause() external onlyRole(GUARDIAN_ROLE) {
        _pause();
    }

    function _resetDailySpending() internal {
        uint256 currentDay = block.timestamp / 1 days;
        if (currentDay > lastResetDay) {
            lastResetDay = currentDay;
            // Reset spentToday for all tracked tokens
            for (uint i = 0; i < heldTokens.length; i++) {
                spentToday[heldTokens[i]] = 0;
            }
            spentToday[address(0)] = 0;
        }
    }

    function setDailyLimit(address token, uint256 limit)
        external
        onlyRole(GOVERNANCE_ROLE)
    {
        dailyLimits[token] = limit;
        if (!isTrackedToken[token]) {
            isTrackedToken[token] = true;
            heldTokens.push(token);
        }
        emit LimitUpdated(token, limit);
    }

    function getBalance(address token) external view returns (uint256) {
        if (token == address(0)) {
            return address(this).balance;
        }
        return IERC20(token).balanceOf(address(this));
    }
}
```

### Treasury Best Practices

| Practice | Implementation | Purpose |
|----------|---------------|---------|
| Multi-sig Required | 3-of-5 signers for emergency | Prevent single-key compromise |
| Daily Limits | Cap on daily outflows | Limit damage from exploits |
| Timelock All Transfers | 48-hour delay | Community review period |
| Asset Diversification | Hold XDC, stablecoins, ETH | Reduce volatility risk |
| Regular Audits | Quarterly reviews | Catch vulnerabilities |

---

## Proposal Systems

### Proposal Lifecycle

```
1. Discussion (Off-chain)
   - Forum discussion
   - Temperature check (Snapshot)
   - Refine proposal

2. Submission (On-chain)
   - Meet proposal threshold
   - Submit to Governor
   - Pay proposal deposit (refundable)

3. Voting Period
   - Voting delay passes
   - Token holders vote
   - Track quorum

4. Execution
   - If passed: queue in timelock
   - Wait timelock delay
   - Execute actions

5. Cancellation
   - Proposer can cancel before execution
   - Guardian can cancel malicious proposals
```

### Proposal Types

| Type | Description | Example |
|------|-------------|---------|
| Parameter Change | Update protocol settings | Change quorum from 4% to 5% |
| Treasury Spend | Transfer funds | Fund development grant |
| Contract Upgrade | Replace implementation | Upgrade staking contract |
| Member Management | Add/remove roles | Add new guardian |
| Text Proposal | Non-binding signal | Community sentiment |

### Creating a Proposal

```javascript
// Using ethers.js
const governor = new ethers.Contract(governorAddress, governorABI, signer);

// Encode function call
const tokenInterface = new ethers.Interface(tokenABI);
const calldata = tokenInterface.encodeFunctionData("transfer", [
    recipientAddress,
    ethers.parseEther("1000")
]);

// Submit proposal
const tx = await governor.propose(
    [tokenAddress],           // targets
    [0],                      // values (XDC to send)
    [calldata],               // calldatas
    "Proposal #1: Fund Development Grant"  // description
);

await tx.wait();
```

---

## Timelock and Execution

### Timelock Controller

```solidity
// OpenZeppelin TimelockController
// Deploy with:
// - minDelay: 2 days (172800 seconds)
// - proposers: [Governor address]
// - executors: [Governor address, any address]
// - admin: address(0) (renounce after setup)

contract Deployment {
    function deployTimelock() external returns (address) {
        address[] memory proposers = new address[](1);
        proposers[0] = governorAddress;

        address[] memory executors = new address[](1);
        executors[0] = address(0); // Anyone can execute

        TimelockController timelock = new TimelockController(
            2 days,     // minDelay
            proposers,  // proposers
            executors,  // executors
            address(0)  // admin (renounced)
        );

        return address(timelock);
    }
}
```

### Execution Flow

```javascript
// 1. Queue (after proposal passes)
const tx = await governor.queue(
    [tokenAddress],
    [0],
    [calldata],
    descriptionHash
);

// 2. Wait for timelock delay (2 days)

// 3. Execute
const tx = await governor.execute(
    [tokenAddress],
    [0],
    [calldata],
    descriptionHash
);
```

---

## Tool Integration

### Snapshot Integration

Snapshot provides gasless voting for DAOs. Integrate with XDC:

```javascript
// snapshot-config.json
{
  "name": "XDC Community DAO",
  "network": "50",  // XDC mainnet chain ID
  "symbol": "XDCGOV",
  "strategies": [
    {
      "name": "erc20-balance-of",
      "params": {
        "address": "0x...",
        "symbol": "XDCGOV",
        "decimals": 18
      }
    }
  ],
  "members": [
    "0x..."  // Admin addresses
  ],
  "filters": {
    "minScore": 100,
    "onlyMembers": false
  }
}
```

**Setup Steps:**
1. Visit [Snapshot](https://snapshot.org/)
2. Connect wallet with XDC
3. Create space with XDC network
4. Set voting strategies
5. Link to on-chain execution

### Safe (Gnosis Safe) Multi-Sig

```javascript
// Deploy Safe on XDC
import Safe from '@safe-global/protocol-kit';

const safe = await Safe.init({
    provider: 'https://rpc.xinfin.network',
    signer: process.env.PRIVATE_KEY,
    safeAddress: predictedSafeAddress
});

// Create transaction
const safeTransaction = await safe.createTransaction({
    transactions: [{
        to: recipient,
        value: '1000000000000000000', // 1 XDC
        data: '0x'
    }]
});

// Sign and execute
const txHash = await safe.getTransactionHash(safeTransaction);
const signature = await safe.signTransactionHash(txHash);
```

### Treasury Dashboard Tools

| Tool | Purpose | Integration |
|------|---------|-------------|
| DeBank | Portfolio tracking | Read-only API |
| Zapper | Treasury overview | Contract reading |
| Llama | DAO treasury analytics | Custom subgraph |
| Dune Analytics | Custom queries | SQL on XDC data |

---

## Security Best Practices

### Smart Contract Security

| Check | Implementation | Priority |
|-------|---------------|----------|
| Reentrancy Guard | Use OpenZeppelin's modifier | Critical |
| Access Control | Role-based permissions | Critical |
| Integer Overflow | Solidity 0.8+ built-in | Critical |
| Front-running | Commit-reveal or timelock | High |
| Flash Loan Attacks | Vote snapshots at block N-1 | High |
| Governance Takeover | Quorum + timelock delays | High |

### Audit Checklist

```
Pre-Deployment:
[ ] Unit tests for all functions
[ ] Integration tests for proposal flow
[ ] Fuzzing with Echidna or Foundry
[ ] Slither static analysis
[ ] Certik/OpenZeppelin audit
[ ] Bug bounty program setup
[ ] Emergency pause tested
[ ] Upgrade path documented
```

### Common Attack Vectors

| Attack | Description | Prevention |
|--------|-------------|------------|
| Flash Loan Voting | Borrow tokens to vote, return in same block | Snapshot at block N-1 |
| Governance Takeover | Acquire majority tokens, pass malicious proposal | High quorum + timelock |
| Proposal Spam | Create many proposals to DOS | Proposal threshold + deposit |
| Vote Buying | Pay users for votes | Private voting (zk-SNARKs) |
| Sybil Attacks | Create many small accounts | Identity verification or token weight |

---

## Legal and Compliance

### Legal Structures

| Structure | Jurisdiction | Best For |
|-----------|-------------|----------|
| Swiss Association | Switzerland | Large, established DAOs |
| Cayman Islands Foundation | Cayman | Investment DAOs |
| Wyoming DAO LLC | Wyoming, USA | US-based projects |
| Marshall Islands Non-Profit | Marshall Islands | International scope |
| Unincorporated | None | Experimental, small DAOs |

### Compliance Considerations

- **Securities Laws:** Governance tokens may be securities in some jurisdictions
- **Tax:** Treasury income may be taxable
- **KYC/AML:** Required for certain treasury operations
- **Data Privacy:** Member data protection (GDPR)

### Recommended Approach

1. Start as unincorporated with multi-sig
2. Incorporate as non-profit once treasury grows
3. Consult legal counsel before token distribution
4. Document governance processes for legal clarity

---

## Example: Building a Community DAO

### Step-by-Step Deployment

**Step 1: Deploy Token**

```javascript
const tokenFactory = new ethers.ContractFactory(
    XDCGovernanceTokenABI,
    XDCGovernanceTokenBytecode,
    deployer
);

const token = await tokenFactory.deploy(
    "XDC Community Token",
    "XCT",
    ethers.parseEther("10000000") // 10M tokens
);
await token.waitForDeployment();
console.log("Token deployed:", await token.getAddress());
```

**Step 2: Deploy Timelock**

```javascript
const timelockFactory = new ethers.ContractFactory(
    TimelockControllerABI,
    TimelockControllerBytecode,
    deployer
);

const timelock = await timelockFactory.deploy(
    2 * 24 * 60 * 60, // 2 days
    [], // Proposers (will add governor later)
    [], // Executors
    deployer.address // Temporary admin
);
```

**Step 3: Deploy Governor**

```javascript
const governorFactory = new ethers.ContractFactory(
    XDCGovernorABI,
    XDCGovernorBytecode,
    deployer
);

const governor = await governorFactory.deploy(
    await token.getAddress(),
    await timelock.getAddress(),
    1,      // voting delay (1 block)
    50400,  // voting period (~1 day)
    4       // quorum (4%)
);
```

**Step 4: Configure Roles**

```javascript
// Grant governor proposer role
await timelock.grantRole(
    await timelock.PROPOSER_ROLE(),
    await governor.getAddress()
);

// Grant governor executor role
await timelock.grantRole(
    await timelock.EXECUTOR_ROLE(),
    await governor.getAddress()
);

// Renounce timelock admin (critical for decentralization)
await timelock.renounceRole(
    await timelock.TIMELOCK_ADMIN_ROLE(),
    deployer.address
);
```

**Step 5: Transfer Token Ownership**

```javascript
await token.transferOwnership(await governor.getAddress());
```

**Step 6: Distribute Tokens**

```javascript
// Airdrop to community
const airdropRecipients = [...]; // Array of addresses
const airdropAmounts = [...];    // Array of amounts

for (let i = 0; i < airdropRecipients.length; i++) {
    await token.transfer(airdropRecipients[i], airdropAmounts[i]);
}
```

---

## Testing and Deployment

### Test Suite

```javascript
// test/Governance.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("XDC Governance", function () {
    let token, governor, timelock, owner, addr1, addr2;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();

        // Deploy token
        const Token = await ethers.getContractFactory("XDCGovernanceToken");
        token = await Token.deploy("GovToken", "GOV", ethers.parseEther("1000000"));

        // Deploy timelock
        const Timelock = await ethers.getContractFactory("TimelockController");
        timelock = await Timelock.deploy(
            3600, // 1 hour min delay for testing
            [],
            [],
            owner.address
        );

        // Deploy governor
        const Governor = await ethers.getContractFactory("XDCGovernor");
        governor = await Governor.deploy(
            await token.getAddress(),
            await timelock.getAddress(),
            1,     // 1 block voting delay
            100,   // 100 blocks voting period
            4      // 4% quorum
        );

        // Setup roles
        await timelock.grantRole(await timelock.PROPOSER_ROLE(), await governor.getAddress());
        await timelock.grantRole(await timelock.EXECUTOR_ROLE(), await governor.getAddress());
    });

    it("Should create a proposal", async function () {
        const targets = [await token.getAddress()];
        const values = [0];
        const calldatas = [token.interface.encodeFunctionData("mint", [addr1.address, ethers.parseEther("1000")])];

        await expect(governor.propose(targets, values, calldatas, "Mint tokens"))
            .to.emit(governor, "ProposalCreated");
    });

    it("Should execute a successful proposal", async function () {
        // Delegate votes
        await token.delegate(owner.address);

        // Create proposal
        const targets = [await token.getAddress()];
        const values = [0];
        const calldatas = [token.interface.encodeFunctionData("mint", [addr1.address, ethers.parseEther("1000")])];
        const description = "Mint tokens to addr1";

        const tx = await governor.propose(targets, values, calldatas, description);
        const receipt = await tx.wait();
        const event = receipt.logs.find(l => l.fragment?.name === "ProposalCreated");
        const proposalId = event.args.proposalId;

        // Vote
        await governor.castVote(proposalId, 1); // 1 = For

        // Advance time past voting period
        await network.provider.send("evm_increaseTime", [3600]);
        await network.provider.send("evm_mine");

        // Queue and execute
        const descriptionHash = ethers.id(description);
        await governor.queue(targets, values, calldatas, descriptionHash);

        await network.provider.send("evm_increaseTime", [3600]); // Timelock delay
        await network.provider.send("evm_mine");

        await governor.execute(targets, values, calldatas, descriptionHash);

        expect(await token.balanceOf(addr1.address)).to.equal(ethers.parseEther("1000"));
    });
});
```

### Deployment Script

```javascript
// scripts/deploy-dao.js
const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with:", deployer.address);

    // Deploy Token
    const Token = await hre.ethers.getContractFactory("XDCGovernanceToken");
    const token = await Token.deploy("XDC Community DAO", "XCD", hre.ethers.parseEther("10000000"));
    await token.waitForDeployment();
    console.log("Token:", await token.getAddress());

    // Deploy Timelock
    const Timelock = await hre.ethers.getContractFactory("TimelockController");
    const timelock = await Timelock.deploy(
        172800, // 2 days
        [],
        [],
        deployer.address
    );
    await timelock.waitForDeployment();
    console.log("Timelock:", await timelock.getAddress());

    // Deploy Governor
    const Governor = await hre.ethers.getContractFactory("XDCGovernor");
    const governor = await Governor.deploy(
        await token.getAddress(),
        await timelock.getAddress(),
        1,
        50400,
        4
    );
    await governor.waitForDeployment();
    console.log("Governor:", await governor.getAddress());

    // Configure
    await timelock.grantRole(await timelock.PROPOSER_ROLE(), await governor.getAddress());
    await timelock.grantRole(await timelock.EXECUTOR_ROLE(), await governor.getAddress());
    await timelock.renounceRole(await timelock.TIMELOCK_ADMIN_ROLE(), deployer.address);
    await token.transferOwnership(await governor.getAddress());

    console.log("DAO deployment complete!");
}

main().catch(console.error);
```

---

## Related Topics

- [XDC Governance Overview](../xdcchain/governance/overview.md): Existing XDCDAO documentation
- [Smart Contract Development](../smartcontract/index.md): General smart contract guide
- [Security Best Practices](../security/overview.md): Security documentation
- [XRC20 Token Standard](../smartcontract/tokens/xrc20.md): Token implementation
- [Account Abstraction](../smartcontract/account-abstraction.md): Advanced wallet patterns
