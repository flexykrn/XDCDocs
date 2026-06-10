# Smart Contract Security on XDC

Security is not optional. This guide provides XDC-specific security guidance for smart contract developers, auditors, and enterprises deploying on the XDC Network.

---

## Why XDC Security Differs from Ethereum

While XDC is EVM-compatible, several consensus-layer differences affect security posture:

| Factor | Ethereum | XDC | Security Implication |
|--------|----------|-----|----------------------|
| Block time | ~12 seconds | ~2 seconds | Reentrancy cycles execute faster; rate-limiting logic must account for shorter windows |
| Consensus | PoS | XDPoS | Validator rotation is more predictable; front-running patterns differ |
| Gas market | EIP-1559 dynamic base fee | Effectively zero base fee | Gas estimation behaves differently; overflow in gas math is less likely but not impossible |
| Block gas limit | 30M | 50M | More computation per block, but individual tx still capped |

**Bottom line:** Do not assume Ethereum security guides apply 1:1 to XDC. Test everything on Apothem Testnet before mainnet deployment.

---

## Quick Start: Secure Development Workflow

1. **Write** — Follow the patterns in [Vulnerability Library](#vulnerability-library)
2. **Test** — Run unit tests + property tests with Echidna
3. **Analyze** — Run Slither and Mythril with XDC-calibrated configs
4. **Checklist** — Complete the [Pre-Deployment Audit Checklist](#pre-deployment-audit-checklist)
5. **Deploy** — Use Apothem Testnet first, then mainnet with a multisig

---

## Vulnerability Library

The following 12 vulnerability patterns cover the majority of exploits in production smart contracts. Each entry includes a vulnerable example, a secure example, and XDC-specific notes.

### 1. Reentrancy

**Severity:** Critical  
**XDC Risk:** High — 2-second block time allows faster reentrancy cycles than Ethereum.

**Vulnerable:**
```solidity
function withdraw() external {
    uint256 amount = balances[msg.sender];
    require(amount > 0, "No balance");
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success, "Transfer failed");
    balances[msg.sender] = 0;  // State updated AFTER external call
}
```

**Secure:**
```solidity
function withdraw() external nonReentrant {
    uint256 amount = balances[msg.sender];
    require(amount > 0, "No balance");
    balances[msg.sender] = 0;  // Effect FIRST
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success, "Transfer failed");
}
```

**XDC Note:** Always use OpenZeppelin's `ReentrancyGuard` for any function that sends native XDC or makes external calls before state updates.

---

### 2. Integer Overflow / Underflow

**Severity:** High (pre-Solidity 0.8) / Medium (0.8+)  
**XDC Risk:** Standard — same as Ethereum.

**Vulnerable (Solidity < 0.8):**
```solidity
function add(uint256 a, uint256 b) public pure returns (uint256) {
    return a + b;  // Silently overflows
}
```

**Secure:**
```solidity
// Solidity 0.8+ — built-in overflow checks
function add(uint256 a, uint256 b) public pure returns (uint256) {
    return a + b;  // Reverts on overflow
}

// Or explicit check for older versions
function add(uint256 a, uint256 b) public pure returns (uint256) {
    uint256 c = a + b;
    require(c >= a, "Overflow");
    return c;
}
```

**XDC Note:** XDC supports Solidity 0.8.23+ on mainnet. Use the latest stable version to inherit built-in overflow protection.

---

### 3. Access Control

**Severity:** Critical  
**XDC Risk:** High — enterprise trade finance contracts often manage large values.

**Vulnerable:**
```solidity
function mint(address to, uint256 amount) external {
    _mint(to, amount);  // Anyone can mint
}
```

**Secure:**
```solidity
// Use OpenZeppelin AccessControl, not just Ownable
bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
    _mint(to, amount);
}
```

**XDC Note:** For enterprise contracts, use `AccessControl` with role-based permissions. `Ownable` is insufficient for multi-party trade finance workflows.

---

### 4. Unchecked External Calls

**Severity:** High  
**XDC Risk:** Standard.

**Vulnerable:**
```solidity
function sendXDC(address payable recipient, uint256 amount) external {
    recipient.call{value: amount}("");  // Return value ignored
}
```

**Secure:**
```solidity
function sendXDC(address payable recipient, uint256 amount) external {
    (bool success, ) = recipient.call{value: amount}("");
    require(success, "XDC transfer failed");
}
```

---

### 5. Front-Running

**Severity:** High  
**XDC Risk:** Medium-High — XDPoS validator rotation is more predictable than Ethereum's random beacon.

**Vulnerable:**
```solidity
// DEX-style price update without protection
function updatePrice(uint256 newPrice) external {
    currentPrice = newPrice;
}
```

**Secure:**
```solidity
// Use commit-reveal pattern or time-weighted average
mapping(address => bytes32) public commitments;

function commit(bytes32 hash) external {
    commitments[msg.sender] = hash;
}

function reveal(uint256 newPrice, bytes32 secret) external {
    require(keccak256(abi.encodePacked(newPrice, secret)) == commitments[msg.sender], "Invalid reveal");
    currentPrice = newPrice;
    delete commitments[msg.sender];
}
```

**XDC Note:** XDPoS proposer selection follows a round-robin pattern. This makes certain front-running strategies more deterministic. Use commit-reveal for sensitive operations.

---

### 6. Timestamp Dependence

**Severity:** Medium  
**XDC Risk:** Medium — 2-second blocks make `block.timestamp` more granular but still manipulable within a small window.

**Vulnerable:**
```solidity
function isExpired() external view returns (bool) {
    return block.timestamp > deadline;  // Miner can manipulate slightly
}
```

**Secure:**
```solidity
// Accept a small tolerance or use block.number
function isExpired() external view returns (bool) {
    return block.timestamp >= deadline + 2;  // 2-second buffer
}
```

---

### 7. Denial of Service via Gas Limits

**Severity:** High  
**XDC Risk:** Medium — 50M block gas limit is higher than Ethereum, but unbounded loops are still dangerous.

**Vulnerable:**
```solidity
function payoutAll() external {
    for (uint256 i = 0; i < recipients.length; i++) {
        recipients[i].transfer(amounts[i]);  // Unbounded loop
    }
}
```

**Secure:**
```solidity
function payout(uint256 start, uint256 end) external {
    require(end <= recipients.length, "Out of bounds");
    for (uint256 i = start; i < end; i++) {
        recipients[i].transfer(amounts[i]);
    }
}
```

---

### 8. Delegatecall Injection

**Severity:** Critical  
**XDC Risk:** Standard.

**Vulnerable:**
```solidity
function execute(address target, bytes memory data) external {
    target.delegatecall(data);  // No validation on target
}
```

**Secure:**
```solidity
mapping(address => bool) public allowedTargets;

function execute(address target, bytes memory data) external onlyOwner {
    require(allowedTargets[target], "Target not allowed");
    (bool success, ) = target.delegatecall(data);
    require(success, "Delegatecall failed");
}
```

---

### 9. Signature Replay

**Severity:** High  
**XDC Risk:** Standard.

**Vulnerable:**
```solidity
function claimWithSig(address user, uint256 amount, bytes memory sig) external {
    require(verifySig(user, amount, sig), "Invalid sig");
    balances[user] -= amount;
    // Same sig can be replayed on another chain or after contract upgrade
}
```

**Secure:**
```solidity
bytes32 public immutable DOMAIN_SEPARATOR;

function claimWithSig(address user, uint256 amount, uint256 nonce, bytes memory sig) external {
    require(!usedNonces[nonce], "Nonce used");
    bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, keccak256(abi.encode(user, amount, nonce))));
    require(recoverSigner(digest, sig) == signer, "Invalid sig");
    usedNonces[nonce] = true;
    balances[user] -= amount;
}
```

---

### 10. Oracle Manipulation

**Severity:** Critical  
**XDC Risk:** High — low-liquidity pairs on XDC DEXs are easier to manipulate.

**Vulnerable:**
```solidity
function getPrice() external view returns (uint256) {
    return dex.getReserves().reserve0 / dex.getReserves().reserve1;  // Spot price
}
```

**Secure:**
```solidity
// Use a time-weighted average price (TWAP) oracle
function getPrice() external view returns (uint256) {
    return twapOracle.consult(token0, 1e18, token1);  // 30-min TWAP
}
```

**XDC Note:** If building on XDC, consider using Chainlink oracles where available. For custom oracles, implement a TWAP with at least a 30-minute window.

---

### 11. Storage Collision in Proxies

**Severity:** Critical  
**XDC Risk:** Standard.

**Vulnerable (unstructured storage proxy):**
```solidity
contract Proxy {
    address public implementation;  // Slot 0
    // ... fallback delegates to implementation
}

contract Logic {
    uint256 public counter;  // Also slot 0 — collision!
}
```

**Secure:**
```solidity
contract Logic {
    bytes32 private constant COUNTER_SLOT = keccak256("logic.counter");

    function getCounter() public view returns (uint256) {
        bytes32 slot = COUNTER_SLOT;
        uint256 value;
        assembly { value := sload(slot) }
        return value;
    }
}
```

---

### 12. Selfdestruct / SELFDESTRUCT

**Severity:** High  
**XDC Risk:** Standard.

**Vulnerable:**
```solidity
function emergencyExit() external onlyOwner {
    selfdestruct(payable(owner()));  // Removes contract + sends balance
}
```

**Secure:**
```solidity
// Use a pause + withdrawal pattern instead
function pause() external onlyOwner {
    _pause();
}

function withdraw() external onlyOwner whenPaused {
    payable(owner()).transfer(address(this).balance);
}
```

---

## Pre-Deployment Audit Checklist

Complete every item before mainnet deployment.

### Access Control
- [ ] All privileged functions have access control (`onlyRole`, `onlyOwner`, etc.)
- [ ] Role assignment and revocation are tested
- [ ] No single admin can drain the contract
- [ ] Admin keys are stored in a multisig or hardware wallet

### Reentrancy
- [ ] All payable functions use `nonReentrant` or Checks-Effects-Interactions
- [ ] No external calls happen before state updates
- [ ] Cross-function reentrancy is considered

### Math & Logic
- [ ] Solidity 0.8+ or explicit SafeMath used
- [ ] Division before multiplication is avoided
- [ ] Rounding errors are documented and acceptable

### External Calls
- [ ] All `.call`, `.delegatecall`, `.staticcall` return values are checked
- [ ] No arbitrary `delegatecall` to user-supplied addresses
- [ ] Low-level calls have gas limits where appropriate

### Input Validation
- [ ] All external inputs are validated (range, length, address zero-check)
- [ ] No array lengths are unbounded in loops
- [ ] Reentrancy guards do not rely on input assumptions

### Events
- [ ] All state-changing functions emit events
- [ ] Events include sufficient context for off-chain monitoring

### Upgradability (if applicable)
- [ ] Proxy storage layout is collision-free
- [ ] Upgrade mechanism is gated by multisig or DAO
- [ ] Previous implementation cannot be reinitialized

### Gas
- [ ] All functions fit within XDC block gas limit (50M)
- [ ] No unbounded loops in user-facing functions
- [ ] Storage layout is optimized (packed structs, `uint128` where possible)

### Testing
- [ ] 100% branch coverage on core logic
- [ ] Property-based tests pass (Echidna / Foundry invariant tests)
- [ ] Fuzzing ran for at least 10,000 iterations
- [ ] Tested on Apothem Testnet with real XDC transfers

### Tooling
- [ ] Slither ran with zero high-severity findings
- [ ] Mythril symbolic execution completed
- [ ] No compiler warnings at `solc --optimize`

---

## Security Tooling Configuration

### Slither

Create `slither.config.json` in your project root:

```json
{
  "detectors_to_exclude": [],
  "filter_paths": "node_modules",
  "solc_remaps": [
    "@openzeppelin/=node_modules/@openzeppelin/"
  ],
  "compilation_defaults": {
    "solc_version": "0.8.24",
    "evm_version": "shanghai",
    "optimizer": {
      "enabled": true,
      "runs": 200
    }
  }
}
```

Run:
```bash
slither . --config-file slither.config.json
```

### Mythril

```bash
# Install
pip3 install mythril

# Analyze a single contract
myth analyze contracts/MyContract.sol --rpc https://erpc.apothem.network

# With max transaction count
myth analyze contracts/MyContract.sol --max-transaction-count 10
```

### Echidna (Property-Based Testing)

Example `echidna.yaml`:

```yaml
corpusDir: "corpus"
coverage: true
# XDC uses 2-second blocks — test with short block times
blockTime: 2
# Test for 50,000 transactions
testLimit: 50000
```

Example test contract:

```solidity
contract EchidnaTest {
    Token token;

    constructor() {
        token = new Token();
        token.mint(address(this), 10000 ether);
    }

    // Invariant: total supply never decreases
    function echidna_test_supply() public view returns (bool) {
        return token.totalSupply() >= 10000 ether;
    }
}
```

Run:
```bash
echidna-test . --contract EchidnaTest --config echidna.yaml
```

---

## XDC-Specific Risks

### XDPoS Block Timing

XDC's 2-second block time affects time-sensitive logic:

- **Time-weighted averages:** Use longer windows (30+ minutes) to reduce noise
- **Deadline checks:** Accept a small buffer (`+2 seconds`) to avoid edge-case reverts
- **Rate limiting:** Design for faster cycle rates than Ethereum

### Validator Rotation Predictability

XDPoS uses a deterministic round-robin proposer selection. This means:

- Front-runners can predict the next block producer with higher accuracy than Ethereum
- Use commit-reveal patterns for sensitive operations
- Consider time locks for high-value state changes

### Subnet Isolation

If deploying on an XDC Subnet:

- Subnets have their own validator set — security depends on subnet operators
- Cross-subnet messages via XDCZero have trust assumptions documented in the [Subnet section](../subnet/overview.md)
- Do not assume mainnet security guarantees apply to private subnets

### ISO 20022 Message Injection

For trade finance contracts consuming ISO 20022 messages:

- Validate message schema before processing
- Use cryptographic signatures on inbound messages
- Maintain an allowlist of authorized message senders

---

## Report a Vulnerability

If you discover a security issue in XDC infrastructure or documentation:

- **Email:** security@xinfin.org
- **Bug Bounty:** Check [XDC Bug Bounty Program](https://xinfin.org) for active scopes
- **Responsible Disclosure:** Allow 90 days for remediation before public disclosure

---

## Next Steps

- [Deploy Your First Contract](../xdcchain/developers/quick-guide.md)
- [Token Standards](../smartcontract/tokens.md)
- [XDC Subnet Security](../subnet/overview.md)
