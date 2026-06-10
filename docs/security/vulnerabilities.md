---
title: Vulnerability Catalog
description: Common smart contract vulnerabilities aligned with SWC registry for XDC.
---

# Vulnerability Catalog

## SWC-107: Reentrancy

**Description:** External call made before state update allows recursive execution.

**XDC Impact:** 2-second block time makes reentrancy attacks execute faster.

**Example:**
```solidity
// VULNERABLE
function withdraw() external {
    (bool success, ) = msg.sender.call{value: balances[msg.sender]}("");
    require(success);
    balances[msg.sender] = 0; // State update after external call
}

// SECURE
function withdraw() external nonReentrant {
    uint256 amount = balances[msg.sender];
    require(amount > 0);
    balances[msg.sender] = 0; // State update before external call
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success);
}
```

**Mitigation:**
- Use `ReentrancyGuard` from OpenZeppelin
- Follow Checks-Effects-Interactions pattern
- Use `transfer()` or `send()` for fixed gas

## SWC-101: Integer Overflow/Underflow

**Description:** Arithmetic operation exceeds type bounds.

**XDC Impact:** Same as Ethereum — use Solidity 0.8+ built-in checks.

**Example:**
```solidity
// VULNERABLE (Solidity < 0.8)
function transfer(address to, uint256 amount) external {
    balances[msg.sender] -= amount; // Underflow if amount > balance
    balances[to] += amount;
}

// SECURE (Solidity 0.8+)
function transfer(address to, uint256 amount) external {
    require(balances[msg.sender] >= amount, "Insufficient balance");
    balances[msg.sender] -= amount;
    balances[to] += amount;
}
```

## SWC-115: Authorization Through tx.origin

**Description:** Using `tx.origin` for authorization bypasses multi-sig wallets.

**Example:**
```solidity
// VULNERABLE
function withdraw() external {
    require(tx.origin == owner, "Not owner");
    payable(msg.sender).transfer(address(this).balance);
}

// SECURE
function withdraw() external onlyOwner {
    payable(msg.sender).transfer(address(this).balance);
}
```

## SWC-100: Function Default Visibility

**Description:** Functions without explicit visibility default to `public`.

**Example:**
```solidity
// VULNERABLE
function init() { // Defaults to public
    owner = msg.sender;
}

// SECURE
function init() external {
    require(owner == address(0), "Already initialized");
    owner = msg.sender;
}
```

## XDC-Specific Vulnerabilities

### XDC-001: Chain ID Confusion

**Description:** Using wrong chain ID (1 instead of 50/51) causes signature replay or failed transactions.

**Example:**
```solidity
// VULNERABLE
bytes32 DOMAIN_SEPARATOR = keccak256(abi.encode(
    keccak256("EIP712Domain(...)"),
    keccak256(bytes(name)),
    keccak256(bytes(version)),
    1, // Ethereum mainnet
    address(this)
));

// SECURE
bytes32 DOMAIN_SEPARATOR = keccak256(abi.encode(
    keccak256("EIP712Domain(...)"),
    keccak256(bytes(name)),
    keccak256(bytes(version)),
    block.chainid, // Dynamic chain ID
    address(this)
));
```

### XDC-002: Address Format Mismatch

**Description:** Mixing `0x` and `xdc` address formats causes verification failures.

**Example:**
```javascript
// VULNERABLE
function verifyAddress(address addr) {
    // Assumes 0x prefix
    return addr.length == 42;
}

// SECURE
function verifyAddress(string memory addr) pure returns (bool) {
    bytes memory b = bytes(addr);
    if (b.length != 43) return false; // xdc + 40 hex chars
    if (b[0] != 'x' || b[1] != 'd' || b[2] != 'c') return false;
    return true;
}
```

### XDC-003: Legacy Gas Misconfiguration

**Description:** Using EIP-1559 gas parameters on XDC causes transaction failures.

**Example:**
```javascript
// VULNERABLE (EIP-1559)
const tx = await contract.someFunction({
    maxFeePerGas: ethers.utils.parseUnits("50", "gwei"),
    maxPriorityFeePerGas: ethers.utils.parseUnits("2", "gwei")
});

// SECURE (Legacy gas)
const tx = await contract.someFunction({
    gasPrice: await provider.getGasPrice(),
    gasLimit: 500000
});
```

## Vulnerability Summary Table

| SWC ID | Name | Severity | XDC Specific |
|--------|------|----------|--------------|
| SWC-107 | Reentrancy | Critical | Faster execution |
| SWC-101 | Integer Overflow | High | Use Solidity 0.8+ |
| SWC-115 | tx.origin Auth | High | Same as Ethereum |
| SWC-100 | Default Visibility | Medium | Same as Ethereum |
| XDC-001 | Chain ID Confusion | High | Use `block.chainid` |
| XDC-002 | Address Format | Medium | Validate prefix |
| XDC-003 | Legacy Gas | High | No EIP-1559 |
