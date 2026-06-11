---
title: Account Abstraction (ERC-4337) on XDC
description: Complete guide to ERC-4337 account abstraction on XDC Network. Smart accounts, UserOperations, paymasters, bundlers, and gasless transactions with production-ready code.
---

# Account Abstraction (ERC-4337) on XDC

Account abstraction (AA) transforms every user account into a smart contract, enabling gasless transactions, social recovery, session keys, and programmable authentication. This guide covers ERC-4337 implementation on XDC Network with production-ready code.

---

## What is Account Abstraction

### Traditional EOAs vs Smart Accounts

| Feature | Externally Owned Account (EOA) | Smart Account (ERC-4337) |
|---------|-------------------------------|--------------------------|
| **Private Key** | Required for every transaction | Optional — programmable auth |
| **Gas Payment** | User must hold native token | Paymaster can sponsor gas |
| **Recovery** | Seed phrase only | Social recovery, multi-sig |
| **Batching** | One tx at a time | Multiple operations atomic |
| **Session Keys** | Not possible | Time-limited permissions |
| **Signature** | ECDSA only | Any validation logic |

### Why Account Abstraction Matters

1. **Gasless Onboarding** — Users don't need XDC to start. Paymaster sponsors gas.
2. **Social Recovery** — Lose your key? Trusted contacts can help recover.
3. **Session Keys** — Approve a game to move your NFTs for 24 hours without full access.
4. **Batch Transactions** — Approve + swap + stake in one atomic operation.
5. **Custom Authentication** — Use passkeys, biometrics, or email instead of seed phrases.

### ERC-4337 Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   User      │────▶│  Bundler    │────▶│  EntryPoint │────▶│   XDC       │
│  (Signer)   │     │  (Relayer)  │     │  (Contract) │     │  Network    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       │                                              ▲
       │         ┌─────────────┐                      │
       └────────▶│  Paymaster  │──────────────────────┘
                 │ (Gas Sponsor)│
                 └─────────────┘
```

**Components:**
- **Smart Account** — User's wallet contract (holds funds, validates signatures)
- **EntryPoint** — Singleton contract that processes all UserOperations
- **Bundler** — Off-chain service that bundles UserOperations into transactions
- **Paymaster** — Optional contract that sponsors gas fees
- **UserOperation** — Pseudo-transaction object sent to the mempool

---

## XDC Network Compatibility

XDC is EVM-compatible, so ERC-4337 infrastructure works with minimal changes:

| Component | XDC Mainnet | XDC Apothem | Notes |
|-----------|-------------|-------------|-------|
| **EntryPoint v0.6** | ✅ Deployed | ✅ Deployed | `0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789` |
| **EntryPoint v0.7** | ✅ Deployed | ✅ Deployed | `0x0000000071727De22E5E9d8BAf0edAc6f37da032` |
| **Bundler (Pimlico)** | ✅ Available | ✅ Available | `https://api.pimlico.io/v2/xdc/rpc` |
| **Bundler (Alchemy)** | ✅ Available | ✅ Available | `https://xdc-mainnet.g.alchemy.com/v2/KEY` |
| **Safe{Core} AA** | ✅ Supported | ✅ Supported | Via Safe SDK |
| **Biconomy** | ✅ Supported | ✅ Supported | Via Biconomy SDK |

> 💡 **Note:** EntryPoint addresses are the same across all EVM chains per ERC-4337 specification.

---

## Smart Account Implementation

### SimpleAccount (Reference Implementation)

The Ethereum Foundation provides a reference `SimpleAccount` that works on XDC without modifications:

```solidity
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

import "@account-abstraction/contracts/core/BaseAccount.sol";
import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract SimpleAccount is BaseAccount {
    using ECDSA for bytes32;

    IEntryPoint private immutable _entryPoint;
    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner || msg.sender == address(this), "not owner");
        _;
    }

    constructor(IEntryPoint anEntryPoint, address anOwner) {
        _entryPoint = anEntryPoint;
        owner = anOwner;
    }

    function entryPoint() public view virtual override returns (IEntryPoint) {
        return _entryPoint;
    }

    // Validate UserOperation signature
    function _validateSignature(
        UserOperation calldata userOp,
        bytes32 userOpHash
    ) internal virtual override returns (uint256 validationData) {
        bytes32 hash = userOpHash.toEthSignedMessageHash();
        if (owner != hash.recover(userOp.signature))
            return SIG_VALIDATION_FAILED;
        return 0;
    }

    // Execute a transaction (called by EntryPoint)
    function execute(address dest, uint256 value, bytes calldata func) external {
        _requireFromEntryPoint();
        (bool success, bytes memory result) = dest.call{value: value}(func);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
    }

    // Execute a batch of transactions
    function executeBatch(
        address[] calldata dest,
        bytes[] calldata func
    ) external {
        _requireFromEntryPoint();
        require(dest.length == func.length, "wrong array lengths");
        for (uint256 i = 0; i < dest.length; i++) {
            (bool success, bytes memory result) = dest[i].call(func[i]);
            if (!success) {
                assembly {
                    revert(add(result, 32), mload(result))
                }
            }
        }
    }

    // Update owner (social recovery, key rotation)
    function updateOwner(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    receive() external payable {}
}
```

