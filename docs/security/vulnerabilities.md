# Vulnerability Catalog

This catalog documents common smart contract vulnerabilities specific to the XDC Network ecosystem. Each entry includes severity classification, XDC-specific risk factors, vulnerable code examples, secure implementations, and prevention strategies.

---

## Severity Classifications

| Severity | Description | Response Time |
|----------|-------------|---------------|
| Critical | Direct fund loss, complete system compromise | Immediate |
| High | Significant fund risk, partial system compromise | 24 hours |
| Medium | Limited impact, requires specific conditions | 7 days |
| Low | Information disclosure, minor deviations | 30 days |
| Informational | Best practice violations, code quality | Next release |

---

## Critical Vulnerabilities

### 1. Reentrancy

**Severity:** Critical  
**XDC Risk:** High — 2-second block time enables faster reentrancy cycles than Ethereum's 12-second blocks.

**Description:**  
Reentrancy occurs when a contract makes an external call to another contract before updating its own state. The called contract can then recursively call back into the original contract, exploiting the outdated state.

**Vulnerable Code:**
```solidity
function withdraw() external {
    uint256 amount = balances[msg.sender];
    require(amount > 0, "No balance");
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success, "Transfer failed");
    balances[msg.sender] = 0;  // State updated AFTER external call
}
```

**Attack Flow:**
1. Attacker deposits 1 XDC
2. Attacker calls `withdraw()`
3. Contract sends 1 XDC via external call
4. Attacker's fallback function calls `withdraw()` again
5. `balances[msg.sender]` is still 1 (not yet updated)
6. Process repeats until contract is drained

**Secure Implementation:**
```solidity
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract SecureVault is ReentrancyGuard {
    mapping(address => uint256) public balances;
    
    function withdraw() external nonReentrant {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "No balance");
        
        balances[msg.sender] = 0;  // Effect FIRST (Checks-Effects-Interactions)
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
    }
}
```

**XDC-Specific Considerations:**
- XDC's faster block time means more reentrancy attempts can fit in a single block
- Use OpenZeppelin's `ReentrancyGuard` for all functions sending native XDC
- Consider pull-over-push patterns for fund distribution
- Test with tools like Echidna configured for 2-second block times

**Prevention:**
- Always follow Checks-Effects-Interactions pattern
- Use `nonReentrant` modifier from OpenZeppelin
- Update state before external calls
- Implement pull-over-push for withdrawals

---

### 2. Access Control Failures

**Severity:** Critical  
**XDC Risk:** High — Enterprise trade finance contracts often manage large values.

**Description:**  
Missing or incorrect access control allows unauthorized users to execute privileged functions, potentially draining funds or modifying critical parameters.

**Vulnerable Code:**
```solidity
contract Token {
    mapping(address => uint256) public balances;
    
    function mint(address to, uint256 amount) external {
        // No access control — anyone can mint
        balances[to] += amount;
    }
    
    function setOwner(address newOwner) external {
        // No validation — anyone can change owner
        owner = newOwner;
    }
}
```

**Secure Implementation:**
```solidity
import "@openzeppelin/contracts/access/AccessControl.sol";

contract SecureToken is AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }
    
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }
    
    function grantMinterRole(address account) external onlyRole(ADMIN_ROLE) {
        _grantRole(MINTER_ROLE, account);
    }
}
```

**XDC-Specific Considerations:**
- Use `AccessControl` instead of simple `Ownable` for enterprise contracts
- Implement role-based permissions for multi-party trade finance workflows
- Consider timelocks for critical parameter changes
- Document all privileged roles in audit materials

**Prevention:**
- Use OpenZeppelin's `AccessControl` or `Ownable2Step`
- Validate all function callers
- Implement multi-sig for critical operations
- Regular access control audits

---

### 3. Oracle Manipulation

**Severity:** Critical  
**XDC Risk:** High — Low-liquidity DEX pairs on XDC are easier to manipulate.

**Description:**  
Contracts relying on single-source price feeds can be exploited by attackers who temporarily manipulate the oracle price.

**Vulnerable Code:**
```solidity
contract LendingPool {
    function getCollateralValue(address user) external view returns (uint256) {
        uint256 price = dex.getSpotPrice();  // Single source, manipulable
        return collateral[user] * price;
    }
}
```

