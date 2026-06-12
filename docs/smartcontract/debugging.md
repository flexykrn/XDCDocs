---
title: Smart Contract Debugging
description: Debug XDC smart contracts using Remix, Hardhat console.log, Tenderly, and transaction tracing. Covers common errors, gas analysis, and state inspection.
---

Difficulty: Intermediate | Time: ~20 minutes | Tools: Remix, Hardhat, Tenderly, cast

# Smart Contract Debugging Guide

Debugging smart contracts requires specialized tools and techniques. This guide covers the complete debugging workflow for XDC contracts, from local development to production incident response.

## Prerequisites

- [Environment Setup](../smartcontract/setup.md) completed
- [Hardhat Guide](../smartcontract/hardhat.md) or [Foundry Guide](../smartcontract/foundry.md) completed
- Basic understanding of transaction traces and EVM execution

---

## Debugging Tools Overview

| Tool | Best For | XDC Support |
|------|----------|-------------|
| **Remix Debugger** | Visual step-through, beginners | ✅ Full |
| **Hardhat console.log** | Quick logging, JavaScript devs | ✅ Full |
| **Tenderly** | Production monitoring, alerts | ✅ Via custom RPC |
| **cast trace** | CLI transaction tracing | ✅ Full |
| **XDCScan** | Transaction inspection, logs | ✅ Full |

---

## Remix Debugger

### Setup

