# Key Management

Secure key management is fundamental to the security of any blockchain application. This guide covers best practices for managing private keys, mnemonics, and cryptographic materials on the XDC Network.

---

## Key Types

### 1. Validator/Masternode Keys

**Purpose:** Sign blocks and participate in consensus

**Requirements:**
- Must remain online for block production
- High availability required
- Compromise affects network security

**Security Level:** Critical

### 2. Contract Admin Keys

**Purpose:** Upgrade contracts, modify parameters, manage access control

**Requirements:**
- Used for privileged operations
- Should implement multi-signature
- Consider timelock mechanisms

**Security Level:** Critical

### 3. Treasury/Multisig Keys

**Purpose:** Manage protocol funds and treasury operations

**Requirements:**
- Multi-signature required (M-of-N)
- Geographic distribution of signers
- Regular key rotation

**Security Level:** Critical

### 4. Operational Keys

**Purpose:** Day-to-day operations, deployments, monitoring

**Requirements:**
- Limited permissions
- Regular rotation schedule
- Separate from critical keys

**Security Level:** High

### 5. Developer/Test Keys

**Purpose:** Development, testing, CI/CD

**Requirements:**
- Never hold mainnet funds
- Clearly labeled and isolated
- Rotated frequently

**Security Level:** Medium

---

## Key Generation

### Secure Generation Environment

1. **Offline Generation**
   - Generate keys on air-gapped machines
   - Use hardware random number generators
   - Verify entropy quality

2. **Hardware Wallets**
   - Ledger Nano S/X
   - Trezor Model T
   - Keystone Pro

3. **Command Line Tools**
   ```bash
   # Using XDC CLI
   xdc account new
   
   # Using ethers.js
   const wallet = ethers.Wallet.createRandom();
   
   # Using web3.js
   const account = web3.eth.accounts.create();
   ```

### Mnemonic Backup

**Best Practices:**
- Write on metal or paper (not digital)
- Store in multiple physical locations
- Use Shamir's Secret Sharing for high-value keys
- Never store in password managers or cloud storage

**Shamir's Secret Sharing Example:**
```bash
# Split mnemonic into 3 shares, require 2 to reconstruct
# Using ssss (Shamir's Secret Sharing Scheme)
ssss-split -t 2 -n 3
# Enter mnemonic when prompted
# Store each share in separate secure location
```

---

## Key Storage

### Hardware Security Modules (HSM)

**Recommended HSMs:**
- AWS CloudHSM
- Azure Dedicated HSM
- Ledger Nano S/X (for smaller operations)
- YubiHSM 2

**Configuration:**
```javascript
// AWS CloudHSM with ethers.js
const { CloudHSMSigner } = require('./CloudHSMSigner');
const provider = new ethers.providers.JsonRpcProvider('https://erpc.xinfin.network');
const signer = new CloudHSMSigner(hsmClient, keyHandle, provider);
```

### Multi-Signature Wallets

**Gnosis Safe on XDC:**
```javascript
const safeSdk = await Safe.create({
  ethAdapter,
  safeAddress: '0x...',
  contractNetworks: {
    50: {  // XDC Mainnet
      multiSendAddress: '0x...',
      safeMasterCopyAddress: '0x...',
      safeProxyFactoryAddress: '0x...'
    }
  }
});
```

**Recommended Configurations:**
| Use Case | Signers | Required | Rationale |
|----------|---------|----------|-----------|
| Treasury | 5 | 3 | High security, operational flexibility |
| Contract Admin | 3 | 2 | Balance of security and speed |
| Validator | 2 | 2 | Maximum security for consensus |
| Operations | 3 | 2 | Day-to-day operations |

### Cold Storage

**Paper Wallets:**
- Print private key and address
- Store in fireproof/waterproof container
- Multiple copies in different locations

**Hardware Wallets:**
- Ledger, Trezor, Keystone
- PIN protection
- Recovery phrase backup
- Firmware updates

**Air-Gapped Computers:**
- Never connected to internet
- Minimal software installation
- Encrypted storage
- Physical security

---

## Key Usage

### Transaction Signing

**Secure Signing Process:**
1. Prepare transaction on online machine
2. Transfer to offline signing device
3. Verify transaction details
4. Sign on secure device
5. Transfer signed transaction back
6. Broadcast to network

**Code Example:**
```javascript
const ethers = require('ethers');

// Create wallet from private key (secure environment only)
const wallet = new ethers.Wallet(privateKey);

// Create transaction
const tx = {
  to: recipientAddress,
  value: ethers.utils.parseEther('100'),
  gasLimit: 21000,
  gasPrice: ethers.utils.parseUnits('0.25', 'gwei'),
  nonce: await provider.getTransactionCount(wallet.address),
  chainId: 50  // XDC Mainnet
};

// Sign transaction
const signedTx = await wallet.signTransaction(tx);

// Broadcast
const receipt = await provider.sendTransaction(signedTx);
```

### Smart Contract Interaction

