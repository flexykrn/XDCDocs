---
title: "xdc3.js SDK"
sidebar_position: 10
---

# xdc3.js SDK

xdc3.js is the XDC Network's flavor of the popular web3.js JavaScript library. It provides a complete toolkit for interacting with the XDC blockchain from Node.js or the browser: reading chain state, sending transactions, and working with smart contracts. This page walks through installation, connecting to the network, and the most common operations with working examples.

## What is xdc3.js?

Because the XDC Network is fully EVM-compatible, standard Ethereum libraries like ethers.js and web3.js work out of the box — see [Migrating from EVM to XDC](/docs/xdc-chain/evmtoxdc). xdc3.js is a fork of web3.js maintained for the XDC ecosystem, and its main addition on top of web3.js is native handling of the XDC address prefix (`xdc...`) alongside the standard `0x` format.

Use xdc3.js when you:

- Maintain an existing web3.js-based codebase and want XDC address support
- Need utilities to convert between `0x` and `xdc` address formats
- Prefer the web3.js API style (`xdc3.eth.*`, `xdc3.utils.*`)

## Installation

Install the package from npm:

```bash
npm install xdc3
```

Then import it in your project:

```javascript
const Xdc3 = require("xdc3");
// or, with ES modules:
// import Xdc3 from "xdc3";
```

## Connecting to the Network

Point xdc3.js at a public RPC endpoint. The canonical endpoints are:

| Network | Chain ID | RPC URL |
|---|---|---|
| **Mainnet** | 50 | `https://erpc.xinfin.network` |
| **Apothem Testnet** | 51 | `https://rpc.apothem.network` |

```javascript
const Xdc3 = require("xdc3");

// XDC Mainnet (Chain ID 50)
const xdc3 = new Xdc3("https://erpc.xinfin.network");

// Apothem Testnet (Chain ID 51)
const xdc3Testnet = new Xdc3("https://rpc.apothem.network");
```

Always develop and test against Apothem first — free test XDC is available from the [faucet](https://faucet.blocksscan.io/). See the [Mainnet RPC Endpoints](/docs/xdc-chain/developers/mainnetrpc) page for the full list of public endpoints.

## Address Formats: 0x vs xdc

Every XDC account can be written in two equivalent formats:

- `0x1234567890abcdef1234567890abcdef12345678` (used by EVM tools like MetaMask)
- `xdc1234567890abcdef1234567890abcdef12345678` (displayed by XDCScan)

Only the prefix differs — the rest of the address is identical. xdc3.js ships utilities to convert between the two:

```javascript
// Convert a 0x address to the xdc-prefixed format
const xdcAddress = Xdc3.utils.toXdcAddress("0x1234567890abcdef1234567890abcdef12345678");
// -> "xdc1234567890abcdef1234567890abcdef12345678"

// Convert an xdc-prefixed address back to 0x
const hexAddress = Xdc3.utils.fromXdcAddress("xdc1234567890abcdef1234567890abcdef12345678");
// -> "0x1234567890abcdef1234567890abcdef12345678"
```

Most RPC methods accept either format, but converting explicitly keeps your code unambiguous.

## Reading Chain State

Read-only calls do not require a wallet or any gas:

```javascript
// Latest block number
const blockNumber = await xdc3.eth.getBlockNumber();
console.log("Latest block:", blockNumber);

// Balance of an account (returned in Wei)
const balance = await xdc3.eth.getBalance("xdc1234567890abcdef1234567890abcdef12345678");
console.log("Balance:", Xdc3.utils.fromWei(balance, "ether"), "XDC");

// Look up a transaction by hash
const tx = await xdc3.eth.getTransaction(
  "0xabcdef0000000000000000000000000000000000000000000000000000000000"
);
console.log("From:", tx.from, "To:", tx.to, "Value:", tx.value);
```

## Sending a Transaction

To send XDC you need a funded account and its private key. **Never hardcode private keys in source code** — load them from environment variables or a secrets manager:

```javascript
require("dotenv").config();

const account = xdc3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY);
xdc3.eth.accounts.wallet.add(account);

const receipt = await xdc3.eth.sendTransaction({
  from: account.address,
  to: "xdc1234567890abcdef1234567890abcdef12345678",
  value: Xdc3.utils.toWei("1", "ether"), // 1 XDC
  gas: 21000,
});

console.log("Transaction hash:", receipt.transactionHash);
```

The receipt is returned once the transaction is mined — with XDC's 2-second block times this is fast. Track the transaction on [XDCScan](https://xdcscan.com) (mainnet) or [testnet.xdcscan.com](https://testnet.xdcscan.com) (Apothem).

## Interacting with Smart Contracts

Load a contract from its ABI and address, then use `call()` for read-only methods and `send()` for state-changing methods:

```javascript
const abi = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const contract = new xdc3.eth.Contract(
  abi,
  "xdc9876543210abcdef1234567890abcdef12345678"
);

// Read-only: no gas, no signing
const balance = await contract.methods
  .balanceOf("xdc1234567890abcdef1234567890abcdef12345678")
  .call();

// State-changing: costs gas, requires a funded wallet
const receipt = await contract.methods
  .transfer("xdc1234567890abcdef1234567890abcdef12345678", Xdc3.utils.toWei("10", "ether"))
  .send({ from: account.address });

// Listen for events (requires a WebSocket provider)
const xdc3Ws = new Xdc3("wss://ws.xinfin.network");
const wsContract = new xdc3Ws.eth.Contract(abi, "xdc9876543210abcdef1234567890abcdef12345678");
wsContract.events.Transfer({}, (error, event) => {
  if (!error) console.log("Transfer:", event.returnValues);
});
```

For real-time subscriptions and the underlying WebSocket/JSON-RPC methods, see the [JSON-RPC reference](/docs/api-reference/json-rpc).

## Error Handling and Common Pitfalls

- **Gas price:** XDC uses a low fixed gas price of 0.25 Gwei. If a transaction is rejected, set it explicitly: `gasPrice: Xdc3.utils.toWei("0.25", "gwei")`.
- **Address prefix surprises:** Explorers like XDCScan display `xdc`-prefixed addresses while MetaMask and most EVM tooling show `0x`. If a lookup appears to fail, convert the address with `Xdc3.utils.fromXdcAddress()` first — both forms refer to the same account.
- **Wrong network:** Confirm your provider points at the intended chain (Chain ID 50 for mainnet, 51 for Apothem) before sending transactions.
- **Insufficient funds:** Apothem test XDC is free from the [faucet](https://faucet.blocksscan.io/); mainnet XDC must be acquired from an exchange.
- **Wrap calls in try/catch:** RPC calls reject on network errors and reverts, so handle errors explicitly:

```javascript
try {
  const balance = await xdc3.eth.getBalance(address);
  console.log(Xdc3.utils.fromWei(balance, "ether"), "XDC");
} catch (error) {
  console.error("RPC call failed:", error.message);
}
```

## See Also

- [API Reference](/docs/api-reference/) — JSON-RPC methods and data APIs
- [Quick Guide: XDC Chain](/docs/xdc-chain/developers/quick-guide) — network overview, explorers, and tooling
- [Smart Contracts](/docs/smart-contracts/) — deployment, verification, and token standards