1. Open [Remix IDE](https://remix.xinfin.org/)
2. Load your contract
3. Compile with optimization disabled (for clearer debugging)

### Debugging a Transaction

1. Deploy contract on Apothem Testnet
2. Execute a transaction
3. In Remix, go to **Debugger** panel
4. Paste the transaction hash
5. Click **Start debugging**

### Debugger Controls

| Button | Action |
|--------|--------|
| ⏮️ | Step back |
| ⏭️ | Step forward |
| ⏩ | Step over |
| ⏬ | Step into |
| ⏫ | Step out |

### Inspecting State

- **Solidity State**: View current variable values
- **Solidity Locals**: Local function variables
- **Call Stack**: Function call hierarchy
- **Step Detail**: Opcode-level execution info

---

## Hardhat console.log

### Installation

```bash
npm install --save-dev hardhat
```

### Using console.log

```solidity title="contracts/DebugExample.sol"
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "hardhat/console.sol";

contract DebugExample {
    function complexOperation(uint256 a, uint256 b) external pure returns (uint256) {
        console.log("Input a: %s", a);
        console.log("Input b: %s", b);
        
        uint256 intermediate = a * b;
        console.log("Intermediate: %s", intermediate);
        
        require(intermediate > 0, "Result must be positive");
        
        return intermediate;
    }
}
```

### Running with Logs

```bash title="Terminal"
npx hardhat test
```

**Output:**
```
  DebugExample
Input a: 5
Input b: 3
Intermediate: 15
    ✔ Should perform complex operation
```

### console.log Format Specifiers

| Specifier | Type | Example |
|-----------|------|---------|
| `%s` | String | `console.log("Name: %s", name)` |
| `%d` | Integer | `console.log("Count: %d", count)` |
| `%i` | Integer | `console.log("Index: %i", i)` |
| `%o` | Object | `console.log("Struct: %o", myStruct)` |

> ⚠️ **Production Warning**  
> Remove all `console.log` imports and calls before mainnet deployment. They increase gas costs and reveal internal logic.

---

## Transaction Tracing

### Using cast (Foundry)

```bash title="Terminal"
# Trace a transaction
cast trace --rpc-url https://rpc.apothem.network 0xTRANSACTION_HASH

# Detailed trace with state changes
cast run --rpc-url https://rpc.apothem.network 0xTRANSACTION_HASH
```

**Sample Output:**
```
Traces:
  [123456] DebugExample::complexOperation(5, 3)
    ├─ [0] console::log("Input a: %s", 5) [staticcall]
    ├─ [0] console::log("Input b: %s", 3) [staticcall]
    ├─ [0] console::log("Intermediate: %s", 15) [staticcall]
    └─ ← 15
```

### Using Hardhat

```javascript title="scripts/trace.js"
const hre = require("hardhat");

async function main() {
  const tx = await hre.ethers.provider.getTransaction("0xTRANSACTION_HASH");
  const receipt = await tx.wait();
  
  console.log("Gas used:", receipt.gasUsed.toString());
  console.log("Status:", receipt.status === 1 ? "Success" : "Failed");
  console.log("Logs:", receipt.logs);
}

main().catch(console.error);
```

---

## Common Errors and Solutions

### Revert Reasons

```solidity
require(balance >= amount, "Insufficient balance");
```

**How to decode:**

```bash title="Terminal"
# Using cast
cast 4byte 0x08c379a0  # Error(string) selector

# Using Hardhat
npx hardhat console
> await ethers.provider.getTransactionReceipt("0xHASH")
```

### Out of Gas

**Symptoms:**
- `out of gas` error
- Transaction fails despite sufficient balance

**Diagnosis:**
```bash
cast estimate --rpc-url https://rpc.apothem.network \
  CONTRACT_ADDRESS \
  "functionName(arg1,arg2)"
```

**Fixes:**
1. Optimize contract (remove unnecessary storage)
2. Increase gas limit in transaction
3. Break operation into smaller transactions

### Invalid Opcode

**Symptoms:**
- `invalid opcode` revert
- Usually at `assert(false)` or division by zero

**Fix:**
```solidity
// Bad
uint256 result = a / b;  // Reverts if b == 0

// Good
require(b != 0, "Cannot divide by zero");
uint256 result = a / b;
```

### Stack Too Deep

**Symptoms:**
- `stack too deep` compiler error
- Too many local variables

**Fix:**
```solidity
// Bad - too many variables
function bad() external pure returns (uint256) {
    uint256 a = 1; uint256 b = 2; uint256 c = 3;
    uint256 d = 4; uint256 e = 5; uint256 f = 6;
    uint256 g = 7; uint256 h = 8; uint256 i = 9;
    uint256 j = 10; uint256 k = 11; uint256 l = 12;
    uint256 m = 13; uint256 n = 14; uint256 o = 15;
    uint256 p = 16; uint256 q = 17;
    return a + b + c + d + e + f + g + h + i + j + k + l + m + n + o + p + q;
}

// Good - use struct or array
function good() external pure returns (uint256) {
    uint256[17] memory values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
    uint256 sum;
    for (uint256 i = 0; i < values.length; i++) {
        sum += values[i];
    }
    return sum;
}
```

---

## Gas Analysis

### Using Hardhat Gas Reporter

```bash
npm install --save-dev hardhat-gas-reporter
```

```javascript title="hardhat.config.js"
require("hardhat-gas-reporter");

module.exports = {
  gasReporter: {
    enabled: true,
    currency: "USD",
    gasPrice: 21,
    token: "XDC",
    // XDC gas price in gwei
  },
};
```

### Using Foundry Gas Snapshots

```bash title="Terminal"
# Run tests with gas reporting
forge test --gas-report

# Create snapshot
forge snapshot

# Compare with previous snapshot
forge snapshot --diff
```

---

## State Inspection

### Inspecting Contract Storage

```bash title="Terminal"
# Read specific storage slot
cast storage --rpc-url https://rpc.apothem.network CONTRACT_ADDRESS SLOT_NUMBER

# Read all storage (first 10 slots)
for i in {0..9}; do
  cast storage --rpc-url https://rpc.apothem.network CONTRACT_ADDRESS $i
done
```

### Inspecting Events

```javascript title="scripts/getEvents.js"
const hre = require("hardhat");

async function main() {
  const contract = await hre.ethers.getContractAt("MyContract", "0xADDRESS");
  
  // Query past events
  const filter = contract.filters.Transfer();
  const events = await contract.queryFilter(filter, -1000, "latest");
  
  events.forEach(event => {
    console.log(`Transfer: ${event.args.from} -> ${event.args.to}: ${event.args.amount}`);
  });
}

main().catch(console.error);
```

---

## Event Logging Patterns

### Structured Events

```solidity title="contracts/EventLogging.sol"
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract EventLogging {
    event OperationStarted(bytes32 indexed operationId, address indexed operator, uint256 timestamp);
    event OperationStep(bytes32 indexed operationId, string step, uint256 timestamp);
    event OperationCompleted(bytes32 indexed operationId, bool success, uint256 timestamp);
    
    function performOperation() external returns (bytes32) {
        bytes32 operationId = keccak256(abi.encodePacked(msg.sender, block.timestamp));
        
        emit OperationStarted(operationId, msg.sender, block.timestamp);
        
        // Step 1
        emit OperationStep(operationId, "validation", block.timestamp);
        require(msg.sender != address(0), "Invalid sender");
        
        // Step 2
        emit OperationStep(operationId, "processing", block.timestamp);
        // ... logic ...
        
        // Step 3
        emit OperationStep(operationId, "completion", block.timestamp);
        emit OperationCompleted(operationId, true, block.timestamp);
        
        return operationId;
    }
}
```

### Monitoring Events

```bash title="Terminal"
# Watch for new events
cast logs --rpc-url https://rpc.apothem.network \
  --address 0xCONTRACT_ADDRESS \
  --from-block latest \
  "OperationCompleted(bytes32,bool,uint256)"
```

---

## Performance Profiling

### Contract Size Optimization

```bash title="Terminal"
# Check contract size
npx hardhat size-contracts

# Foundry size check
forge build --sizes
```

### Memory vs Storage

```solidity
// Expensive - uses storage
function expensive(uint256[] storage arr) external {
    for (uint256 i = 0; i < arr.length; i++) {
        arr[i] = arr[i] * 2;  // SSTORE every iteration
    }
}

// Cheap - uses memory
function cheap(uint256[] calldata arr) external pure returns (uint256[] memory) {
    uint256[] memory result = new uint256[](arr.length);
    for (uint256 i = 0; i < arr.length; i++) {
        result[i] = arr[i] * 2;  // MSTORE (much cheaper)
    }
    return result;
}
```

---

## Debugging Checklist

Before asking for help or filing a bug:

- [ ] Transaction hash identified
- [ ] Network confirmed (mainnet/apothem/devnet)
- [ ] Error message captured (exact text)
- [ ] Contract source code verified on XDCScan
- [ ] Gas limit and price checked
- [ ] State at block height inspected
- [ ] Events/logs reviewed
- [ ] Minimal reproduction case created

---

## Next Steps

- [Testing Guide →](../smartcontract/testing.md) — write tests to catch bugs early
- [Hardhat Guide →](../smartcontract/hardhat.md) — development environment setup
- [Foundry Guide →](../smartcontract/foundry.md) — advanced testing and debugging
- [Security Best Practices →](../security/security-practices.md) — prevent vulnerabilities