### Account Factory

Deploy smart accounts deterministically via CREATE2:

```solidity
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

import "@openzeppelin/contracts/utils/Create2.sol";
import "./SimpleAccount.sol";

contract SimpleAccountFactory {
    SimpleAccount public immutable accountImplementation;

    constructor(IEntryPoint _entryPoint) {
        accountImplementation = new SimpleAccount(_entryPoint, address(this));
    }

    // Create a new smart account (or return existing one)
    function createAccount(
        address owner,
        uint256 salt
    ) public returns (SimpleAccount ret) {
        address addr = getAddress(owner, salt);
        uint codeSize = addr.code.length;
        if (codeSize > 0) {
            return SimpleAccount(payable(addr));
        }
        ret = SimpleAccount(payable(new Create2{salt: bytes32(salt)}(
            abi.encodePacked(
                type(SimpleAccount).creationCode,
                abi.encode(entryPoint(), owner)
            )
        )));
    }

    // Calculate counterfactual address
    function getAddress(
        address owner,
        uint256 salt
    ) public view returns (address) {
        return Create2.computeAddress(
            bytes32(salt),
            keccak256(abi.encodePacked(
                type(SimpleAccount).creationCode,
                abi.encode(entryPoint(), owner)
            ))
        );
    }

    function entryPoint() public view returns (IEntryPoint) {
        return accountImplementation.entryPoint();
    }
}
```

---

## UserOperation Structure

A `UserOperation` is the core data structure that replaces traditional transactions:

```typescript
interface UserOperation {
  sender: string;           // Smart account address
  nonce: bigint;            // Anti-replay sequence number
  initCode: string;         // Factory + init data (for first tx)
  callData: string;         // Encoded function call
  callGasLimit: bigint;     // Gas for execute()
  verificationGasLimit: bigint; // Gas for validateUserOp()
  preVerificationGas: bigint;   // Base gas overhead
  maxFeePerGas: bigint;     // Max fee per gas (EIP-1559)
  maxPriorityFeePerGas: bigint; // Miner tip
  paymasterAndData: string; // Paymaster address + data
  signature: string;        // Account-specific signature
}
```

### Creating a UserOperation

```typescript
import { ethers } from 'ethers';
import { Client, Presets } from 'userop';

const RPC_URL = 'https://rpc.apothem.network';
const BUNDLER_URL = 'https://api.pimlico.io/v2/xdc-testnet/rpc?apikey=YOUR_KEY';
const ENTRY_POINT = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';

// Create a UserOperation client
const client = await Client.init(RPC_URL, {
  entryPoint: ENTRY_POINT,
  overrideBundlerRpc: BUNDLER_URL,
});

// Build a simple transfer UserOperation
const builder = new Presets.Builder.SimpleAccount(
  ownerSigner,  // EOA that controls the smart account
  ENTRY_POINT
);

const userOp = await client.buildUserOperation(
  builder.execute('0xRecipient', ethers.parseEther('10'), '0x')
);

console.log('UserOperation:', userOp);
```

---

## Paymaster Setup

Paymasters enable gasless transactions by sponsoring gas fees.

### Verifying Paymaster (Sponsored Gas)