**Secure Implementation:**
```solidity
contract SecureLendingPool {
    IPriceOracle public oracle;
    uint256 public constant MAX_PRICE_DEVIATION = 10; // 10%
    
    function getCollateralValue(address user) external view returns (uint256) {
        uint256 twapPrice = oracle.getTWAP(30 minutes);
        uint256 spotPrice = oracle.getSpotPrice();
        
        // Validate spot price against TWAP
        uint256 deviation = _calculateDeviation(spotPrice, twapPrice);
        require(deviation <= MAX_PRICE_DEVIATION, "Price manipulation detected");
        
        return collateral[user] * twapPrice;
    }
}
```

**XDC-Specific Considerations:**
- XDC DEX liquidity may be lower than Ethereum mainnet
- Use Chainlink oracles where available
- Implement TWAP with minimum 30-minute window
- Consider multi-source price validation

**Prevention:**
- Use decentralized oracle networks (Chainlink)
- Implement TWAP mechanisms
- Add price deviation checks
- Use multiple independent price sources

---

## High-Severity Vulnerabilities

### 4. Integer Overflow/Underflow

**Severity:** High (pre-Solidity 0.8) / Medium (0.8+)  
**XDC Risk:** Standard — same as Ethereum.

**Description:**  
Arithmetic operations that exceed the maximum or minimum value of a data type, causing unexpected wrap-around behavior.

**Vulnerable Code (Solidity < 0.8):**
```solidity
function add(uint256 a, uint256 b) public pure returns (uint256) {
    return a + b;  // Silently overflows
}

function subtract(uint256 a, uint256 b) public pure returns (uint256) {
    return a - b;  // Silently underflows
}
```

**Secure Implementation:**
```solidity
// Solidity 0.8+ — built-in overflow checks
function add(uint256 a, uint256 b) public pure returns (uint256) {
    return a + b;  // Reverts on overflow
}

// Explicit checks for older versions
function safeAdd(uint256 a, uint256 b) internal pure returns (uint256) {
    uint256 c = a + b;
    require(c >= a, "Overflow");
    return c;
}
```

**XDC-Specific Considerations:**
- XDC supports Solidity 0.8.23+ on mainnet
- Use latest stable Solidity version for built-in protection
- Audit legacy contracts using SafeMath

**Prevention:**
- Use Solidity 0.8+ for built-in checks
- Use SafeMath for older versions
- Validate all arithmetic inputs
- Consider using checked math libraries

---

### 5. Unchecked External Calls

**Severity:** High  
**XDC Risk:** Standard.

**Description:**  
Low-level calls that don't verify return values can fail silently, leading to inconsistent state.

**Vulnerable Code:**
```solidity
function sendXDC(address payable recipient, uint256 amount) external {
    recipient.call{value: amount}("");  // Return value ignored
    // Contract assumes transfer succeeded
    balances[recipient] -= amount;
}
```

**Secure Implementation:**
```solidity
function sendXDC(address payable recipient, uint256 amount) external {
    (bool success, ) = recipient.call{value: amount}("");
    require(success, "XDC transfer failed");
    balances[recipient] -= amount;
}

// Even better: use transfer for reentrancy-safe sends
function sendXDCSafe(address payable recipient, uint256 amount) external {
    require(balances[recipient] >= amount, "Insufficient balance");
    balances[recipient] -= amount;
    recipient.transfer(amount);  // 2300 gas limit prevents reentrancy
}
```

**Prevention:**
- Always check return values of external calls
- Use `transfer()` instead of `call()` when possible
- Implement proper error handling
- Consider using OpenZeppelin's `Address` library

---

### 6. Front-Running

**Severity:** High  
**XDC Risk:** Medium-High — XDPoS validator rotation is more predictable than Ethereum's random beacon.

**Description:**  
Attackers observe pending transactions and place their own transactions with higher gas prices to execute first.

**Vulnerable Code:**
```solidity
contract DEX {
    function updatePrice(uint256 newPrice) external {
        currentPrice = newPrice;  // Immediately visible
    }
}
```

**Secure Implementation:**
```solidity
contract SecureDEX {
    mapping(address => bytes32) public commitments;
    mapping(address => uint256) public revealTimestamps;
    
    function commit(bytes32 hash) external {
        commitments[msg.sender] = hash;
        revealTimestamps[msg.sender] = block.timestamp + 1 hours;
    }
    
    function reveal(uint256 newPrice, bytes32 secret) external {
        require(block.timestamp >= revealTimestamps[msg.sender], "Too early");
        require(keccak256(abi.encodePacked(newPrice, secret)) == commitments[msg.sender], "Invalid reveal");
        currentPrice = newPrice;
        delete commitments[msg.sender];
    }
}
```

