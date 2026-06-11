---
title: xdc3.js SDK Guide
description: Complete guide to xdc3.js, the official XDC Network JavaScript SDK. Installation, providers, accounts, transactions, contract interactions, events, and framework integration with copy-pasteable code.
---

**Difficulty:** Beginner | **Time:** ~25 minutes | **Tools:** Node.js `v18+`, npm

# xdc3.js SDK Guide

xdc3.js is the official JavaScript SDK for XDC Network. It is a fork of web3.js with additional utilities for XDC-specific address formatting (`xdc` prefix). This guide covers everything from installation to production deployment.

## Table of Contents

1. [What is xdc3.js](#what-is-xdc3js)
2. [Installation](#installation)
3. [Provider Configuration](#provider-configuration)
4. [Account Management](#account-management)
5. [Reading On-Chain Data](#reading-on-chain-data)
6. [Sending Transactions](#sending-transactions)
7. [Smart Contract Interaction](#smart-contract-interaction)
8. [Event Listening](#event-listening)
9. [XDC-Specific Utilities](#xdc-specific-utilities)
10. [Error Handling](#error-handling)
11. [Migration from web3.js](#migration-from-web3js)
12. [Framework Integration](#framework-integration)
13. [Testing Utilities](#testing-utilities)
14. [TypeScript Support](#typescript-support)
15. [Related Topics](#related-topics)

---

## What is xdc3.js

xdc3.js is the official JavaScript API for XDC Network, maintained by XinFinOrg. It extends web3.js with XDC-specific address formatting utilities.

### Key Differences from web3.js

| Feature | web3.js | xdc3.js |
|---------|---------|---------|
| Address prefix | `0x` only | `0x` and `xdc` support |
| `toXdcAddress()` | Not available | Built-in utility |
| `fromXdcAddress()` | Not available | Built-in utility |
| `isXdcAddress()` | Not available | Built-in utility |
| RPC compatibility | Ethereum | XDC + Ethereum |

### Package Structure

```
xdc3
├── xdc3                  # Main package (includes all modules)
├── xdc3-utils            # Utility functions
├── xdc3-eth              # Ethereum-compatible modules
├── xdc3-eth-contract     # Contract interaction
├── xdc3-eth-accounts     # Account management
├── xdc3-eth-personal     # Personal sign operations
└── xdc3-net              # Network utilities
```

---

## Installation

### npm

```bash
npm install xdc3
```

### yarn

```bash
yarn add xdc3
```

### CDN (Browser)

```html
<script src="https://cdn.jsdelivr.net/npm/xdc3@1.3.13416/dist/xdc3.min.js"></script>
<script>
  // xdc3 is available globally
  const web3 = new Xdc3('https://rpc.xinfin.network');
</script>
```

### Version Check

```javascript
import Xdc3 from 'xdc3';

console.log(Xdc3.version); // "1.3.13416"
```

---

## Provider Configuration

### HTTP Provider

```javascript
import Xdc3 from 'xdc3';

// Mainnet
const xdcMainnet = new Xdc3('https://rpc.xinfin.network');

// Apothem Testnet
const xdcTestnet = new Xdc3('https://rpc.apothem.network');

// Devnet
const xdcDevnet = new Xdc3('https://devnetrpc.xinfin.network');

// With options
const xdcWithTimeout = new Xdc3(
  new Xdc3.providers.HttpProvider('https://rpc.xinfin.network', {
    timeout: 30000,
    headers: [{ name: 'X-API-Key', value: 'your-api-key' }]
  })
);
```

### WebSocket Provider

```javascript
import Xdc3 from 'xdc3';

// Real-time subscriptions
const wsProvider = new Xdc3.providers.WebsocketProvider(
  'wss://rpc.xinfin.network'
);

const xdcWs = new Xdc3(wsProvider);

// Reconnection options
const wsWithReconnect = new Xdc3.providers.WebsocketProvider(
  'wss://rpc.xinfin.network',
  {
    timeout: 30000,
    clientConfig: {
      keepalive: true,
      keepaliveInterval: 60000
    },
    reconnect: {
      auto: true,
      delay: 5000,
      maxAttempts: 5,
      onTimeout: false
    }
  }
);
```

### MetaMask / Browser Provider

```javascript
import Xdc3 from 'xdc3';

// Detect MetaMask or other injected wallet
if (window.ethereum) {
  const xdc = new Xdc3(window.ethereum);

  // Request account access
  await window.ethereum.request({ method: 'eth_requestAccounts' });

  // Get connected accounts
  const accounts = await xdc.eth.getAccounts();
  console.log('Connected:', accounts[0]);
}
```

### Network Configuration Reference

| Parameter | Mainnet | Apothem Testnet | Devnet |
|-----------|---------|-----------------|--------|
| Chain ID | 50 | 51 | 551 |
| RPC URL | `https://rpc.xinfin.network` | `https://rpc.apothem.network` | `https://devnetrpc.xinfin.network` |
| WebSocket | `wss://rpc.xinfin.network` | `wss://rpc.apothem.network` | — |
| Explorer | `https://xdcscan.com` | `https://testnet.xdcscan.com` | — |
| Currency | XDC | TXDC | XDC |
| Block Time | ~2 seconds | ~2 seconds | ~2 seconds |

---

## Account Management

### Creating Accounts

```javascript
import Xdc3 from 'xdc3';

// Create a new random account
const newAccount = Xdc3.eth.accounts.create();
console.log('Address:', newAccount.address);     // 0x...
console.log('Private Key:', newAccount.privateKey);

// Create from entropy
const accountFromEntropy = Xdc3.eth.accounts.create('extra entropy here');
```

### Importing Private Keys

```javascript
import Xdc3 from 'xdc3';

// Add account to wallet
const privateKey = '0x...';
const account = Xdc3.eth.accounts.privateKeyToAccount(privateKey);

// Add to wallet for transaction signing
xdc.eth.accounts.wallet.add(account);

// Wallet can hold multiple accounts
xdc.eth.accounts.wallet.add('0xprivatekey1');
xdc.eth.accounts.wallet.add('0xprivatekey2');

console.log('Wallet size:', xdc.eth.accounts.wallet.length);
```

### HD Wallet Support

```javascript
import Xdc3 from 'xdc3';

// Create from mnemonic
const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

// Note: xdc3 uses same HD path as Ethereum (BIP44)
const hdwallet = Xdc3.eth.accounts.create();

// For full HD wallet support, use ethers.js alongside xdc3
import { ethers } from 'ethers';
const hdNode = ethers.HDNodeWallet.fromPhrase(mnemonic);
console.log('HD Address:', hdNode.address);
```

### Account Balance Queries

```javascript
import Xdc3 from 'xdc3';

const xdc = new Xdc3('https://rpc.xinfin.network');

async function getBalance(address) {
  // Handles both 0x and xdc prefixes automatically
  const balanceWei = await xdc.eth.getBalance(address);
  const balanceXdc = xdc.utils.fromWei(balanceWei, 'ether');

  return {
    wei: balanceWei,
    xdc: balanceXdc
  };
}

// Query with xdc prefix
const bal1 = await getBalance('xdc3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bB');

// Query with 0x prefix
const bal2 = await getBalance('0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bB');
```

### Account Information

```javascript
import Xdc3 from 'xdc3';

const xdc = new Xdc3('https://rpc.xinfin.network');

async function getAccountInfo(address) {
  const [balance, txCount, code] = await Promise.all([
    xdc.eth.getBalance(address),
    xdc.eth.getTransactionCount(address),
    xdc.eth.getCode(address)
  ]);

  return {
    address,
    balance: xdc.utils.fromWei(balance, 'ether'),
    transactionCount: txCount,
    isContract: code !== '0x'
  };
}
```

---

## Reading On-Chain Data

### Block Information

```javascript
import Xdc3 from 'xdc3';

const xdc = new Xdc3('https://rpc.xinfin.network');

async function getBlockInfo() {
  // Latest block
  const latest = await xdc.eth.getBlock('latest');
  console.log('Latest block:', latest.number);
  console.log('Timestamp:', new Date(latest.timestamp * 1000));
  console.log('Transactions:', latest.transactions.length);

  // Block by number
  const block100 = await xdc.eth.getBlock(100);

  // Block transaction count
  const txCount = await xdc.eth.getBlockTransactionCount('latest');
}
```

### Transaction Details

```javascript
import Xdc3 from 'xdc3';

const xdc = new Xdc3('https://rpc.xinfin.network');

async function getTransactionInfo(txHash) {
  const tx = await xdc.eth.getTransaction(txHash);
  const receipt = await xdc.eth.getTransactionReceipt(txHash);

  return {
    from: tx.from,
    to: tx.to,
    value: xdc.utils.fromWei(tx.value, 'ether'),
    gasPrice: xdc.utils.fromWei(tx.gasPrice, 'gwei'),
    status: receipt.status ? 'Success' : 'Failed',
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed
  };
}
```

### Chain State

```javascript
import Xdc3 from 'xdc3';

const xdc = new Xdc3('https://rpc.xinfin.network');

async function getChainState() {
  const [chainId, gasPrice, blockNumber] = await Promise.all([
    xdc.eth.getChainId(),
    xdc.eth.getGasPrice(),
    xdc.eth.getBlockNumber()
  ]);

  return {
    chainId,
    gasPriceGwei: xdc.utils.fromWei(gasPrice, 'gwei'),
    blockNumber
  };
}
```

---

## Sending Transactions

### Basic XDC Transfer

```javascript
import Xdc3 from 'xdc3';

const xdc = new Xdc3('https://rpc.apothem.network');

async function sendXdc(toAddress, amountXdc) {
  // Add sender account
  const sender = xdc.eth.accounts.privateKeyToAccount('0xPRIVATE_KEY');
  xdc.eth.accounts.wallet.add(sender);

  // Convert amount to wei
  const amountWei = xdc.utils.toWei(amountXdc.toString(), 'ether');

  // Build transaction
  const tx = {
    from: sender.address,
    to: toAddress,
    value: amountWei,
    gas: 21000,
    gasPrice: await xdc.eth.getGasPrice()
  };

  // Sign and send
  const receipt = await xdc.eth.sendTransaction(tx);

  console.log('Transaction hash:', receipt.transactionHash);
  console.log('Block:', receipt.blockNumber);
  console.log('Gas used:', receipt.gasUsed);

  return receipt;
}

// Send 1.5 XDC
sendXdc('xdc3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bB', 1.5);
```

### With MetaMask (Browser)

```javascript
import Xdc3 from 'xdc3';

const xdc = new Xdc3(window.ethereum);

async function sendWithMetaMask(toAddress, amountXdc) {
  const accounts = await xdc.eth.getAccounts();
  const from = accounts[0];

  const receipt = await xdc.eth.sendTransaction({
    from,
    to: toAddress,
    value: xdc.utils.toWei(amountXdc.toString(), 'ether')
  });

  return receipt;
}
```

### Gas Estimation

```javascript
import Xdc3 from 'xdc3';

const xdc = new Xdc3('https://rpc.apothem.network');

async function estimateGas(txObject) {
  try {
    const gasEstimate = await xdc.eth.estimateGas(txObject);
    const gasPrice = await xdc.eth.getGasPrice();

    const estimatedCost = gasEstimate * gasPrice;

    return {
      gasEstimate,
      gasPrice,
      estimatedCostXdc: xdc.utils.fromWei(estimatedCost.toString(), 'ether')
    };
  } catch (error) {
    console.error('Gas estimation failed:', error.message);
    throw error;
  }
}

// Example usage
const gasInfo = await estimateGas({
  from: '0x...',
  to: '0x...',
  value: xdc.utils.toWei('1', 'ether')
});
```

### Nonce Management

```javascript
import Xdc3 from 'xdc3';

const xdc = new Xdc3('https://rpc.apothem.network');

async function getNonce(address) {
  // Current transaction count = next nonce
  const nonce = await xdc.eth.getTransactionCount(address);

  // For pending transactions, use 'pending'
  const pendingNonce = await xdc.eth.getTransactionCount(address, 'pending');

  return { nonce, pendingNonce };
}

// Manual nonce for transaction batching
async function sendMultipleTransactions(from, to, amounts) {
  let nonce = await xdc.eth.getTransactionCount(from);

  const receipts = [];
  for (const amount of amounts) {
    const receipt = await xdc.eth.sendTransaction({
      from,
      to,
      value: xdc.utils.toWei(amount.toString(), 'ether'),
      nonce: nonce++ // Increment for each tx
    });
    receipts.push(receipt);
  }

  return receipts;
}
```

---

## Smart Contract Interaction

### Read Operations (Call)

```javascript
import Xdc3 from 'xdc3';

const xdc = new Xdc3('https://rpc.xinfin.network');

const ABI = [
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

const CONTRACT_ADDRESS = '0x...';

const contract = new xdc.eth.Contract(ABI, CONTRACT_ADDRESS);

async function readContractData() {
  // Call totalSupply
  const totalSupply = await contract.methods.totalSupply().call();
  console.log('Total Supply:', xdc.utils.fromWei(totalSupply, 'ether'));

  // Call balanceOf
  const balance = await contract.methods.balanceOf('0x...').call();
  console.log('Balance:', xdc.utils.fromWei(balance, 'ether'));
}
```

### Write Operations (Send)

```javascript
import Xdc3 from 'xdc3';

const xdc = new Xdc3('https://rpc.apothem.network');

const ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "recipient", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "transfer",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const TOKEN_ADDRESS = '0x...';

const contract = new xdc.eth.Contract(ABI, TOKEN_ADDRESS);

async function transferTokens(recipient, amount) {
  const sender = xdc.eth.accounts.privateKeyToAccount('0xPRIVATE_KEY');
  xdc.eth.accounts.wallet.add(sender);

  const amountWei = xdc.utils.toWei(amount.toString(), 'ether');

  const receipt = await contract.methods.transfer(recipient, amountWei)
    .send({
      from: sender.address,
      gas: 100000
    });

  console.log('Transfer confirmed:', receipt.transactionHash);
  return receipt;
}
```

### Deploy Contract

```javascript
import Xdc3 from 'xdc3';

const xdc = new Xdc3('https://rpc.apothem.network');

const BYTECODE = '0x608060405234801561001057600080fd5b50...';
const ABI = [/* ... */];

async function deployContract(constructorArgs) {
  const deployer = xdc.eth.accounts.privateKeyToAccount('0xPRIVATE_KEY');
  xdc.eth.accounts.wallet.add(deployer);

  const contract = new xdc.eth.Contract(ABI);

  const deployTx = contract.deploy({
    data: BYTECODE,
    arguments: constructorArgs
  });

  const gas = await deployTx.estimateGas({ from: deployer.address });

  const receipt = await deployTx.send({
    from: deployer.address,
    gas
  });

  console.log('Contract deployed at:', receipt.options.address);
  return receipt;
}
```

---

## Event Listening

### Subscribe to Contract Events

```javascript
import Xdc3 from 'xdc3';

// Use WebSocket for real-time events
const wsProvider = new Xdc3.providers.WebsocketProvider(
  'wss://rpc.xinfin.network'
);
const xdc = new Xdc3(wsProvider);

const ABI = [
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "from", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "to", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "value", "type": "uint256"}
    ],
    "name": "Transfer",
    "type": "event"
  }
];

const TOKEN_ADDRESS = '0x...';
const contract = new xdc.eth.Contract(ABI, TOKEN_ADDRESS);

// Listen for all Transfer events
const subscription = contract.events.Transfer({
  fromBlock: 'latest'
})
  .on('data', event => {
    console.log('Transfer detected:');
    console.log('  From:', event.returnValues.from);
    console.log('  To:', event.returnValues.to);
    console.log('  Value:', xdc.utils.fromWei(event.returnValues.value, 'ether'));
    console.log('  Block:', event.blockNumber);
  })
  .on('error', error => {
    console.error('Event error:', error);
  });

// Stop listening after 5 minutes
setTimeout(() => {
  subscription.unsubscribe();
  console.log('Unsubscribed from events');
}, 300000);
```

### Filter Events

```javascript
import Xdc3 from 'xdc3';

const xdc = new Xdc3('wss://rpc.xinfin.network');

const contract = new xdc.eth.Contract(ABI, TOKEN_ADDRESS);

// Filter by sender
contract.events.Transfer({
  filter: { from: '0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bB' },
  fromBlock: 'latest'
})
  .on('data', event => {
    console.log('Outgoing transfer:', event.returnValues);
  });

// Filter by recipient
contract.events.Transfer({
  filter: { to: '0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bB' },
  fromBlock: 'latest'
})
  .on('data', event => {
    console.log('Incoming transfer:', event.returnValues);
  });
```

### Past Events

```javascript
import Xdc3 from 'xdc3';

const xdc = new Xdc3('https://rpc.xinfin.network');

const contract = new xdc.eth.Contract(ABI, TOKEN_ADDRESS);

async function getPastEvents() {
  // Get all Transfer events in block range
  const events = await contract.getPastEvents('Transfer', {
    fromBlock: 87654000,
    toBlock: 87655000
  });

  console.log(`Found ${events.length} events`);

  events.forEach(event => {
    console.log(`Block ${event.blockNumber}: ${event.returnValues.from} -> ${event.returnValues.to}`);
  });
}
```

### New Block Headers

```javascript
import Xdc3 from 'xdc3';

const xdc = new Xdc3('wss://rpc.xinfin.network');

// Subscribe to new blocks
const blockSubscription = xdc.eth.subscribe('newBlockHeaders')
  .on('data', block => {
    console.log('New block:', block.number);
    console.log('Hash:', block.hash);
    console.log('Timestamp:', new Date(block.timestamp * 1000));
    console.log('Transactions:', block.transactionsRoot);
  })
  .on('error', error => {
    console.error('Block subscription error:', error);
  });

// Unsubscribe
// blockSubscription.unsubscribe();
```

---

## XDC-Specific Utilities

### Address Conversion

```javascript
import Xdc3 from 'xdc3';

const ethAddress = '0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bB';
const xdcAddress = 'xdc3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bB';

// Convert 0x to xdc
const converted = Xdc3.utils.toXdcAddress(ethAddress);
console.log(converted); // xdc3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bB

// Convert xdc to 0x
const reverted = Xdc3.utils.fromXdcAddress(xdcAddress);
console.log(reverted); // 0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bB

// Check if xdc address
console.log(Xdc3.utils.isXdcAddress(xdcAddress)); // true
console.log(Xdc3.utils.isXdcAddress(ethAddress)); // false
```

### Address Validation

```javascript
import Xdc3 from 'xdc3';

function validateAddress(address) {
  // Check if valid Ethereum address
  const isEthAddress = Xdc3.utils.isAddress(address);

  // Check if valid XDC address
  const isXdcAddr = Xdc3.utils.isXdcAddress(address);

  return {
    valid: isEthAddress || isXdcAddr,
    type: isXdcAddr ? 'xdc' : (isEthAddress ? 'eth' : 'invalid'),
    normalized: isXdcAddr ? Xdc3.utils.fromXdcAddress(address) : address
  };
}

console.log(validateAddress('xdc3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bB'));
// { valid: true, type: 'xdc', normalized: '0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bB' }
```

### Unit Conversion

```javascript
import Xdc3 from 'xdc3';

// Wei to XDC
const wei = '1000000000000000000';
console.log(Xdc3.utils.fromWei(wei, 'ether')); // "1"

// XDC to Wei
const xdc = '1.5';
console.log(Xdc3.utils.toWei(xdc, 'ether')); // "1500000000000000000"

// Gwei conversions
const gwei = '20';
console.log(Xdc3.utils.toWei(gwei, 'gwei')); // "20000000000"

// Custom units
console.log(Xdc3.utils.fromWei('1000000', 'mwei')); // "1" (1 MXDC)
```

---

## Error Handling

### Common Errors

```javascript
import Xdc3 from 'xdc3';

const xdc = new Xdc3('https://rpc.apothem.network');

async function safeTransaction(txObject) {
  try {
    const receipt = await xdc.eth.sendTransaction(txObject);
    return { success: true, receipt };
  } catch (error) {
    // Parse xdc3 error types
    if (error.message.includes('insufficient funds')) {
      return {
        success: false,
        error: 'INSUFFICIENT_FUNDS',
        message: 'Account balance too low for transaction'
      };
    }

    if (error.message.includes('nonce too low')) {
      return {
        success: false,
        error: 'NONCE_TOO_LOW',
        message: 'Transaction nonce already used'
      };
    }

    if (error.message.includes('gas required exceeds allowance')) {
      return {
        success: false,
        error: 'GAS_LIMIT_EXCEEDED',
        message: 'Transaction requires more gas than limit'
      };
    }

    if (error.message.includes('invalid chain id')) {
      return {
        success: false,
        error: 'WRONG_CHAIN',
        message: 'Connected to wrong network. Use XDC Mainnet (50) or Apothem (51)'
      };
    }

    return {
      success: false,
      error: 'UNKNOWN',
      message: error.message
    };
  }
}
```

### Retry Logic

```javascript
import Xdc3 from 'xdc3';

async function sendWithRetry(xdc, txObject, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await xdc.eth.sendTransaction(txObject);
    } catch (error) {
      lastError = error;

      // Don't retry on fatal errors
      if (error.message.includes('insufficient funds') ||
          error.message.includes('nonce too low')) {
        throw error;
      }

      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`Attempt ${attempt} failed. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
```

### Timeout Handling

```javascript
import Xdc3 from 'xdc3';

function sendWithTimeout(xdc, txObject, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Transaction timeout after ' + timeoutMs + 'ms'));
    }, timeoutMs);

    xdc.eth.sendTransaction(txObject)
      .on('receipt', receipt => {
        clearTimeout(timer);
        resolve(receipt);
      })
      .on('error', error => {
        clearTimeout(timer);
        reject(error);
      });
  });
}
```

---

## Migration from web3.js

### Drop-in Replacement

```javascript
// Before (web3.js)
import Web3 from 'web3';
const web3 = new Web3('https://rpc.xinfin.network');

// After (xdc3.js)
import Xdc3 from 'xdc3';
const xdc = new Xdc3('https://rpc.xinfin.network');

// Same API for most operations
const balance = await xdc.eth.getBalance(address);
```

### Address Handling Differences

```javascript
// web3.js - manual conversion
const xdcAddr = 'xdc3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bB';
const ethAddr = '0x' + xdcAddr.slice(3);

// xdc3.js - built-in utilities
const ethAddr2 = Xdc3.utils.fromXdcAddress(xdcAddr);
const xdcAddr2 = Xdc3.utils.toXdcAddress(ethAddr2);
```

### Package Comparison

| web3.js | xdc3.js | Purpose |
|---------|---------|---------|
| `web3` | `xdc3` | Main package |
| `web3-utils` | `xdc3-utils` | Utilities |
| `web3-eth` | `xdc3-eth` | Ethereum modules |
| `web3-eth-contract` | `xdc3-eth-contract` | Contract interaction |

---

## Framework Integration

### React Integration

```jsx
// XdcContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import Xdc3 from 'xdc3';

const XdcContext = createContext(null);

export function XdcProvider({ children, rpcUrl = 'https://rpc.apothem.network' }) {
  const [xdc, setXdc] = useState(null);
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);

  useEffect(() => {
    const instance = new Xdc3(rpcUrl);
    setXdc(instance);
  }, [rpcUrl]);

  async function connect() {
    if (!window.ethereum) {
      throw new Error('MetaMask not installed');
    }

    await window.ethereum.request({ method: 'eth_requestAccounts' });

    const browserXdc = new Xdc3(window.ethereum);
    const accounts = await browserXdc.eth.getAccounts();
    const id = await browserXdc.eth.getChainId();

    setXdc(browserXdc);
    setAccount(accounts[0]);
    setChainId(id);
  }

  return (
    <XdcContext.Provider value={{ xdc, account, chainId, connect }}>
      {children}
    </XdcContext.Provider>
  );
}

export const useXdc = () => useContext(XdcContext);
```

```jsx
// App.jsx
import { XdcProvider, useXdc } from './XdcContext';

function WalletButton() {
  const { account, connect } = useXdc();

  return (
    <button onClick={connect}>
      {account
        ? `${account.slice(0, 6)}...${account.slice(-4)}`
        : 'Connect Wallet'}
    </button>
  );
}

function App() {
  return (
    <XdcProvider>
      <WalletButton />
    </XdcProvider>
  );
}
```

### Vue 3 Integration

```javascript
// composables/useXdc.js
import { ref, onMounted } from 'vue';
import Xdc3 from 'xdc3';

export function useXdc(rpcUrl = 'https://rpc.apothem.network') {
  const xdc = ref(null);
  const account = ref(null);
  const balance = ref('0');

  onMounted(() => {
    xdc.value = new Xdc3(rpcUrl);
  });

  async function connect() {
    if (!window.ethereum) throw new Error('MetaMask not installed');

    await window.ethereum.request({ method: 'eth_requestAccounts' });

    const browserXdc = new Xdc3(window.ethereum);
    const accounts = await browserXdc.eth.getAccounts();

    xdc.value = browserXdc;
    account.value = accounts[0];

    // Get balance
    const bal = await browserXdc.eth.getBalance(accounts[0]);
    balance.value = browserXdc.utils.fromWei(bal, 'ether');
  }

  return { xdc, account, balance, connect };
}
```

```vue
<!-- WalletConnect.vue -->
<template>
  <div>
    <button v-if="!account" @click="connect">Connect to XDC</button>
    <div v-else>
      <p>Address: {{ account }}</p>
      <p>Balance: {{ balance }} XDC</p>
    </div>
  </div>
</template>

<script setup>
import { useXdc } from './composables/useXdc';

const { account, balance, connect } = useXdc();
</script>
```

### Node.js / Backend

```javascript
// server.js
import Xdc3 from 'xdc3';
import express from 'express';

const app = express();
const xdc = new Xdc3('https://rpc.xinfin.network');

// API endpoint to check balance
app.get('/balance/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const balance = await xdc.eth.getBalance(address);

    res.json({
      address,
      balance: xdc.utils.fromWei(balance, 'ether'),
      currency: 'XDC'
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// API endpoint to get transaction status
app.get('/tx/:hash', async (req, res) => {
  try {
    const receipt = await xdc.eth.getTransactionReceipt(req.params.hash);

    if (!receipt) {
      return res.json({ status: 'pending' });
    }

    res.json({
      status: receipt.status ? 'success' : 'failed',
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
      transactionHash: receipt.transactionHash
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.listen(3000, () => console.log('XDC API running on port 3000'));
```

---

## Testing Utilities

### Local Testing Setup

```javascript
// test/setup.js
import Xdc3 from 'xdc3';

// Use Apothem for testing
export const TEST_RPC = 'https://rpc.apothem.network';
export const testXdc = new Xdc3(TEST_RPC);

// Test account (use a faucet-funded account)
export const TEST_ACCOUNT = {
  address: '0x...',
  privateKey: '0x...'
};

// Add to wallet before each test
beforeEach(() => {
  testXdc.eth.accounts.wallet.add(TEST_ACCOUNT.privateKey);
});
```

### Contract Testing

```javascript
// test/contract.test.js
import { testXdc, TEST_ACCOUNT } from './setup.js';

const ABI = [/* ... */];
const BYTECODE = '0x...';

describe('Token Contract', () => {
  let contract;

  beforeAll(async () => {
    const Contract = new testXdc.eth.Contract(ABI);
    const deployTx = Contract.deploy({ data: BYTECODE });

    const gas = await deployTx.estimateGas({ from: TEST_ACCOUNT.address });
    contract = await deployTx.send({
      from: TEST_ACCOUNT.address,
      gas
    });
  });

  test('should have correct initial supply', async () => {
    const totalSupply = await contract.methods.totalSupply().call();
    expect(totalSupply).toBe('1000000000000000000000000');
  });

  test('should transfer tokens', async () => {
    const receipt = await contract.methods.transfer('0x...', '1000')
      .send({ from: TEST_ACCOUNT.address });

    expect(receipt.status).toBe(true);
  });
});
```

---

## TypeScript Support

### Type Definitions

```typescript
// types/xdc3.d.ts
declare module 'xdc3' {
  import { EventEmitter } from 'events';

  export default class Xdc3 {
    static version: string;
    static utils: Xdc3Utils;
    static providers: {
      HttpProvider: new (url: string, options?: any) => any;
      WebsocketProvider: new (url: string, options?: any) => any;
    };

    constructor(provider: string | any);

    eth: {
      accounts: {
        create(entropy?: string): Account;
        privateKeyToAccount(privateKey: string): Account;
        wallet: {
          add(account: string | Account): Account;
          remove(index: number): boolean;
          clear(): void;
          length: number;
        };
      };
      getBalance(address: string): Promise<string>;
      getTransactionCount(address: string, block?: string): Promise<number>;
      getBlock(blockHashOrNumber: string | number): Promise<Block>;
      getTransaction(hash: string): Promise<Transaction>;
      getTransactionReceipt(hash: string): Promise<Receipt>;
      sendTransaction(tx: TransactionConfig): Promise<Receipt>;
      getGasPrice(): Promise<string>;
      getChainId(): Promise<number>;
      getBlockNumber(): Promise<number>;
      estimateGas(tx: TransactionConfig): Promise<number>;
      getCode(address: string): Promise<string>;
      subscribe(type: string, options?: any): EventEmitter;
      Contract: new (abi: any[], address?: string) => Contract;
    };
  }

  interface Xdc3Utils {
    toXdcAddress(address: string): string;
    fromXdcAddress(address: string): string;
    isXdcAddress(address: string): boolean;
    isAddress(address: string): boolean;
    toWei(value: string, unit: string): string;
    fromWei(value: string, unit: string): string;
    sha3(value: string): string;
    keccak256(value: string): string;
    soliditySha3(...values: any[]): string;
    encodePacked(...values: any[]): string;
  }

  interface Account {
    address: string;
    privateKey: string;
    signTransaction(tx: TransactionConfig): Promise<SignedTransaction>;
    sign(data: string): Signature;
  }

  interface TransactionConfig {
    from?: string;
    to?: string;
    value?: string | number;
    gas?: number;
    gasPrice?: string;
    data?: string;
    nonce?: number;
  }

  interface Transaction {
    hash: string;
    nonce: number;
    from: string;
    to: string | null;
    value: string;
    gasPrice: string;
    gas: number;
    input: string;
  }

  interface Receipt {
    transactionHash: string;
    blockNumber: number;
    status: boolean;
    gasUsed: number;
    logs: Log[];
  }

  interface Block {
    number: number;
    hash: string;
    timestamp: number;
    transactions: string[];
  }

  interface Log {
    address: string;
    topics: string[];
    data: string;
  }

  interface Contract {
    methods: {
      [methodName: string]: (...args: any[]) => ContractMethod;
    };
    events: {
      [eventName: string]: (options?: any) => EventEmitter;
    };
    deploy(options: { data: string; arguments?: any[] }): ContractDeployer;
    options: {
      address: string;
    };
  }

  interface ContractMethod {
    call(options?: any): Promise<any>;
    send(options: TransactionConfig): Promise<Receipt>;
    estimateGas(options?: any): Promise<number>;
    encodeABI(): string;
  }

  interface ContractDeployer {
    send(options: TransactionConfig): Promise<Contract>;
    estimateGas(options?: any): Promise<number>;
    encodeABI(): string;
  }

  interface SignedTransaction {
    messageHash: string;
    rawTransaction: string;
    transactionHash: string;
  }

  interface Signature {
    message: string;
    messageHash: string;
    v: string;
    r: string;
    s: string;
    signature: string;
  }
}
```

### Typed Usage Example

```typescript
import Xdc3 from 'xdc3';

const xdc: Xdc3 = new Xdc3('https://rpc.xinfin.network');

async function getBalanceTyped(address: string): Promise<string> {
  const balance: string = await xdc.eth.getBalance(address);
  return xdc.utils.fromWei(balance, 'ether');
}
```

---

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `invalid chain id` | Wrong network in MetaMask | Set chainId to 50 (Mainnet) or 51 (Apothem) |
| `insufficient funds` | Empty wallet or wrong network | Get testnet XDC from faucet.apothem.network |
| `nonce too low` | Stuck pending transaction | Reset account in MetaMask or manually set nonce |
| `gas required exceeds allowance` | Gas limit too low | Set gas limit to 500000+ for contract calls |
| `connection not open` | WebSocket disconnected | Check network, add reconnection logic |
| `invalid address` | Mixed `0x`/`xdc` prefixes | Use `Xdc3.utils.fromXdcAddress()` to normalize |
| `Contract has not been deployed` | Wrong contract address | Verify address on XDCScan |
| `Transaction was not mined within 50 blocks` | Network congestion | Increase gas price or retry |

---

## Related Topics

- [JavaScript SDK Guide](./javascript.md): General web3.js and ethers.js guide
- [JSON-RPC API Reference](../api/json-rpc.md): Raw RPC methods
- [Smart Contract Development](../smartcontract/index.md): Contract writing and deployment
- [Wallet Configuration](../xdcchain/developers/wallet-configuration.md): MetaMask setup
- [Account Abstraction](../smartcontract/account-abstraction.md): Advanced wallet patterns
