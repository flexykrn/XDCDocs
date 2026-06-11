---
title: Multisig Wallets on XDC
description: Complete guide to creating and using multi-signature wallets on XDC Network. Setup, transaction flows, recovery, and security best practices for teams and DAOs.
---

# Multisig Wallets on XDC

A multi-signature (multisig) wallet requires multiple private keys to authorize a transaction, eliminating single points of failure and enabling secure shared control of funds.

---

## What is Multisig

| Feature | Single-Sig Wallet | Multisig Wallet |
|---------|-------------------|-----------------|
| **Keys Required** | 1 | M-of-N (e.g., 2-of-3) |
| **Security** | Single point of failure | Distributed trust |
| **Use Case** | Individual users | Teams, DAOs, treasuries |
| **Recovery** | Seed phrase only | Social recovery possible |
| **Transaction Speed** | Instant | Depends on signer availability |

**Why Multisig Matters:**
- **No single point of failure** — One compromised key cannot drain funds
- **Team governance** — Requires consensus for large transactions
- **Operational security** — Separation of duties between team members
- **Inheritance planning** — Multiple heirs can access funds without one person controlling everything

---

## Use Cases

### 1. Team Treasury
A 3-of-5 multisig where any 3 team members can approve expenses. Prevents one rogue member from draining funds.

### 2. DAO Governance
A 5-of-9 multisig for protocol treasuries. Large transactions require broad consensus.

### 3. Escrow Services
A 2-of-3 multisig with buyer, seller, and arbitrator. Funds release only when 2 parties agree.

### 4. Validator Operations
A 2-of-3 multisig for validator rewards distribution. Ensures no single operator controls all funds.

---

## How Multisig Works on XDC

XDC is EVM-compatible, so it supports the same multisig infrastructure as Ethereum:

1. **Gnosis Safe** — Industry-standard multisig (now "Safe")
2. **Custom Multisig Contracts** — Deploy your own logic
3. **Hardware-Enforced Multisig** — Ledger/Trezor multi-party signing

This guide focuses on **Gnosis Safe** as it's the most battle-tested solution.

---

## Setup: Create a Multisig Wallet

### Prerequisites