```solidity
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

import "@account-abstraction/contracts/core/BasePaymaster.sol";

contract VerifyingPaymaster is BasePaymaster {
    using UserOperationLib for UserOperation;

    address public immutable verifyingSigner;

    constructor(IEntryPoint _entryPoint, address _verifyingSigner) {
        BasePaymaster(_entryPoint);
        verifyingSigner = _verifyingSigner;
    }

    // Validate that the UserOperation was signed by the verifying signer
    function _validatePaymasterUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 requiredPreFund
    ) internal view override returns (bytes memory context, uint256 validationData) {
        (requiredPreFund);

        // Extract signature from paymasterAndData
        bytes32 hash = keccak256(abi.encodePacked(userOpHash, block.chainid));
        bytes32 ethSignedHash = hash.toEthSignedMessageHash();

        require(
            ethSignedHash.recover(userOp.paymasterAndData[20:]) == verifyingSigner,
            "invalid signature"
        );

        return ("", 0);
    }

    // No post-op needed for simple sponsorship
    function _postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost
    ) internal override {
        (mode, context, actualGasCost);
    }
}
```

### ERC-20 Token Paymaster (Pay Gas in USDC)

```solidity
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

import "@account-abstraction/contracts/core/BasePaymaster.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";

contract TokenPaymaster is BasePaymaster {
    IERC20 public immutable token;
    ISwapRouter public immutable swapRouter;
    address public immutable weth;

    // Price of token in wei (oracle or TWAP)
    uint256 public tokenPrice;

    constructor(
        IEntryPoint _entryPoint,
        IERC20 _token,
        ISwapRouter _swapRouter,
        address _weth
    ) BasePaymaster(_entryPoint) {
        token = _token;
        swapRouter = _swapRouter;
        weth = _weth;
    }

    function _validatePaymasterUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 requiredPreFund
    ) internal view override returns (bytes memory context, uint256 validationData) {
        (userOpHash);

        // Calculate token cost
        uint256 tokenCost = (requiredPreFund * 1e18) / tokenPrice;

        return (abi.encode(userOp.sender, tokenCost), 0);
    }

    function _postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost
    ) internal override {
        if (mode == PostOpMode.postOpReverted) {
            return; // Don't charge if execution failed
        }

        (address sender, uint256 tokenCost) = abi.decode(context, (address, uint256));

        // Pull tokens from user
        require(token.transferFrom(sender, address(this), tokenCost), "token payment failed");

        // Swap tokens for XDC to refill EntryPoint deposit
        _swapTokensForXDC(tokenCost);
    }

    function _swapTokensForXDC(uint256 amount) internal {
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: address(token),
                tokenOut: weth,
                fee: 3000,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });

        swapRouter.exactInputSingle(params);
    }

    function updatePrice(uint256 newPrice) external onlyOwner {
        tokenPrice = newPrice;
    }
}
```

---

## Gasless Transaction Example

### Frontend Integration (React + ethers.js)

```typescript
import { ethers } from 'ethers';
import { Client, Presets } from 'userop';

const AA_CONFIG = {
  rpcUrl: 'https://rpc.apothem.network',
  bundlerUrl: 'https://api.pimlico.io/v2/xdc-testnet/rpc?apikey=YOUR_KEY',
  entryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  factory: '0xSimpleAccountFactoryAddress',
  paymaster: {
    rpcUrl: 'https://api.pimlico.io/v2/xdc-testnet/rpc?apikey=YOUR_KEY',
    context: { type: 'payg' } // Pay-as-you-go sponsorship
  }
};

class AAWalletService {
  private client: Client;
  private builder: Presets.Builder.SimpleAccount;

  constructor(private signer: ethers.Signer) {}

  async init() {
    this.client = await Client.init(AA_CONFIG.rpcUrl, {
      entryPoint: AA_CONFIG.entryPoint,
      overrideBundlerRpc: AA_CONFIG.bundlerUrl,
    });

    this.builder = await Presets.Builder.SimpleAccount.init(
      this.signer,
      AA_CONFIG.entryPoint,
      {
        factory: AA_CONFIG.factory,
        salt: 0, // Deterministic address
        overrideBundlerRpc: AA_CONFIG.bundlerUrl,
      }
    );

    console.log('Smart Account:', this.builder.getSender());
  }

  // Send gasless transaction
  async sendGaslessTransaction(to: string, value: string, data: string = '0x') {
    const userOp = await this.client.buildUserOperation(
      this.builder.execute(to, ethers.parseEther(value), data)
    );

    // Sign with EOA key
    const signature = await this.signer.signMessage(
      ethers.getBytes(userOp.hash)
    );
    userOp.signature = signature;

    // Submit to bundler
    const userOpHash = await this.client.sendUserOperation(userOp);
    console.log('UserOperation submitted:', userOpHash);

    // Wait for confirmation
    const receipt = await this.client.waitForUserOperationReceipt(userOpHash);
    console.log('Confirmed:', receipt.transactionHash);

    return receipt;
  }

  // Batch multiple operations
  async batchTransactions(calls: Array<{to: string, value: string, data: string}>) {
    const executions = calls.map(call =>
      this.builder.execute(call.to, ethers.parseEther(call.value), call.data)
    );

    const userOp = await this.client.buildUserOperation(
      this.builder.executeBatch(executions)
    );

    const signature = await this.signer.signMessage(
      ethers.getBytes(userOp.hash)
    );
    userOp.signature = signature;

    return this.client.sendUserOperation(userOp);
  }

  // Get smart account address (counterfactual)
  getAddress(): string {
    return this.builder.getSender();
  }
}

// React Hook
export function useAAWallet() {
  const [wallet, setWallet] = useState<AAWalletService | null>(null);
  const [address, setAddress] = useState<string>('');

  const connect = async () => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    const aaWallet = new AAWalletService(signer);
    await aaWallet.init();

    setWallet(aaWallet);
    setAddress(aaWallet.getAddress());
  };

  const sendTransaction = async (to: string, value: string) => {
    if (!wallet) throw new Error('Wallet not connected');
    return wallet.sendGaslessTransaction(to, value);
  };

  return { connect, address, sendTransaction };
}
```