**XDC-Specific Considerations:**
- XDPoS proposer selection follows round-robin pattern
- Use commit-reveal for sensitive operations
- Consider batch auctions instead of continuous trading
- Implement slippage protection for DEX operations

**Prevention:**
- Use commit-reveal patterns
- Implement slippage limits
- Consider batch processing
- Use private transaction pools where available

---

## Medium-Severity Vulnerabilities

### 7. Timestamp Dependence

**Severity:** Medium  
**XDC Risk:** Medium — 2-second blocks make `block.timestamp` more granular but still manipulable.

**Description:**  
Using `block.timestamp` for critical logic can be manipulated by validators within a small window.

**Vulnerable Code:**
```solidity
function isExpired() external view returns (bool) {
    return block.timestamp > deadline;  // Miner can manipulate slightly
}
```

**Secure Implementation:**
```solidity
function isExpired() external view returns (bool) {
    // Add small buffer for timestamp manipulation
    return block.timestamp >= deadline + 2;  // 2-second buffer
}

// Better: use block.number for time-sensitive operations
function isExpiredByBlock() external view returns (bool) {
    return block.number >= deadlineBlock;
}
```

**Prevention:**
- Avoid timestamp for critical randomness
- Use block numbers for time periods
- Add buffers for timestamp-dependent logic
- Document timestamp sensitivity

---

### 8. Denial of Service via Gas Limits

**Severity:** High  
**XDC Risk:** Medium — 50M block gas limit is higher than Ethereum, but unbounded loops are still dangerous.

**Description:**  
Functions with unbounded loops can exceed block gas limits, making them permanently unusable.

**Vulnerable Code:**
```solidity
function payoutAll() external {
    for (uint256 i = 0; i < recipients.length; i++) {
        recipients[i].transfer(amounts[i]);  // Unbounded loop
    }
}
```

**Secure Implementation:**
```solidity
function payout(uint256 start, uint256 end) external {
    require(end <= recipients.length, "Out of bounds");
    require(end - start <= 100, "Batch too large");  // Limit batch size
    
    for (uint256 i = start; i < end; i++) {
        recipients[i].transfer(amounts[i]);
    }
}

function payoutAll() external {
    uint256 batchSize = 100;
    for (uint256 i = 0; i < recipients.length; i += batchSize) {
        uint256 end = i + batchSize;
        if (end > recipients.length) end = recipients.length;
        payout(i, end);
    }
}
```

**Prevention:**
- Avoid unbounded loops
- Implement pagination for large datasets
- Test with maximum expected data sizes
- Monitor gas usage during development

---

### 9. Delegatecall Injection

**Severity:** Critical  
**XDC Risk:** Standard.

**Description:**  
`delegatecall` executes code in the context of the calling contract, potentially allowing attackers to modify the caller's storage.

**Vulnerable Code:**
```solidity
function execute(address target, bytes memory data) external {
    target.delegatecall(data);  // No validation on target
}
```

**Secure Implementation:**
```solidity
contract SecureProxy {
    mapping(address => bool) public allowedTargets;
    address public admin;
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }
    
    function execute(address target, bytes memory data) external onlyAdmin {
        require(allowedTargets[target], "Target not allowed");
        (bool success, ) = target.delegatecall(data);
        require(success, "Delegatecall failed");
    }
    
    function addAllowedTarget(address target) external onlyAdmin {
        allowedTargets[target] = true;
    }
}
```

**Prevention:**
- Whitelist delegatecall targets
- Use proxy patterns from OpenZeppelin
- Validate all delegatecall destinations
- Implement proper access control

---

### 10. Signature Replay

**Severity:** High  
**XDC Risk:** Standard.

**Description:**  
Signatures can be replayed across different chains or contract instances if not properly protected.

**Vulnerable Code:**
```solidity
function claimWithSig(address user, uint256 amount, bytes memory sig) external {
    require(verifySig(user, amount, sig), "Invalid sig");
    balances[user] -= amount;
    // Same sig can be replayed on another chain or after contract upgrade
}
```

**Secure Implementation:**
```solidity
contract SecureClaims {
    bytes32 public immutable DOMAIN_SEPARATOR;
    mapping(uint256 => bool) public usedNonces;
    
    constructor() {
        DOMAIN_SEPARATOR = keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256(bytes("XDCClaims")),
            keccak256(bytes("1")),
            block.chainid,
            address(this)
        ));
    }
    
    function claimWithSig(address user, uint256 amount, uint256 nonce, bytes memory sig) external {
        require(!usedNonces[nonce], "Nonce used");
        
        bytes32 digest = keccak256(abi.encodePacked(
            "\x19\x01",
            DOMAIN_SEPARATOR,
            keccak256(abi.encode(user, amount, nonce))
        ));
        
        require(recoverSigner(digest, sig) == signer, "Invalid sig");
        usedNonces[nonce] = true;
        balances[user] -= amount;
    }
}
```

