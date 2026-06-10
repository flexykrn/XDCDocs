---
title: Verify Smart Contracts
description: Verify smart contract source code on XDCScan automatically with Hardhat/Foundry or manually through the web interface.
---

Difficulty: Beginner | Time: ~5 minutes | Tools: Hardhat / Foundry / Browser

# Verify Smart Contracts

Verification publishes your source code on XDCScan, allowing anyone to verify the contract's authenticity and audit its logic. This guide covers automatic verification via Hardhat/Foundry and manual verification through XDCScan.

## Prerequisites

- Contract deployed on XDC Apothem or Mainnet
- Source code files
- Exact compiler version used

---

## Automatic Verification (Recommended)

### Hardhat

```bash title="Terminal"
npx hardhat verify --network apothem 0xYOUR_CONTRACT_ADDRESS
```

**With constructor arguments:**

```bash title="Terminal"
npx hardhat verify --network apothem 0xYOUR_CONTRACT_ADDRESS "arg1" "arg2"
```

**Expected output:**

```
Successfully verified contract Counter on the block explorer.
https://testnet.xdcscan.com/address/0xYOUR_CONTRACT_ADDRESS#code
```

### Foundry

```bash title="Terminal"
forge verify-contract 0xYOUR_CONTRACT_ADDRESS src/Counter.sol:Counter --chain 51 --verifier-url https://testnet.xdcscan.com/api
```

**Expected output:**

```
Start verifying contract `Counter` deployed on 51
Submitted contract for verification:
  Response: `OK`
  URL: https://testnet.xdcscan.com/address/0xYOUR_CONTRACT_ADDRESS
```

---

## Manual Verification

If automatic verification fails, use XDCScan's web interface:

1. Open [testnet.xdcscan.com](https://testnet.xdcscan.com) (or [xdcscan.com](https://xdcscan.com) for mainnet)
2. Search for your contract address
3. Click the **Contract** tab
4. Click **Verify and Publish**

**Fill in the form:**

| Field | Value |
|-------|-------|
| Compiler Type | Solidity (Single file) or Solidity (Multi-part files) |
| Compiler Version | Exact version (e.g., 0.8.24) |
| License Type | MIT / GPL / etc. |
| Optimization | Yes / No (match your compiler settings) |
| Runs | 200 (default) |

5. Paste your source code
6. Click **Verify and Publish**

---

## Flattening for Multi-File Contracts

If your contract imports other files, flatten it first:

### Hardhat

```bash title="Terminal"
npx hardhat flatten contracts/MyContract.sol > flattened.sol
```

### Foundry

```bash title="Terminal"
forge flatten src/MyContract.sol > flattened.sol
```

Then verify the flattened file as a single file.

---

## Verification Checklist

- [ ] Correct compiler version
- [ ] Correct optimization settings
- [ ] Source code matches deployed bytecode
- [ ] Constructor arguments correct (if any)
- [ ] License specified

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Invalid API Key" | XDCScan doesn't require keys | Set `apiKey: "none"` |
| "Bytecode mismatch" | Wrong compiler settings | Match optimization and version exactly |
| "Already verified" | Contract already verified | Check the contract page |
| "Unable to verify" | Multi-file contract | Flatten first, then verify |

---

## Next Steps

- [Monitor Contract →](./monitoring.md)
- [Upgrade Contract →](./upgradeability.md)
- [Security Best Practices →](../security/security-practices.md)