### Usage in React Component

```tsx
import { useAAWallet } from './useAAWallet';

function GaslessTransfer() {
  const { connect, address, sendTransaction } = useAAWallet();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');

  const handleTransfer = async () => {
    try {
      const receipt = await sendTransaction(recipient, amount);
      alert(`Success! Tx: ${receipt.transactionHash}`);
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <div>
      {!address ? (
        <button onClick={connect}>Connect Smart Account</button>
      ) : (
        <div>
          <p>Smart Account: {address}</p>
          <input
            placeholder="Recipient"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
          />
          <input
            placeholder="Amount (XDC)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <button onClick={handleTransfer}>
            Send Gasless Transaction
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## Session Keys

Session keys enable time-limited, permissioned access to a smart account:

```solidity
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

import "./SimpleAccount.sol";

contract SessionKeyAccount is SimpleAccount {
    struct Session {
        address sessionKey;
        uint256 expiresAt;
        address[] allowedTargets;
        bytes4[] allowedSelectors;
        uint256 maxValue;
    }

    mapping(bytes32 => Session) public sessions;

    event SessionCreated(bytes32 indexed sessionId, address indexed sessionKey, uint256 expiresAt);
    event SessionRevoked(bytes32 indexed sessionId);

    constructor(IEntryPoint anEntryPoint, address anOwner)
        SimpleAccount(anEntryPoint, anOwner)
    {}

    // Owner creates a session key
    function createSession(
        bytes32 sessionId,
        address sessionKey,
        uint256 duration,
        address[] calldata targets,
        bytes4[] calldata selectors,
        uint256 maxValue
    ) external onlyOwner {
        sessions[sessionId] = Session({
            sessionKey: sessionKey,
            expiresAt: block.timestamp + duration,
            allowedTargets: targets,
            allowedSelectors: selectors,
            maxValue: maxValue
        });

        emit SessionCreated(sessionId, sessionKey, block.timestamp + duration);
    }

    // Override validation to accept session key signatures
    function _validateSignature(
        UserOperation calldata userOp,
        bytes32 userOpHash
    ) internal view override returns (uint256 validationData) {
        // Try owner signature first
        bytes32 hash = userOpHash.toEthSignedMessageHash();
        if (owner == hash.recover(userOp.signature[:65])) {
            return 0;
        }

        // Try session key
        bytes32 sessionId = bytes32(userOp.signature[65:97]);
        Session storage session = sessions[sessionId];

        require(block.timestamp < session.expiresAt, "session expired");
        require(session.sessionKey == hash.recover(userOp.signature[97:162]), "invalid session sig");

        // Validate call target and selector
        (address target, uint256 value, bytes memory data) = abi.decode(
            userOp.callData[4:], // skip execute selector
            (address, uint256, bytes)
        );

        require(value <= session.maxValue, "value exceeds limit");
        require(_isAllowed(target, session.allowedTargets), "target not allowed");
        require(_isAllowed(bytes4(data), session.allowedSelectors), "selector not allowed");

        return 0;
    }

    function _isAllowed(address target, address[] storage allowed) internal view returns (bool) {
        for (uint i = 0; i < allowed.length; i++) {
            if (allowed[i] == target) return true;
        }
        return false;
    }

    function _isAllowed(bytes4 selector, bytes4[] storage allowed) internal view returns (bool) {
        for (uint i = 0; i < allowed.length; i++) {
            if (allowed[i] == selector) return true;
        }
        return false;
    }

    function revokeSession(bytes32 sessionId) external onlyOwner {
        delete sessions[sessionId];
        emit SessionRevoked(sessionId);
    }
}
```

---

## Social Recovery

```solidity
// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

