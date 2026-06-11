---
title: Monitor Smart Contracts
description: Monitor XDC smart contract events, transactions, and state changes using Web3.js, Ethers.js, and block explorers.
---

Difficulty: Intermediate | Time: ~20 minutes | Tools: Node.js, Web3.js / Ethers.js

# Monitor Smart Contracts

Monitoring lets you track contract activity in real time — events, transactions, and state changes. This guide covers programmatic monitoring using JavaScript and block explorer tools.

## Prerequisites

- Contract deployed and verified
- Node.js installed
- RPC endpoint access

---

## Event Monitoring

### Using Ethers.js

```javascript title="monitor.js"
const { ethers } = require("ethers");

const RPC_URL = "https://rpc.apothem.network";
const CONTRACT_ADDRESS = "0xYOUR_CONTRACT_ADDRESS";
const ABI = [
  "event CountIncremented(uint256 newCount)",
  "event CountDecremented(uint256 newCount)",
  "function getCount() view returns (uint256)"
];

async function monitor() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

  // Listen for events
  contract.on("CountIncremented", (newCount) => {
    console.log(`Count incremented to: ${newCount}`);
  });

  contract.on("CountDecremented", (newCount) => {
    console.log(`Count decremented to: ${newCount}`);
  });

  console.log("Monitoring events... Press Ctrl+C to stop");
}

monitor();
```

Run:

```bash title="Terminal"
node monitor.js
```

**Expected output:**

```
Monitoring events... Press Ctrl+C to stop
Count incremented to: 1
Count incremented to: 2
```

### Using Web3.js

```javascript title="monitor-web3.js"
const Web3 = require("web3");

const web3 = new Web3("https://rpc.apothem.network");
const CONTRACT_ADDRESS = "0xYOUR_CONTRACT_ADDRESS";
const ABI = [
  {
    anonymous: false,
    inputs: [{ indexed: false, name: "newCount", type: "uint256" }],
    name: "CountIncremented",
    type: "event"
  }
];

const contract = new web3.eth.Contract(ABI, CONTRACT_ADDRESS);

contract.events.CountIncremented()
  .on("data", (event) => {
    console.log("Incremented:", event.returnValues.newCount);
  })
  .on("error", console.error);
```

---

## Transaction Tracking

### Check Transaction Status

```javascript title="check-tx.js"
const { ethers } = require("ethers");

const provider = new ethers.JsonRpcProvider("https://rpc.apothem.network");

async function checkTransaction(txHash) {
  const receipt = await provider.getTransactionReceipt(txHash);
  
  if (receipt) {
    console.log("Status:", receipt.status === 1 ? "Success" : "Failed");
    console.log("Block:", receipt.blockNumber);
    console.log("Gas used:", receipt.gasUsed.toString());
  } else {
    console.log("Transaction not found or pending");
  }
}

checkTransaction("0xYOUR_TX_HASH");
```

### Poll for Confirmations

```javascript title="poll-confirmations.js"
async function waitForConfirmations(txHash, confirmations = 5) {
  const receipt = await provider.waitForTransaction(txHash, confirmations);
  console.log(`Confirmed in block ${receipt.blockNumber}`);
}
```

---

## State Monitoring

### Read Contract State

```javascript title="read-state.js"
async function readState() {
  const count = await contract.getCount();
  console.log("Current count:", count.toString());
}

// Poll every 10 seconds
setInterval(readState, 10000);
```

### Monitor Balance

```javascript title="monitor-balance.js"
async function monitorBalance(address) {
  const balance = await provider.getBalance(address);
  console.log("Balance:", ethers.formatEther(balance), "XDC");
}
```

---

## XDCScan API

### Get Contract Transactions

```bash title="Terminal"
curl "https://testnet.xdcscan.com/api?module=account&action=txlist&address=0xYOUR_CONTRACT_ADDRESS&startblock=0&endblock=99999999&sort=asc"
```

### Get Contract ABI

```bash title="Terminal"
curl "https://testnet.xdcscan.com/api?module=contract&action=getabi&address=0xYOUR_CONTRACT_ADDRESS"
```

---

## Alerting

### Simple Alert Script

```javascript title="alert.js"
const { ethers } = require("ethers");

async function alertOnLargeIncrement() {
  contract.on("CountIncremented", (newCount) => {
    if (newCount > 100) {
      console.log("ALERT: Count exceeded 100!");
      // Send email, Slack message, etc.
    }
  });
}

alertOnLargeIncrement();
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Events not firing | Wrong RPC | Use WebSocket RPC if available |
| High latency | Polling too fast | Increase interval to 30s |
| Missed events | Connection dropped | Implement reconnection logic |
| Rate limited | Too many requests | Add delays between calls |

---

## 🚀 Next Steps

You're monitoring your contract. Level up:

1. **[Upgrade Contract →](./upgradeability.md)** — Implement proxy patterns for updates (⏱️ 30 min)
2. **[Security Best Practices →](../security/security-practices.md)** — Audit checklist before mainnet (⏱️ 20 min)
3. **[JavaScript SDK →](../sdks/javascript.md)** — Build a frontend for your contract (⏱️ 25 min)

Or explore:
- [Token Standards →](./tokens.md) — Deploy and monitor XRC20/XRC721 tokens
- [Data Analytics →](./data-analytics.md) — Analyze on-chain metrics
- [API Reference →](../api/index.md) — Full RPC method documentation
