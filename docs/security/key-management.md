---
title: Key Management
description: HSM, MPC, multi-sig, and custody best practices for XDC.
---

# Key Management

Private key management is the most critical security control in blockchain. A compromised key can result in irreversible loss of funds or control of smart contracts.

## Key Types on XDC

| Key Type | Purpose | Protection Level |
|----------|---------|------------------|
| Masternode Coinbase | Block signing, staking | HSM or air-gapped |
| Smart Contract Owner | Contract upgrades, admin | Multi-sig or MPC |
| Treasury/DAO | Protocol funds | Multi-sig + timelock |
| User Wallet | Personal funds | Hardware wallet |
| Subnet Relayer | Cross-chain checkpoints | Dedicated HSM |

## Hardware Security Modules (HSM)

### Supported HSMs

- **AWS CloudHSM** — FIPS 140-2 Level 3
- **Azure Dedicated HSM** — FIPS 140-2 Level 3
- **Thales Luna 7** — On-premises, FIPS 140-2 Level 3
- **YubiHSM 2** — Cost-effective, FIPS 140-2 Level 2

### AWS CloudHSM Setup

```bash
# Initialize CloudHSM cluster
aws cloudhsmv2 create-cluster --backup-retention-policy Type=DAYS,Value=30 \
  --hsm-type hsm1.medium --subnet-ids subnet-12345678

# Create HSM instance
aws cloudhsmv2 create-hsm --cluster-id cluster-12345678 --availability-zone us-east-1a

# Generate key pair
/opt/cloudhsm/bin/key_mgmt_tool
LoginHSM CU user password
GenRSAKeyPair 2048 0 masternode-key
```

### Signing with HSM

```python
from Crypto.PublicKey import RSA
import boto3

hsm_client = boto3.client('cloudhsm')

# Sign a block hash using HSM-backed key
def sign_with_hsm(key_handle, data):
    response = hsm_client.sign(
        KeyHandle=key_handle,
        Mechanism='ECDSA_SHA256',
        Data=data
    )
    return response['Signature']
```

## Multi-Signature Wallets

### Gnosis Safe on XDC

Gnosis Safe supports XDC Network. Deploy a multi-sig with:

```javascript
import Safe from '@safe-global/protocol-kit'

const safe = await Safe.init({
  provider: 'https://rpc.xinfin.network',
  signer: process.env.OWNER_KEY,
  safeAddress: '0x...'
})

// Create transaction requiring 3-of-5 signatures
const tx = await safe.createTransaction({
  transactions: [{
    to: 'xdc...',
    value: '1000000000000000000',
    data: '0x'
  }]
})

const signedTx = await safe.signTransaction(tx)
const txHash = await safe.executeTransaction(signedTx)
```

### Recommended Multi-Sig Configurations

| Use Case | Threshold | Signers |
|----------|-----------|---------|
| Treasury | 3-of-5 | Core team + external auditor |
| Protocol Admin | 2-of-3 | Technical lead + security + operations |
| Emergency Pause | 2-of-4 | Automated + 3 humans |
| Masternode Staking | 2-of-3 | Operator + backup + legal |

## Multi-Party Computation (MPC)

MPC splits a private key into shards distributed across multiple parties. No single party ever holds the full key.

### Fireblocks Integration

```javascript
import { FireblocksSDK } from 'fireblocks-sdk'

const fireblocks = new FireblocksSDK(
  process.env.API_KEY,
  process.env.API_SECRET
)

// Create XDC vault
const vault = await fireblocks.createVaultAccount('XDC-Treasury')

// Get deposit address
const address = await fireblocks.getDepositAddresses(
  vault.id,
  'XDC'
)
```

### Qredo MPC Network

```javascript
import { QredoSDK } from '@qredo/qredo-sdk'

const qredo = new QredoSDK({
  apiKey: process.env.QREDO_API_KEY,
  baseUrl: 'https://api.qredo.network'
})

// Create XDC wallet with 2-of-3 policy
const wallet = await qredo.createWallet({
  asset: 'XDC',
  policy: {
    type: 'threshold',
    threshold: 2,
    total: 3
  }
})
```

## Key Rotation

### Scheduled Rotation

```solidity
// Timelock contract for admin key rotation
contract AdminRotation {
    address public pendingAdmin;
    uint256 public rotationTime;
    uint256 constant ROTATION_DELAY = 2 days;
    
    function proposeRotation(address newAdmin) external onlyAdmin {
        pendingAdmin = newAdmin;
        rotationTime = block.timestamp + ROTATION_DELAY;
    }
    
    function executeRotation() external {
        require(block.timestamp >= rotationTime, "Too early");
        admin = pendingAdmin;
        pendingAdmin = address(0);
    }
}
```

### Emergency Rotation

1. Pause contract via multi-sig
2. Transfer ownership to new address
3. Verify new key on testnet
4. Unpause after verification

## Cold Storage

### Air-Gapped Setup

1. **Generate:** Use Tails OS on offline machine
2. **Store:** Write seed phrase on metal plates (Cryptosteel)
3. **Distribute:** Store in 3 geographically separated locations
4. **Access:** Require 2-of-3 physical locations to reconstruct

### Paper Wallet

```bash
# Generate offline paper wallet
geth account new --datadir ./paper-wallet
# Print address and QR code
qrencode -t ANSI "xdc$(cat paper-wallet/address)"
```

## Key Derivation

### BIP-39 Mnemonic Standards

```javascript
import { ethers } from 'ethers'

// Generate 24-word mnemonic
const mnemonic = ethers.Wallet.createRandom().mnemonic.phrase

// Derive XDC-compatible wallet
const wallet = ethers.Wallet.fromMnemonic(mnemonic, "m/44'/550'/0'/0/0")

// Convert to XDC address format
const xdcAddress = wallet.address.replace('0x', 'xdc')
```

### HD Wallet Paths

| Purpose | Path | Note |
|---------|------|------|
| Standard XDC | m/44'/550'/0'/0/0 | XDC coin type 550 |
| Ethereum compat | m/44'/60'/0'/0/0 | For Metamask users |
| Masternode | m/44'/550'/1'/0/0 | Dedicated derivation |

## Audit Checklist

- [ ] No private keys in environment variables on production
- [ ] No private keys in version control (use git-secrets)
- [ ] HSM or MPC used for high-value keys
- [ ] Multi-sig for contract ownership
- [ ] Timelock on sensitive operations
- [ ] Key rotation policy documented and tested
- [ ] Backup keys stored in geographically distributed locations
- [ ] Access logs reviewed monthly
- [ ] Incident response plan includes key compromise scenario