import "./SimpleAccount.sol";

contract SocialRecoveryAccount is SimpleAccount {
    struct Recovery {
        address[] guardians;
        uint256 threshold;
        uint256 delay;
    }

    Recovery public recovery;
    mapping(address => bool) public isGuardian;
    mapping(bytes32 => uint256) public recoveryVotes;
    mapping(bytes32 => mapping(address => bool)) public hasVoted;
    bytes32 public pendingRecovery;
    uint256 public recoveryInitiatedAt;

    event RecoveryInitiated(bytes32 indexed newOwnerHash, address indexed by);
    event RecoveryExecuted(bytes32 indexed newOwnerHash, address indexed newOwner);
    event GuardianAdded(address indexed guardian);
    event GuardianRemoved(address indexed guardian);

    constructor(
        IEntryPoint anEntryPoint,
        address anOwner,
        address[] memory guardians,
        uint256 threshold,
        uint256 delay
    ) SimpleAccount(anEntryPoint, anOwner) {
        require(threshold <= guardians.length, "invalid threshold");
        require(delay >= 1 days, "delay too short");

        recovery = Recovery(guardians, threshold, delay);
        for (uint i = 0; i < guardians.length; i++) {
            isGuardian[guardians[i]] = true;
            emit GuardianAdded(guardians[i]);
        }
    }

    // Guardian initiates recovery
    function initiateRecovery(bytes32 newOwnerHash) external {
        require(isGuardian[msg.sender], "not guardian");
        require(pendingRecovery == bytes32(0), "recovery pending");

        pendingRecovery = newOwnerHash;
        recoveryInitiatedAt = block.timestamp;
        recoveryVotes[newOwnerHash] = 1;
        hasVoted[newOwnerHash][msg.sender] = true;

        emit RecoveryInitiated(newOwnerHash, msg.sender);
    }

    // Guardian votes for recovery
    function voteRecovery(bytes32 newOwnerHash) external {
        require(isGuardian[msg.sender], "not guardian");
        require(pendingRecovery == newOwnerHash, "wrong recovery");
        require(!hasVoted[newOwnerHash][msg.sender], "already voted");

        recoveryVotes[newOwnerHash]++;
        hasVoted[newOwnerHash][msg.sender] = true;
    }

    // Execute recovery after threshold + delay
    function executeRecovery(address newOwner) external {
        bytes32 newOwnerHash = keccak256(abi.encodePacked(newOwner));
        require(pendingRecovery == newOwnerHash, "wrong recovery");
        require(recoveryVotes[newOwnerHash] >= recovery.threshold, "insufficient votes");
        require(
            block.timestamp >= recoveryInitiatedAt + recovery.delay,
            "delay not passed"
        );

        owner = newOwner;
        pendingRecovery = bytes32(0);
        recoveryInitiatedAt = 0;

        emit RecoveryExecuted(newOwnerHash, newOwner);
    }

    // Cancel pending recovery
    function cancelRecovery() external onlyOwner {
        pendingRecovery = bytes32(0);
        recoveryInitiatedAt = 0;
    }
}
```

---

## Testing on Apothem Testnet

### Step-by-Step Test

1. **Deploy EntryPoint** (if not already deployed):
   ```bash
   forge create EntryPoint --rpc-url https://rpc.apothem.network --private-key $PK
   ```

2. **Deploy Account Factory**:
   ```bash
   forge create SimpleAccountFactory --constructor-args $ENTRY_POINT --rpc-url https://rpc.apothem.network --private-key $PK
   ```

3. **Create Smart Account**:
   ```typescript
   const factory = new ethers.Contract(FACTORY, FACTORY_ABI, signer);
   const tx = await factory.createAccount(ownerAddress, salt);
   await tx.wait();

   const smartAccount = await factory.getAddress(ownerAddress, salt);
   console.log('Smart Account:', smartAccount);
   ```

4. **Fund Smart Account**:
   Send test XDC to the smart account address.

5. **Send Gasless Transaction**:
   Use the React component above or the `AAWalletService` class.

### Gas Cost Comparison

| Operation | EOA | Smart Account (v0.6) | Smart Account (v0.7) |
|-----------|-----|---------------------|---------------------|
| Simple transfer | 21,000 | ~85,000 | ~65,000 |
| ERC-20 transfer | 65,000 | ~130,000 | ~95,000 |
| Swap (Uniswap) | 150,000 | ~220,000 | ~175,000 |
| Batch (3 ops) | 3 × gas | ~180,000 | ~140,000 |

> 💡 **Note:** v0.7 reduces gas costs by ~25% through optimized EntryPoint and calldata compression.

---

## Security Best Practices

### Smart Account Security

| Risk | Mitigation |
|------|-----------|
| **Upgradability bugs** | Use audited implementations (Safe, Biconomy) |
| **Signature replay** | Include chainId and nonce in signature hash |
| **Front-running** | Use commit-reveal for sensitive operations |
| **Paymaster drain** | Rate limiting, user quotas, deposit monitoring |
| **Bundler censorship** | Run your own bundler or use multiple |

### Paymaster Security

```solidity
// Add rate limiting to paymaster
mapping(address => uint256) public userGasUsed;
uint256 public constant DAILY_LIMIT = 0.1 ether;