**Prevention:**
- Use EIP-712 typed data signing
- Include chain ID in signatures
- Implement nonce tracking
- Use domain separators

---

## Low-Severity Vulnerabilities

### 11. Storage Collision in Proxies

**Severity:** Critical (in proxy patterns)  
**XDC Risk:** Standard.

**Description:**  
Upgradeable proxy contracts can have storage layout collisions between proxy and implementation contracts.

**Vulnerable Code:**
```solidity
contract Proxy {
    address public implementation;  // Slot 0
    // ... fallback delegates to implementation
}

contract Logic {
    uint256 public counter;  // Also slot 0 — collision!
}
```

**Secure Implementation:**
```solidity
contract Logic {
    bytes32 private constant COUNTER_SLOT = keccak256("logic.counter");
    
    function getCounter() public view returns (uint256) {
        bytes32 slot = COUNTER_SLOT;
        uint256 value;
        assembly { value := sload(slot) }
        return value;
    }
    
    function setCounter(uint256 value) internal {
        bytes32 slot = COUNTER_SLOT;
        assembly { sstore(slot, value) }
    }
}
```

**Prevention:**
- Use OpenZeppelin's proxy patterns
- Implement unstructured storage
- Audit storage layouts
- Use storage gaps for future upgrades

---

### 12. Selfdestruct / SELFDESTRUCT

**Severity:** High  
**XDC Risk:** Standard.

**Description:**  
`selfdestruct` removes contract code and sends remaining balance to a specified address, which can be used maliciously.

**Vulnerable Code:**
```solidity
function emergencyExit() external onlyOwner {
    selfdestruct(payable(owner()));  // Removes contract + sends balance
}
```

**Secure Implementation:**
```solidity
contract SecureContract {
    bool public paused;
    
    function pause() external onlyOwner {
        paused = true;
    }
    
    function withdraw() external onlyOwner whenPaused {
        payable(owner()).transfer(address(this).balance);
    }
    
    modifier whenPaused() {
        require(paused, "Not paused");
        _;
    }
}
```

**Prevention:**
- Use pause + withdrawal patterns
- Avoid selfdestruct in production
- Implement proper fund recovery mechanisms
- Document emergency procedures

---

## Vulnerability Assessment Framework

When assessing smart contracts on XDC, use this systematic approach:

### Phase 1: Automated Scanning
1. Run Slither with XDC-specific configuration
2. Execute Mythril symbolic analysis
3. Perform Echidna property-based testing
4. Check for known vulnerability patterns

### Phase 2: Manual Review
1. Verify access control implementation
2. Check arithmetic operations
3. Review external call handling
4. Validate oracle integrations
5. Assess gas optimization vs. security trade-offs

### Phase 3: Testing
1. Unit tests with 100% branch coverage
2. Integration tests on Apothem Testnet
3. Fuzzing with XDC-specific parameters
4. Stress testing with maximum load

### Phase 4: Documentation
1. Document all privileged roles
2. Record upgrade procedures
3. Maintain incident response contacts
4. Create monitoring and alerting rules

---

## XDC-Specific Security Considerations

### Consensus Differences

| Factor | Ethereum | XDC | Security Impact |
|--------|----------|-----|-----------------|
| Block time | ~12 seconds | ~2 seconds | Faster reentrancy cycles |
| Consensus | PoS | XDPoS | Predictable validator rotation |
| Gas market | EIP-1559 | Fixed | Predictable costs, different attack vectors |
| Block gas limit | 30M | 50M | More computation per block |
| Finality | Probabilistic | Deterministic | Faster confirmation, different reorg risks |

### Enterprise Considerations

- Trade finance contracts often involve large values — extra scrutiny required
- Multi-party workflows need robust access control
- Regulatory compliance may require additional audit trails
- Cross-border transactions need timezone and jurisdiction considerations

---

## Resources

- [SWC Registry](https://swcregistry.io/) — Smart Contract Weakness Classification
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts) — Audited libraries
- [Consensys Best Practices](https://consensys.github.io/smart-contract-best-practices/) — Security guidelines
- [XDC Security Practices](./security-practices.md) — XDC-specific security guide
