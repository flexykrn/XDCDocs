---
title: JavaScript & TypeScript SDK Guide
description: Complete guide to building dApps on XDC using web3.js, ethers.js, and React with XDC-specific configurations and copy-pasteable code.
---

**Difficulty:** Beginner | **Time:** ~20 minutes | **Tools:** Node.js `v18+`, npm, MetaMask

# JavaScript & TypeScript SDK Guide

This page covers everything needed to connect a JavaScript or TypeScript application to the XDC Network. You will have a working dApp that reads on-chain data, sends transactions, and listens for events on both XDC Mainnet and Apothem Testnet.

## Prerequisites

- Node.js `v18+` — [Download](https://nodejs.org/)
- MetaMask extension installed in your browser
- XDC testnet wallet with funds — [Apothem faucet](https://faucet.apothem.network)

## 1. Install Dependencies

=== "npm"
    ```bash
    npm install web3 ethers
    ```

=== "yarn"
    ```bash
    yarn add web3 ethers
    ```

Expected output:

```text
added 42 packages in 3s
```

## 2. Configure Network Constants

Create a file that holds XDC-specific network configuration. These values never change.

```javascript title="networks.js"
export const XDC_MAINNET = {
  chainId: 50,
  name: 'XDC Network',
  rpc: 'https://rpc.xinfin.network',
  explorer: 'https://xdcscan.com',
  nativeCurrency: { name: 'XDC', symbol: 'XDC', decimals: 18 }
};

export const XDC_APOTHEM = {
  chainId: 51,
  name: 'XDC Apothem Testnet',
  rpc: 'https://rpc.apothem.network',
  explorer: 'https://testnet.xdcscan.com',
  nativeCurrency: { name: 'XDC', symbol: 'TXDC', decimals: 18 }
};

export const XDC_DEVNET = {
  chainId: 551,
  name: 'XDC Devnet',
  rpc: 'https://devnetrpc.xinfin.network',
  nativeCurrency: { name: 'XDC', symbol: 'XDC', decimals: 18 }
};
```

!!! warning "XDC address prefix differs from Ethereum"
    XDCScan displays `xdc` prefix. EVM tools use `0x`. Same address, different display.
    Convert: `"0x" + xdcAddress.slice(3)` or `"xdc" + ethAddress.slice(2)`

## 3. Connect MetaMask to XDC

=== "JavaScript"
    ```javascript title="connect-wallet.js"
    import { XDC_APOTHEM } from './networks.js';

    export async function connectWallet() {
      if (!window.ethereum) {
        throw new Error('MetaMask not installed');
      }

      // Add XDC Apothem to MetaMask
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0x' + XDC_APOTHEM.chainId.toString(16),
          chainName: XDC_APOTHEM.name,
          rpcUrls: [XDC_APOTHEM.rpc],
          nativeCurrency: XDC_APOTHEM.nativeCurrency,
          blockExplorerUrls: [XDC_APOTHEM.explorer]
        }]
      });

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      return accounts[0]; // Returns 0x... format
    }
    ```

=== "TypeScript"
    ```typescript title="connect-wallet.ts"
    import { XDC_APOTHEM } from './networks.js';

    declare global {
      interface Window {
        ethereum?: any;
      }
    }

    export async function connectWallet(): Promise<string> {
      if (!window.ethereum) {
        throw new Error('MetaMask not installed');
      }

      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0x' + XDC_APOTHEM.chainId.toString(16),
          chainName: XDC_APOTHEM.name,
          rpcUrls: [XDC_APOTHEM.rpc],
          nativeCurrency: XDC_APOTHEM.nativeCurrency,
          blockExplorerUrls: [XDC_APOTHEM.explorer]
        }]
      });

      const accounts: string[] = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      return accounts[0];
    }
    ```

Expected output in browser console:

```text
Connected: 0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bB
```

!!! danger "Never paste your private key"
    Use MetaMask or environment variables. Never commit keys to source control.

## 4. Read On-Chain Data

=== "web3.js"
    ```javascript title="read-data.js"
    import Web3 from 'web3';
    import { XDC_APOTHEM } from './networks.js';

    const web3 = new Web3(XDC_APOTHEM.rpc);

    async function getBalance(address) {
      // Accepts both 0x... and xdc... formats
      const cleanAddress = address.startsWith('xdc')
        ? '0x' + address.slice(3)
        : address;

      const balanceWei = await web3.eth.getBalance(cleanAddress);
      const balanceXdc = web3.utils.fromWei(balanceWei, 'ether');
      return balanceXdc;
    }

    getBalance('0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bB')
      .then(bal => console.log(`Balance: ${bal} XDC`));
    ```

=== "ethers.js"
    ```javascript title="read-data.js"
    import { ethers } from 'ethers';
    import { XDC_APOTHEM } from './networks.js';

    const provider = new ethers.JsonRpcProvider(XDC_APOTHEM.rpc);

    async function getBalance(address) {
      const cleanAddress = address.startsWith('xdc')
        ? '0x' + address.slice(3)
        : address;

      const balanceWei = await provider.getBalance(cleanAddress);
      const balanceXdc = ethers.formatEther(balanceWei);
      return balanceXdc;
    }

    getBalance('0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bB')
      .then(bal => console.log(`Balance: ${bal} XDC`));
    ```

Expected output:

```text
Balance: 1250.5 XDC
```

## 5. Send a Transaction

!!! tip "Always deploy to Apothem first"
    Chain ID 51. Free testnet XDC at https://faucet.apothem.network

=== "web3.js"
    ```javascript title="send-tx.js"
    import Web3 from 'web3';
    import { XDC_APOTHEM } from './networks.js';

    const web3 = new Web3(window.ethereum);

    async function sendXdc(toAddress, amount) {
      const accounts = await web3.eth.getAccounts();
      const from = accounts[0];

      // Handle xdc... prefix
      const cleanTo = toAddress.startsWith('xdc')
        ? '0x' + toAddress.slice(3)
        : toAddress;

      const tx = {
        from,
        to: cleanTo,
        value: web3.utils.toWei(amount.toString(), 'ether'),
        gas: 21000,
        gasPrice: await web3.eth.getGasPrice()
      };

      const receipt = await web3.eth.sendTransaction(tx);
      console.log('Tx hash:', receipt.transactionHash);
      return receipt;
    }

    sendXdc('xdc3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bB', 1.5);
    ```

=== "ethers.js"
    ```javascript title="send-tx.js"
    import { ethers } from 'ethers';
    import { XDC_APOTHEM } from './networks.js';

    const provider = new ethers.BrowserProvider(window.ethereum);

    async function sendXdc(toAddress, amount) {
      const signer = await provider.getSigner();

      const cleanTo = toAddress.startsWith('xdc')
        ? '0x' + toAddress.slice(3)
        : toAddress;

      const tx = await signer.sendTransaction({
        to: cleanTo,
        value: ethers.parseEther(amount.toString())
      });

      const receipt = await tx.wait();
      console.log('Tx hash:', tx.hash);
      return receipt;
    }

    sendXdc('xdc3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bB', 1.5);
    ```

Expected output:

```text
Tx hash: 0xabc123...
```

## 6. Interact with a Smart Contract

=== "web3.js"
    ```javascript title="contract-interaction.js"
    import Web3 from 'web3';

    const ABI = [
      {
        "inputs": [],
        "name": "message",
        "outputs": [{"internalType": "string", "name": "", "type": "string"}],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [{"internalType": "string", "name": "_message", "type": "string"}],
        "name": "updateMessage",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      }
    ];

    const CONTRACT_ADDRESS = '0x...'; // Your deployed contract

    const web3 = new Web3(window.ethereum);
    const contract = new web3.eth.Contract(ABI, CONTRACT_ADDRESS);

    async function readMessage() {
      const msg = await contract.methods.message().call();
      console.log('Message:', msg);
      return msg;
    }

    async function updateMessage(newMessage) {
      const accounts = await web3.eth.getAccounts();
      const receipt = await contract.methods.updateMessage(newMessage)
        .send({ from: accounts[0] });
      console.log('Updated in block:', receipt.blockNumber);
      return receipt;
    }
    ```

=== "ethers.js"
    ```javascript title="contract-interaction.js"
    import { ethers } from 'ethers';

    const ABI = [
      "function message() view returns (string)",
      "function updateMessage(string _message)"
    ];

    const CONTRACT_ADDRESS = '0x...'; // Your deployed contract

    const provider = new ethers.BrowserProvider(window.ethereum);

    async function readMessage() {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
      const msg = await contract.message();
      console.log('Message:', msg);
      return msg;
    }

    async function updateMessage(newMessage) {
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
      const tx = await contract.updateMessage(newMessage);
      const receipt = await tx.wait();
      console.log('Updated in block:', receipt.blockNumber);
      return receipt;
    }
    ```

## 7. Listen for Events

=== "web3.js"
    ```javascript title="events.js"
    import Web3 from 'web3';
    import { XDC_APOTHEM } from './networks.js';

    const web3 = new Web3(XDC_APOTHEM.rpc);

    // Subscribe to new blocks
    const subscription = web3.eth.subscribe('newBlockHeaders')
      .on('data', block => {
        console.log('New block:', block.number);
      })
      .on('error', err => console.error(err));

    // Stop after 60 seconds
    setTimeout(() => subscription.unsubscribe(), 60000);
    ```

=== "ethers.js"
    ```javascript title="events.js"
    import { ethers } from 'ethers';
    import { XDC_APOTHEM } from './networks.js';

    const provider = new ethers.WebSocketProvider(
      'wss://rpc.xinfin.network'
    );

    provider.on('block', blockNumber => {
      console.log('New block:', blockNumber);
    });

    // Stop after 60 seconds
    setTimeout(() => provider.destroy(), 60000);
    ```

Expected output:

```text
New block: 87654321
New block: 87654322
New block: 87654323
```

!!! warning "WebSocket endpoint differs from HTTP"
    Replace `https://` with `wss://` for WebSocket connections to the same RPC host.

## 8. React Integration

```jsx title="XdcProvider.jsx"
import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { XDC_APOTHEM } from './networks.js';

const XdcContext = createContext(null);

export function XdcProvider({ children }) {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [address, setAddress] = useState(null);

  async function connect() {
    if (!window.ethereum) {
      alert('Install MetaMask');
      return;
    }

    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: '0x' + XDC_APOTHEM.chainId.toString(16),
        chainName: XDC_APOTHEM.name,
        rpcUrls: [XDC_APOTHEM.rpc],
        nativeCurrency: XDC_APOTHEM.nativeCurrency,
        blockExplorerUrls: [XDC_APOTHEM.explorer]
      }]
    });

    const browserProvider = new ethers.BrowserProvider(window.ethereum);
    const newSigner = await browserProvider.getSigner();
    const newAddress = await newSigner.getAddress();

    setProvider(browserProvider);
    setSigner(newSigner);
    setAddress(newAddress);
  }

  return (
    <XdcContext.Provider value={{ provider, signer, address, connect }}>
      {children}
    </XdcContext.Provider>
  );
}

export const useXdc = () => useContext(XdcContext);
```

Usage:

```jsx title="App.jsx"
import { useXdc } from './XdcProvider';

function App() {
  const { address, connect } = useXdc();

  return (
    <div>
      {address ? (
        <p>Connected: {address}</p>
      ) : (
        <button onClick={connect}>Connect to XDC</button>
      )}
    </div>
  );
}
```

## Configuration Reference

| Parameter | Mainnet | Apothem Testnet | Devnet |
| --- | --- | --- | --- |
| Chain ID | 50 | 51 | 551 |
| RPC URL | https://rpc.xinfin.network | https://rpc.apothem.network | https://devnetrpc.xinfin.network |
| WebSocket | wss://rpc.xinfin.network | wss://rpc.apothem.network | — |
| Explorer | https://xdcscan.com | https://testnet.xdcscan.com | — |
| Currency | XDC | TXDC | XDC |
| Block Time | ~2 seconds | ~2 seconds | ~2 seconds |

## Troubleshooting

| Error | Cause | Fix |
| --- | --- | --- |
| `invalid chain id` | Used chain 1 instead of 50/51 | Set chainId to 51 for Apothem in wallet_addEthereumChain |
| `invalid address` | Used `0x` prefix with XDCScan | XDCScan uses `xdc` prefix; convert with `"xdc" + addr.slice(2)` |
| `insufficient funds` | Wrong network or empty wallet | Get testnet XDC from faucet.apothem.network |
| `nonce too low` | Stuck pending transaction | Reset account in MetaMask: Settings > Advanced > Reset |
| `gas required exceeds allowance` | Default gas limit too low | Explicitly set gasLimit to 500000 for contract calls |
| `contract verification failed` | Wrong API endpoint | Use https://testnet.xdcscan.com/api for Apothem verification |

## Next Steps

* [Deploy Your First Smart Contract](../smartcontract/deployment-verification.md)
* [Token Standards Reference](../smartcontract/tokens.md)
* [JSON-RPC API Reference](../api/json-rpc.md)