**Using Multi-Sig:**
```javascript
// Create transaction through Gnosis Safe
const safeTransaction = await safeSdk.createTransaction({
  transactions: [{
    to: contractAddress,
    value: '0',
    data: contract.interface.encodeFunctionData('upgradeTo', [newImplementation])
  }]
});

// Sign and execute
const signedTx = await safeSdk.signTransaction(safeTransaction);
const executeTxResponse = await safeSdk.executeTransaction(signedTx);
```

---

## Key Rotation

### Rotation Schedule

| Key Type | Rotation Frequency | Procedure |
|----------|-------------------|-----------|
| Validator | Every 6 months | Generate new key, update masternode |
| Admin | Every 3 months | Multi-sig rotation, test transactions |
| Treasury | Every 12 months | Gradual rotation, verify all signers |
| Operational | Every 1 month | Automated rotation, update CI/CD |

### Rotation Process

1. **Generate New Key**
   ```bash
   # Generate new key pair
   xdc account new
   ```

2. **Test New Key**
   - Send test transaction
   - Verify signature validity
   - Confirm access rights

3. **Update Systems**
   - Update environment variables
   - Rotate CI/CD secrets
   - Update monitoring alerts

4. **Revoke Old Key**
   - Remove from multi-sig
   - Update access control lists
   - Securely delete old key material

5. **Verify**
   - Test all operations with new key
   - Confirm old key no longer works
   - Document rotation in changelog

---

## Key Recovery

### Recovery Procedures

**Lost Private Key:**
1. Use mnemonic phrase to regenerate
2. If no mnemonic, key is permanently lost
3. Transfer funds to new address if possible

**Compromised Key:**
1. Immediately revoke key access
2. Transfer funds to secure address
3. Generate new key pair
4. Update all systems
5. Investigate compromise vector

**HSM Failure:**
1. Activate backup HSM
2. Use recovery key shares
3. Restore key material
4. Verify functionality

### Backup Verification

**Monthly Checks:**
- Verify mnemonic phrase readability
- Test key recovery process
- Confirm backup locations accessible
- Update recovery documentation

---

## XDC-Specific Considerations

### Validator Key Management

**Masternode Requirements:**
- Minimum 10,000,000 XDC stake
- Key must be available 24/7
- Secure server environment

**Best Practices:**
```bash
# Generate validator key
xdc account new --keystore /secure/path

# Set proper permissions
chmod 600 /secure/path/UTC--*

# Backup keystore
cp -r /secure/path /backup/location
```

**Key Security:**
- Store in encrypted volume
- Use hardware security module
- Implement monitoring for unauthorized access
- Regular security audits

### Cross-Chain Key Management

**Bridge Operations:**
- Separate keys for each chain
- Multi-sig for bridge operations
- Regular key rotation
- Monitoring for anomalous activity

**Subnet Keys:**
- Independent key management
- Cross-chain message validation
- Checkpoint signing keys

---

## Security Checklist

### Generation
- [ ] Keys generated in secure environment
- [ ] Sufficient entropy verified
- [ ] Mnemonic phrase backed up
- [ ] Shamir's Secret Sharing for critical keys

### Storage
- [ ] Hardware wallets for high-value keys
- [ ] HSM for validator keys
- [ ] Multi-sig for treasury
- [ ] Cold storage for long-term holdings
- [ ] Encrypted backups in multiple locations

### Usage
- [ ] Transaction verification before signing
- [ ] Multi-sig for privileged operations
- [ ] Rate limiting on signing operations
- [ ] Audit logging for all key usage

### Rotation
- [ ] Regular rotation schedule defined
- [ ] Automated rotation for operational keys
- [ ] Verification process after rotation
- [ ] Documentation updated

### Recovery
- [ ] Recovery procedures documented
- [ ] Regular recovery drills conducted
- [ ] Backup integrity verified monthly
- [ ] Emergency contacts defined

---

## Tools and Resources

### Hardware Wallets
- [Ledger](https://www.ledger.com)
- [Trezor](https://trezor.io)
- [Keystone](https://keyst.one)

### HSM Solutions
- [AWS CloudHSM](https://aws.amazon.com/cloudhsm/)
- [Azure Dedicated HSM](https://azure.microsoft.com/services/azure-dedicated-hsm/)
- [YubiHSM](https://www.yubico.com/products/yubihsm/)

### Multi-Sig
- [Gnosis Safe](https://gnosis-safe.io)
- [Safe{Core} SDK](https://docs.safe.global/safe-core-aa-sdk/protocol-kit)

### Key Management Tools
- [HashiCorp Vault](https://www.vaultproject.io)
- [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/)
- [Azure Key Vault](https://azure.microsoft.com/services/key-vault/)

---

## Incident Response

### Key Compromise Response

1. **Immediate Actions (0-1 hour)**
   - Revoke compromised key access
   - Freeze affected accounts
   - Alert security team

2. **Short-term Actions (1-24 hours)**
   - Transfer funds to secure addresses
   - Generate new key pairs
   - Update all systems

3. **Long-term Actions (1-7 days)**
   - Investigate compromise vector
   - Implement additional security measures
   - Update security procedures
   - Document lessons learned

### Contact Information

- Security Team: security@xinfin.org
- Emergency Hotline: [Defined in incident response plan]
- XDC Foundation: [Official channels]