- MetaMask with XDC Apothem Testnet configured
- At least 2 wallet addresses (use different browsers or hardware wallets)
- Test XDC from the [faucet](https://faucet.apothem.network)

### Step 1: Access Safe on XDC

1. Go to **[app.safe.global](https://app.safe.global)**
2. Click **"Create new Safe Account"**
3. Connect MetaMask (ensure you're on XDC Apothem Testnet)

### Step 2: Configure Signers

| Setting | Recommendation | Notes |
|---------|---------------|-------|
| **Signers** | 3–5 addresses | More signers = more security, less speed |
| **Threshold** | 60% of signers | 2-of-3, 3-of-5, 4-of-7 |
| **Signer Diversity** | Different devices/locations | Prevents simultaneous compromise |

**Example Configuration:**
- Signer 1: CEO hardware wallet (office)
- Signer 2: CFO hardware wallet (home)
- Signer 3: CTO MetaMask (2FA protected)
- Threshold: 2-of-3 (any 2 can execute)

### Step 3: Deploy the Safe

1. Review signer addresses and threshold
2. Click **"Create Safe"**
3. Confirm the deployment transaction in MetaMask
4. Wait for confirmation (~2 seconds on XDC)

**Deployment Cost:** ~0.001 XDC (gas fees on XDC are negligible)

### Step 4: Verify on XDCScan

1. Copy your Safe address from the dashboard
2. Go to **[testnet.xdcscan.com](https://testnet.xdcscan.com)**
3. Paste the address and verify the contract

---

## Transaction Flows

### Creating a Transaction

```
Signer A creates tx → Submitted to Safe → A signs → Pending other signatures
```

**Steps:**
1. Go to your Safe dashboard
2. Click **"New Transaction"**
3. Choose **"Send Tokens"** or **"Contract Interaction"**
4. Fill in recipient, amount, and data
5. Click **"Submit"** and sign with your wallet

### Signing a Transaction

```
Signer B reviews tx → Approves → Signs → Threshold met?
```

**Steps:**
1. Signer B opens the Safe dashboard
2. Sees pending transaction in queue
3. Reviews details (recipient, amount, data)
4. Clicks **"Confirm"** and signs with their wallet
5. If threshold met, transaction is ready for execution

### Executing a Transaction

```
Threshold met → Any signer executes → On-chain confirmation
```

**Steps:**
1. Once threshold signatures collected, click **"Execute"**
2. Pay gas fee (only the executor pays gas)
3. Transaction is broadcast to XDC Network
4. Wait for confirmation (~2 seconds)

### Rejecting a Transaction

1. Open the pending transaction
2. Click **"Reject"**
3. Sign the rejection
4. If rejection threshold met, transaction is cancelled

---

## Code Examples

### Deploy Safe Programmatically

```javascript
import Safe, { SafeFactory } from '@safe-global/protocol-kit';
import { ethers } from 'ethers';

const RPC_URL = 'https://rpc.apothem.network';
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Signer who will pay deployment gas
const deployer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Safe configuration
const safeAccountConfig = {
  owners: [
    '0xOwner1Address',
    '0xOwner2Address',
    '0xOwner3Address'
  ],
  threshold: 2
};

async function deploySafe() {
  const safeFactory = await SafeFactory.create({
    ethAdapter: deployer,
    contractNetworks: {
      51: { // XDC Apothem Testnet
        safeSingletonAddress: '0x...',
        safeProxyFactoryAddress: '0x...',
        multiSendAddress: '0x...',
        multiSendCallOnlyAddress: '0x...',
        fallbackHandlerAddress: '0x...',
        signMessageLibAddress: '0x...',
        createCallAddress: '0x...'
      }
    }
  });

  const safe = await safeFactory.deploySafe({
    safeAccountConfig,
    saltNonce: Date.now().toString()
  });

  console.log('Safe deployed at:', await safe.getAddress());
  return safe;
}

deploySafe().catch(console.error);
```

### Create and Sign Transaction

```javascript
import Safe from '@safe-global/protocol-kit';

const SAFE_ADDRESS = '0xYourSafeAddress';

async function createTransaction() {
  // Initialize Safe SDK
  const safe = await Safe.create({
    ethAdapter: signer1, // First signer
    safeAddress: SAFE_ADDRESS,
    contractNetworks: {
      51: { /* XDC Apothem addresses */ }
    }
  });

  // Create transaction
  const safeTransaction = await safe.createTransaction({
    transactions: [{
      to: '0xRecipientAddress',
      value: ethers.parseEther('100').toString(),
      data: '0x'
    }]
  });

  // Sign transaction
  const signedTx = await safe.signTransaction(safeTransaction);

  console.log('Transaction created and signed');
  console.log('Safe Transaction Hash:', signedTx.data.safeTxHash);

  return signedTx;
}

createTransaction().catch(console.error);
```

### Execute Transaction (After Threshold Met)

```javascript
async function executeTransaction(signedTx) {
  // Connect as executor (can be any signer)
  const safe = await Safe.create({
    ethAdapter: executorSigner,
    safeAddress: SAFE_ADDRESS,
    contractNetworks: {
      51: { /* XDC Apothem addresses */ }
    }
  });

  // Execute
  const txResponse = await safe.executeTransaction(signedTx);
  console.log('Transaction executed:', txResponse.hash);

  // Wait for confirmation
  const receipt = await txResponse.transactionResponse.wait();
  console.log('Confirmed in block:', receipt.blockNumber);
}

executeTransaction(signedTx).catch(console.error);
```

---

## Recovery Procedures

### Lost Device

| Scenario | Solution |
|----------|----------|
| **1 signer loses device** | Replace signer via Safe settings (requires threshold) |
| **Multiple signers lose devices** | Use remaining signers to replace lost ones |
| **All signers lose devices** | Funds are permanently locked (design intent) |

**Replacing a Signer:**
1. Go to Safe Settings → Owners
2. Click **"Replace Owner"**
3. Enter old owner address and new owner address
4. Submit and collect threshold signatures
5. Execute replacement transaction

### Compromised Key

1. **Immediately** — Use remaining signers to remove compromised address
2. **Add new signer** — Replace with fresh address
3. **Rotate all keys** — If one is compromised, others may be too
4. **Investigate** — Determine how compromise occurred

### Safe Contract Upgrade

Gnosis Safe supports contract upgrades for security patches:

1. Go to Settings → Advanced
2. Check for available upgrades
3. Propose upgrade transaction
4. Collect threshold signatures
5. Execute upgrade

---

## Security Best Practices

### Signer Setup

| Do | Don't |
|----|-------|
| Use hardware wallets for all signers | Use hot wallets with large amounts |
| Distribute signers geographically | Keep all signers in one location |
| Use different wallet software | Use same software for all signers |
| Enable 2FA on all accounts | Share seed phrases between signers |
| Regularly test signing process | Wait until emergency to test |

### Threshold Selection

| Signers | Threshold | Use Case |
|---------|-----------|----------|
| 2 | 2 | Maximum security, slow operations |
| 3 | 2 | Balance of security and speed |
| 5 | 3 | Team treasury |
| 7 | 4 | Large DAO |
| 9 | 5 | Protocol governance |

**Rule of Thumb:** Threshold should be >50% of signers but allow for 1–2 signers to be unavailable.

### Operational Security

1. **Regular Drills** — Test transaction creation/signing monthly
2. **Key Rotation** — Replace signers every 6–12 months
3. **Monitoring** — Set up alerts for all Safe transactions
4. **Documentation** — Document signer roles and responsibilities
5. **Incident Response** — Have a plan for compromised keys

---

## Testing on Apothem Testnet

### Step-by-Step Test

1. **Create 3 MetaMask accounts** (Account 1, 2, 3)
2. **Get test XDC** for all 3 from [faucet](https://faucet.apothem.network)
3. **Deploy Safe** with 2-of-3 threshold
4. **Send test XDC** to Safe address
5. **Create transaction** to send 10 XDC to another address
6. **Sign with Account 1** — transaction should show 1/2 signatures
7. **Sign with Account 2** — threshold met, ready to execute
8. **Execute transaction** — Account 1 or 2 can execute
9. **Verify** on XDCScan that transaction succeeded

### Common Test Scenarios

| Test | Expected Result |
|------|----------------|
| Create tx with 1 signature | Pending, not executable |
| Add 2nd signature | Ready to execute |
| Execute with 2 signatures | Success |
| Try to execute with 1 signature | Revert |
| Reject transaction | Cancelled |
| Replace signer | Success with threshold |

---

## Comparison: Safe vs Custom Multisig

| Feature | Gnosis Safe | Custom Contract |
|---------|-------------|-----------------|
| **Setup Time** | 5 minutes | Hours/days |
| **Audit Status** | Audited by multiple firms | Self-audited |
| **Features** | Modules, guards, apps | Custom logic only |
| **Upgradeable** | Yes | Only if designed |
| **Cost** | Free (gas only) | Deployment + audit |
| **UI** | Full dashboard | Custom build |
| **Mobile** | iOS/Android apps | None |

**Recommendation:** Use Gnosis Safe for 99% of use cases. Build custom only for specialized requirements.

---

## Resources

| Resource | Link |
|----------|------|
| Safe App | [app.safe.global](https://app.safe.global) |
| Safe Docs | [docs.safe.global](https://docs.safe.global) |
| Safe SDK | [npm @safe-global/protocol-kit](https://www.npmjs.com/package/@safe-global/protocol-kit) |
| XDC Faucet | [faucet.apothem.network](https://faucet.apothem.network) |
| XDCScan | [testnet.xdcscan.com](https://testnet.xdcscan.com) |

---

## 🚀 Next Steps

1. **[Key Management →](./key-management.md)** — Secure your signer keys (⏱️ 20 min)
2. **[Security Practices →](./security-practices.md)** — Comprehensive security checklist (⏱️ 15 min)
3. **[Deploy on Mainnet]()** — Move from testnet to production

Or explore:
- **[Treasury Management]()** — Best practices for DAO treasuries
- **[Incident Response →](./key-management.md#incident-response)** — Handle compromised keys
- **[Validator Setup →](../xdcchain/developers/node_operators/validator-handbook.md)** — Secure validator operations