function _validatePaymasterUserOp(
    UserOperation calldata userOp,
    bytes32,
    uint256 requiredPreFund
) internal override returns (bytes memory, uint256) {
    require(
        userGasUsed[userOp.sender] + requiredPreFund <= DAILY_LIMIT,
        "daily limit exceeded"
    );
    userGasUsed[userOp.sender] += requiredPreFund;
    // ... rest of validation
}
```

### Deployment Checklist

- [ ] Use audited account implementations (Safe, Kernel, Biconomy)
- [ ] Verify EntryPoint address matches ERC-4337 spec
- [ ] Test on Apothem before mainnet
- [ ] Implement paymaster rate limiting
- [ ] Monitor bundler uptime and censorship
- [ ] Document recovery procedures
- [ ] Audit custom validation logic

---

## SDK Integration

| SDK | Features | XDC Support |
|-----|----------|-------------|
| **Pimlico** | Bundler, Paymaster, UserOp SDK | ✅ Full |
| **Alchemy** | Bundler, Gas Manager | ✅ Full |
| **Biconomy** | Smart Accounts, Paymaster | ✅ Full |
| **Safe{Core}** | Safe Smart Accounts | ✅ Full |
| **ZeroDev** | Kernel Smart Accounts | ✅ Full |

### Pimlico Integration

```typescript
import { createPimlicoClient } from 'permissionless/clients/pimlico';
import { http } from 'viem';

const pimlicoClient = createPimlicoClient({
  transport: http('https://api.pimlico.io/v2/xdc/rpc?apikey=YOUR_KEY'),
  entryPoint: ENTRY_POINT_ADDRESS
});

// Get paymaster data
const paymasterData = await pimlicoClient.sponsorUserOperation({
  userOperation,
});
```

---

## Resources

| Resource | Link |
|----------|------|
| ERC-4337 Spec | [eips.ethereum.org/EIPS/eip-4337](https://eips.ethereum.org/EIPS/eip-4337) |
| Pimlico Docs | [docs.pimlico.io](https://docs.pimlico.io) |
| Safe{Core} | [docs.safe.global](https://docs.safe.global) |
| Biconomy | [docs.biconomy.io](https://docs.biconomy.io) |
| EntryPoint v0.6 | `0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789` |
| EntryPoint v0.7 | `0x0000000071727De22E5E9d8BAf0edAc6f37da032` |

---

## 🚀 Next Steps

1. **[Smart Contract Security →](../security/security-practices.md)** — Secure your smart account (⏱️ 15 min)
2. **[Token Standards →](./tokens/index.md)** — Build tokens with gasless transfers (⏱️ 30 min)
3. **[Key Management →](../security/key-management.md)** — Secure your signer keys (⏱️ 20 min)

Or explore:
- **[Multisig Wallets →](../security/multisig.md)** — Multi-signature smart accounts
- **[Hardhat Deployment →](./hardhat.md)** — Deploy AA infrastructure
- **[API Reference →](../api/json-rpc.md)** — Direct blockchain interaction
