---
title: Writing Your First Contract
description: Write, compile, and understand a Solidity smart contract on XDC. Covers Solidity basics, XDC-specific considerations, and the Counter example.
---

Difficulty: Beginner | Time: ~20 minutes | Tools: Solidity 0.8.24, VS Code

# Writing Your First Contract

This guide teaches you to write a Solidity smart contract for the XDC Network. By the end, you will have a compiled `Counter` contract ready for testing and deployment.

## Prerequisites

- [Environment Setup](./setup.md) completed
- Basic understanding of programming concepts (variables, functions)

---

## Step 1 — Solidity Basics

Solidity is the primary language for EVM-compatible blockchains like XDC. Key concepts:

### Data Types

```solidity
uint256 public count;           // Unsigned integer (0 to 2^256-1)
string public message;          // Dynamic string
address public owner;           // Ethereum/XDC address
bool public isActive;           // true or false
mapping(address => uint256) public balances;  // Key-value store
```

### Functions

```solidity
// Read-only function (no gas cost)
function getCount() external view returns (uint256) {
    return count;
}

// State-changing function (costs gas)
function increment() external {
    count += 1;
}

// Payable function (can receive XDC)
function deposit() external payable {
    balances[msg.sender] += msg.value;
}
```

### Events

Events are logged to the blockchain and can be monitored by off-chain applications:

```solidity
event CountIncremented(uint256 newCount);

function increment() external {
    count += 1;
    emit CountIncremented(count);
}
```

---

## Step 2 — XDC-Specific Considerations

### Block Time

XDC has 2-second block times (vs. Ethereum's 12 seconds). This affects:

- **Time-dependent logic**: Use shorter time windows
- **Rate limiting**: Adjust for faster blocks
- **Testing**: Local tests run faster

### Gas Economics

XDC has effectively zero base fee. Key differences:

| Factor | XDC | Ethereum |
|--------|-----|----------|
| Base fee | ~0 | Variable (EIP-1559) |
| Priority fee | ~0.25 gwei | Variable |
| Block gas limit | 50M | 30M |
| Typical tx cost | ~0.0001 XDC | ~$0.50–$5 |

### Address Format

XDCScan displays addresses with `xdc` prefix. EVM tools use `0x`:

- XDCScan: `xdc1234567890abcdef1234567890abcdef12345678`
- Hardhat/Foundry: `0x1234567890abcdef1234567890abcdef12345678`

Always use `0x` format in code.

### Solidity Version

XDC supports Solidity up to 0.8.24. Use this in your contracts:

```solidity
pragma solidity ^0.8.24;
```

---

## Step 3 — Write the Counter Contract

Create `contracts/Counter.sol`:

```solidity title="contracts/Counter.sol"
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title Counter
 * @dev A simple counter contract for XDC Network
 */
contract Counter {
    uint256 public count;
    address public owner;

    event CountIncremented(uint256 newCount);
    event CountDecremented(uint256 newCount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Counter: not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        count = 0;
    }

    function increment() external {
        count += 1;
        emit CountIncremented(count);
    }

    function decrement() external {
        require(count > 0, "Counter: cannot decrement below zero");
        count -= 1;
        emit CountDecremented(count);
    }

    function reset() external onlyOwner {
        count = 0;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Counter: new owner is zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function getCount() external view returns (uint256) {
        return count;
    }
}
```

### Code Explanation

| Component | Purpose |
|-----------|---------|
| `SPDX-License-Identifier` | License for the contract |
| `pragma solidity ^0.8.24` | Solidity version constraint |
| `uint256 public count` | Public state variable |
| `address public owner` | Contract owner |
| `event` | Logged notifications |
| `modifier onlyOwner` | Access control |
| `constructor()` | Runs once at deployment |
| `increment()` | Adds 1 to count |
| `decrement()` | Subtracts 1 (with safety check) |
| `reset()` | Resets to 0 (owner only) |
| `transferOwnership()` | Changes owner |
| `getCount()` | Returns current count |

---

## Step 4 — Compile

=== "Hardhat"

    ```bash title="Terminal"
    npx hardhat compile
    ```

    **Expected output:**

    ```
    Compiled 1 Solidity file successfully (evm target: shanghai).
    ```

=== "Foundry"

    ```bash title="Terminal"
    forge build
    ```

    **Expected output:**

    ```
    [⠊] Compiling...
    [⠒] Compiling 1 files with Solc 0.8.24
    [⠢] Solc 0.8.24 finished in 1.23s
    Compiler run successful!
    ```

=== "Remix"

    1. Open [remix.xinfin.network](https://remix.xinfin.network/)
    2. Create `Counter.sol` in the contracts folder
    3. Select compiler version `0.8.24`
    4. Click **Compile**

---

## Step 5 — Understand the ABI

After compilation, an ABI (Application Binary Interface) is generated. This defines how to interact with the contract:

```json title="artifacts/contracts/Counter.sol/Counter.json (excerpt)"
{
  "abi": [
    {
      "inputs": [],
      "name": "increment",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getCount",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    }
  ]
}
```

The ABI is used by Hardhat, Foundry, and web applications to call contract functions.

---

## Common Patterns

### Access Control with OpenZeppelin

```solidity
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyContract is Ownable {
    function restrictedFunction() external onlyOwner {
        // Only owner can call
    }
}
```

### Safe Math (Solidity 0.8+)

Solidity 0.8+ has built-in overflow protection:

```solidity
function add(uint256 a, uint256 b) public pure returns (uint256) {
    return a + b;  // Reverts on overflow automatically
}
```

### Reentrancy Guard

```solidity
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract SecureContract is ReentrancyGuard {
    function withdraw() external nonReentrant {
        // Safe from reentrancy attacks
    }
}
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `ParserError` | Syntax error | Check brackets and semicolons |
| `TypeError` | Type mismatch | Ensure variables match expected types |
| `Compiler version mismatch` | Wrong pragma | Match pragma to installed compiler |
| `Identifier not found` | Missing import | Add `@openzeppelin/contracts` import |

---

## Next Steps

- [Test Your Contract →](./testing.md)
- [Deploy with Hardhat →](./hardhat.md)
- [Security Best Practices →](../security/security-practices.md)
