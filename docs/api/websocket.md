---
title: WebSocket API — Real-Time Event Subscriptions
description: Complete WebSocket API reference for XDC Network. Connection setup, subscription methods, event filtering, reconnection handling, and production patterns for real-time dApps.
---

# WebSocket API

XDC Network provides WebSocket endpoints for real-time event subscriptions, enabling developers to build live transaction monitors, price trackers, event-driven dApps, and trading applications without inefficient HTTP polling.

---

## Overview

| Feature | WebSocket | HTTP Polling |
|---------|-----------|--------------|
| **Latency** | ~50ms (push) | 1–5s (poll interval) |
| **Server Load** | Low (event-driven) | High (repeated requests) |
| **Connection** | Persistent | Per-request |
| **Use Case** | Real-time apps, trading | Simple queries, batch ops |
| **Bandwidth** | Minimal (only events) | Higher (full responses) |

**When to use WebSocket:**
- Live transaction monitoring
- Block production tracking
- Event log filtering
- Pending transaction observation
- Price feed updates
- Wallet balance notifications

**When to use HTTP:**
- Historical data queries
- One-off balance checks
- Contract state reads
- Batch operations

---

## Connection Setup

### Endpoints

| Network | WebSocket URL |
|---------|--------------|
| **Mainnet** | `wss://ws.xinfin.network` |
| **Apothem Testnet** | `wss://ws.apothem.network` |
| **Devnet** | `wss://ws.devnet.xinfin.network` |

> 💡 **Note:** If the WebSocket endpoint is unavailable, you can use HTTP polling as a fallback. Some RPC providers may require API keys for WebSocket access.

### Connection Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `reconnect` | `true` | Auto-reconnect on disconnect |
| `reconnectInterval` | `1000` | Initial reconnect delay (ms) |
| `maxReconnectAttempts` | `5` | Max reconnection attempts |
| `timeout` | `30000` | Connection timeout (ms) |
| `heartbeat` | `15000` | Keep-alive ping interval (ms) |

### JavaScript (Ethers.js v6)

```javascript
import { WebSocketProvider } from 'ethers';

const WS_URL = 'wss://ws.apothem.network';

// Basic connection
const provider = new WebSocketProvider(WS_URL);

// With reconnection handling
const provider = new WebSocketProvider(WS_URL, undefined, {
  staticNetwork: true
});

// Handle connection events
provider.on('open', () => {
  console.log('WebSocket connected');
});

provider.on('close', (code, reason) => {
  console.log(`WebSocket closed: ${code} - ${reason}`);
});

provider.on('error', (error) => {
  console.error('WebSocket error:', error);
});
```

### JavaScript (Web3.js v4)

```javascript
import { Web3 } from 'web3';

const WS_URL = 'wss://ws.apothem.network';

const web3 = new Web3(WS_URL);

// Connection event handling
web3.eth.net.isListening()
  .then(() => console.log('WebSocket connected'))
  .catch((error) => console.error('Connection failed:', error));

// Error handling
web3.on('error', (error) => {
  console.error('WebSocket error:', error);
});

// Reconnection (Web3.js handles automatically)
```

### Python (Web3.py)

```python
from web3 import Web3

WS_URL = 'wss://ws.apothem.network'

# Basic connection
w3 = Web3(Web3.WebsocketProvider(WS_URL))

# With custom parameters
w3 = Web3(Web3.WebsocketProvider(
    WS_URL,
    websocket_timeout=30,
    websocket_kwargs={
        'ping_interval': 15,
        'ping_timeout': 10
    }
))

print(f"Connected: {w3.is_connected()}")
```

### Go

```go
package main

import (
    "context"
    "fmt"
    "log"
    "time"

    "github.com/ethereum/go-ethereum/ethclient"
)

func main() {
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    client, err := ethclient.DialContext(ctx, "wss://ws.apothem.network")
    if err != nil {
        log.Fatal(err)
    }
    defer client.Close()

    // Verify connection
    blockNumber, err := client.BlockNumber(ctx)
    if err != nil {
        log.Fatal(err)
    }

    fmt.Printf("Connected. Current block: %d\n", blockNumber)
}
```

---

## Subscription Methods

### 1. New Block Headers (`eth_subscribe` with `newHeads`)

Receive a notification every time a new block is added to the chain.

**Subscribe:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "eth_subscribe",
  "params": ["newHeads"]
}
```

**Notification:**

```json
{
  "jsonrpc": "2.0",
  "method": "eth_subscription",
  "params": {
    "subscription": "0x9ce59a13059e417087c02d3236a0b1cc",
    "result": {
      "number": "0x1234",
      "hash": "0xabc123...",
      "parentHash": "0xdef456...",
      "timestamp": "0x60a7b2c3",
      "miner": "0x71c7656ec7ab88b098defb751b7401b5f6d8976f",
      "gasUsed": "0x5208",
      "gasLimit": "0x1c9c380",
      "transactions": ["0xtx1...", "0xtx2..."]
    }
  }
}
```

**JavaScript Example:**

```javascript
// Ethers.js
provider.on('block', (blockNumber) => {
  console.log(`New block: ${blockNumber}`);
});

// Web3.js
const subscription = await web3.eth.subscribe('newBlockHeaders');
subscription.on('data', (blockHeader) => {
  console.log(`New block: ${blockHeader.number}`);
  console.log(`Hash: ${blockHeader.hash}`);
  console.log(`Timestamp: ${new Date(blockHeader.timestamp * 1000)}`);
});

// Unsubscribe
await subscription.unsubscribe();
```

**Python Example:**

```python
import asyncio

async def watch_blocks():
    subscription_id = await w3.eth.subscribe('newHeads')
    
    async for response in w3.socket.process_subscriptions():
        block = response['result']
        print(f"New block: {int(block['number'], 16)}")
        print(f"Hash: {block['hash']}")
        print(f"Transactions: {len(block['transactions'])}")
        print("---")

asyncio.run(watch_blocks())
```

---

### 2. Pending Transactions (`eth_subscribe` with `newPendingTransactions`)

Receive the transaction hash of every transaction submitted to the mempool.

**Subscribe:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "eth_subscribe",
  "params": ["newPendingTransactions"]
}
```

**JavaScript Example:**

```javascript
// Ethers.js
provider.on('pending', (txHash) => {
  console.log(`Pending tx: ${txHash}`);
});

// Web3.js
const subscription = await web3.eth.subscribe('pendingTransactions');
subscription.on('data', async (txHash) => {
  console.log(`Pending: ${txHash}`);
  
  // Optionally fetch full transaction details
  const tx = await web3.eth.getTransaction(txHash);
  if (tx) {
    console.log(`From: ${tx.from}`);
    console.log(`To: ${tx.to}`);
    console.log(`Value: ${web3.utils.fromWei(tx.value, 'ether')} XDC`);
  }
});
```

**Use Cases:**
- Mempool monitoring
- Front-running protection
- Transaction pre-validation
- Gas price estimation

---

### 3. Event Logs (`eth_subscribe` with `logs`)

Subscribe to specific contract events using filters.

**Subscribe with Filter:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "eth_subscribe",
  "params": [
    "logs",
    {
      "address": "0xTokenContractAddress",
      "topics": [
        "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
      ]
    }
  ]
}
```

**Filter Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `address` | `string` | Contract address to monitor |
| `topics` | `array` | Event signature hashes (up to 4) |
| `fromBlock` | `string` | Starting block (hex) |
| `toBlock` | `string` | Ending block (hex) |

**JavaScript Example — Track Token Transfers:**

```javascript
const TOKEN_ADDRESS = '0xYourTokenContractAddress';
const TRANSFER_EVENT = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

// Ethers.js — Filter for Transfer events
const filter = {
  address: TOKEN_ADDRESS,
  topics: [
    TRANSFER_EVENT,           // Event signature
    null,                     // Any sender
    null                      // Any recipient
  ]
};

provider.on(filter, (log) => {
  const parsed = contract.interface.parseLog(log);
  console.log(`Transfer: ${parsed.args.from} → ${parsed.args.to}`);
  console.log(`Amount: ${ethers.formatUnits(parsed.args.value, 18)}`);
});

// Web3.js
const subscription = await web3.eth.subscribe('logs', {
  address: TOKEN_ADDRESS,
  topics: [TRANSFER_EVENT]
});

subscription.on('data', (log) => {
  const from = '0x' + log.topics[1].slice(26);
  const to = '0x' + log.topics[2].slice(26);
  const amount = web3.utils.fromWei(
    web3.utils.toBN(log.data),
    'ether'
  );
  
  console.log(`Transfer: ${from} → ${to}`);
  console.log(`Amount: ${amount}`);
});
```

**Python Example:**

```python
import asyncio

async def watch_transfers():
    TOKEN_ADDRESS = '0xYourTokenContractAddress'
    TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
    
    subscription_id = await w3.eth.subscribe('logs', {
        'address': TOKEN_ADDRESS,
        'topics': [TRANSFER_TOPIC]
    })
    
    async for response in w3.socket.process_subscriptions():
        log = response['result']
        from_addr = '0x' + log['topics'][1][26:]
        to_addr = '0x' + log['topics'][2][26:]
        amount = int(log['data'], 16) / 10**18
        
        print(f"Transfer: {from_addr} -> {to_addr}")
        print(f"Amount: {amount}")
        print("---")

asyncio.run(watch_transfers())
```

---

### 4. Account Balance Changes

While there's no direct `balance` subscription, you can track incoming transfers to an address.

**JavaScript Example:**

```javascript
const MY_ADDRESS = '0xYourAddress';

// Track all incoming transfers
const filter = {
  topics: [
    TRANSFER_EVENT,
    null,
    ethers.zeroPadValue(MY_ADDRESS, 32)  // Recipient is my address
  ]
};

provider.on(filter, async (log) => {
  const tx = await provider.getTransaction(log.transactionHash);
  console.log(`Incoming transfer!`);
  console.log(`From: ${tx.from}`);
  console.log(`Amount: ${ethers.formatEther(tx.value)} XDC`);
});
```

---

## Unsubscribing

Always unsubscribe when your application no longer needs the data to free up server resources.

```javascript
// Ethers.js
provider.off('block');
provider.off(filter);

// Web3.js
await subscription.unsubscribe();

// Python
await w3.eth.unsubscribe(subscription_id)
```

---

## Production Patterns

### Pattern 1: Connection Manager with Auto-Reconnect

```javascript
class WebSocketManager {
  constructor(url) {
    this.url = url;
    this.provider = null;
    this.subscriptions = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000;
  }

  async connect() {
    try {
      this.provider = new WebSocketProvider(this.url, undefined, {
        staticNetwork: true
      });

      this.provider.on('open', () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.resubscribeAll();
      });

      this.provider.on('close', () => {
        console.log('WebSocket closed');
        this.handleReconnect();
      });

      this.provider.on('error', (error) => {
        console.error('WebSocket error:', error);
      });

      return this.provider;
    } catch (error) {
      console.error('Connection failed:', error);
      this.handleReconnect();
    }
  }

  handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    setTimeout(() => this.connect(), delay);
  }

  subscribe(name, filter, callback) {
    this.subscriptions.set(name, { filter, callback });
    this.provider.on(filter, callback);
  }

  resubscribeAll() {
    for (const [name, { filter, callback }] of this.subscriptions) {
      this.provider.on(filter, callback);
      console.log(`Resubscribed: ${name}`);
    }
  }

  unsubscribe(name) {
    const sub = this.subscriptions.get(name);
    if (sub) {
      this.provider.off(sub.filter, sub.callback);
      this.subscriptions.delete(name);
    }
  }

  async disconnect() {
    if (this.provider) {
      await this.provider.destroy();
      this.provider = null;
    }
  }
}

// Usage
const manager = new WebSocketManager('wss://ws.apothem.network');
await manager.connect();

manager.subscribe('blocks', 'block', (blockNumber) => {
  console.log(`Block: ${blockNumber}`);
});
```

### Pattern 2: Event-Driven Price Tracker

```javascript
class PriceTracker {
  constructor(provider, pairAddress) {
    this.provider = provider;
    this.pairAddress = pairAddress;
    this.priceHistory = [];
    this.callbacks = [];
  }

  async start() {
    const swapEvent = '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822';
    
    const filter = {
      address: this.pairAddress,
      topics: [swapEvent]
    };

    this.provider.on(filter, async (log) => {
      const price = await this.calculatePrice();
      this.priceHistory.push({
        timestamp: Date.now(),
        price: price
      });

      // Keep last 1000 data points
      if (this.priceHistory.length > 1000) {
        this.priceHistory.shift();
      }

      this.callbacks.forEach(cb => cb(price));
    });
  }

  onPriceUpdate(callback) {
    this.callbacks.push(callback);
  }

  async calculatePrice() {
    // Implement price calculation from reserves
    // This is DEX-specific
  }

  getPriceHistory() {
    return this.priceHistory;
  }
}
```

### Pattern 3: Multi-Source Fallback

```javascript
class ResilientProvider {
  constructor(endpoints) {
    this.endpoints = endpoints;
    this.currentIndex = 0;
    this.provider = null;
  }

  async connect() {
    for (let i = 0; i < this.endpoints.length; i++) {
      const endpoint = this.endpoints[this.currentIndex];
      
      try {
        this.provider = new WebSocketProvider(endpoint, undefined, {
          staticNetwork: true
        });
        
        // Test connection
        await this.provider.getBlockNumber();
        console.log(`Connected to: ${endpoint}`);
        return this.provider;
        
      } catch (error) {
        console.warn(`Failed to connect to ${endpoint}:`, error.message);
        this.currentIndex = (this.currentIndex + 1) % this.endpoints.length;
      }
    }
    
    throw new Error('All WebSocket endpoints failed');
  }

  getProvider() {
    return this.provider;
  }
}

// Usage
const resilient = new ResilientProvider([
  'wss://ws.xinfin.network',
  'wss://ws.apothem.network',
  'wss://ws.backup-provider.com'
]);

await resilient.connect();
```

---

## Rate Limiting

| Tier | Max Connections | Max Subscriptions/Conn | Rate Limit |
|------|----------------|------------------------|------------|
| **Free** | 1 | 10 | 100 msg/min |
| **Developer** | 5 | 50 | 1000 msg/min |
| **Enterprise** | Unlimited | Unlimited | Custom SLA |

**Best Practices:**
- Use a single connection with multiple subscriptions instead of multiple connections
- Unsubscribe when data is no longer needed
- Implement backoff on reconnection
- Cache data locally to reduce redundant processing

---

## Error Handling

### Common Error Codes

| Code | Message | Solution |
|------|---------|----------|
| `-32000` | Subscription not found | Re-subscribe |
| `-32001` | Too many subscriptions | Reduce active subscriptions |
| `-32002` | Connection rate limited | Implement backoff |
| `-32003` | Invalid filter format | Check topics/address format |
| `1006` | Connection closed abnormally | Reconnect |

### Error Handling Pattern

```javascript
provider.on('error', (error) => {
  if (error.code === 'TIMEOUT') {
    console.log('Connection timeout, reconnecting...');
    reconnect();
  } else if (error.code === 'SERVER_ERROR') {
    console.log('Server error, switching endpoint...');
    switchEndpoint();
  } else {
    console.error('Unexpected error:', error);
  }
});
```

---

## Performance Comparison

### WebSocket vs HTTP Polling

| Metric | WebSocket | HTTP Polling (1s) | HTTP Polling (5s) |
|--------|-----------|-------------------|-------------------|
| **Latency** | ~50ms | 500ms avg | 2500ms avg |
| **Requests/min** | 1 (persistent) | 60 | 12 |
| **Bandwidth/min** | ~5KB | ~60KB | ~12KB |
| **Server CPU** | Low | High | Medium |
| **Missed Events** | None | Possible | Likely |

**Recommendation:** Use WebSocket for real-time applications. Use HTTP for historical queries and batch operations.

---

## Complete Example: Live Transaction Monitor

```javascript
import { WebSocketProvider, ethers } from 'ethers';

class TransactionMonitor {
  constructor(wsUrl) {
    this.provider = new WebSocketProvider(wsUrl);
    this.transactions = [];
  }

  async startMonitoring(address) {
    console.log(`Monitoring transactions for ${address}...`);

    // Track incoming transfers
    const filter = {
      topics: [
        ethers.id('Transfer(address,address,uint256)'),
        null,
        ethers.zeroPadValue(address, 32)
      ]
    };

    this.provider.on(filter, async (log) => {
      const tx = await this.provider.getTransaction(log.transactionHash);
      const receipt = await this.provider.getTransactionReceipt(log.transactionHash);
      
      const transaction = {
        hash: log.transactionHash,
        from: tx.from,
        to: tx.to,
        value: ethers.formatEther(tx.value),
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? 'Success' : 'Failed',
        timestamp: new Date().toISOString()
      };

      this.transactions.push(transaction);
      this.notify(transaction);
    });

    // Also monitor native XDC transfers
    this.provider.on('pending', async (txHash) => {
      const tx = await this.provider.getTransaction(txHash);
      if (tx && tx.to && tx.to.toLowerCase() === address.toLowerCase()) {
        console.log(`Incoming native XDC: ${ethers.formatEther(tx.value)} from ${tx.from}`);
      }
    });
  }

  notify(tx) {
    console.log('\n🚨 New Transaction!');
    console.log(`Hash: ${tx.hash}`);
    console.log(`From: ${tx.from}`);
    console.log(`Amount: ${tx.value} XDC`);
    console.log(`Status: ${tx.status}`);
    console.log('-------------------');
  }

  getTransactions() {
    return this.transactions;
  }

  async stop() {
    await this.provider.destroy();
  }
}

// Usage
const monitor = new TransactionMonitor('wss://ws.apothem.network');
await monitor.startMonitoring('0xYourAddress');

// Keep running
process.on('SIGINT', async () => {
  console.log('\nStopping monitor...');
  await monitor.stop();
  process.exit(0);
});
```

---

## Resources

| Resource | Link |
|----------|------|
| JSON-RPC API | [API Reference](./json-rpc.md) |
| Ethers.js Docs | [docs.ethers.io](https://docs.ethers.io) |
| Web3.js Docs | [web3js.readthedocs.io](https://web3js.readthedocs.io) |
| Web3.py Docs | [web3py.readthedocs.io](https://web3py.readthedocs.io) |
| Go Ethereum | [geth.ethereum.org](https://geth.ethereum.org) |

---

## 🚀 Next Steps

1. **[JSON-RPC API →](./json-rpc.md)** — Complete HTTP API reference (⏱️ 20 min)
2. **[Smart Contract Events →](../smartcontract/writing.md)** — Emit and handle custom events (⏱️ 15 min)
3. **[Token Standards →](../smartcontract/tokens/index.md)** — Build tokens with event emissions (⏱️ 30 min)

Or explore:
- **[Hardhat Deployment →](../smartcontract/hardhat.md)** — Deploy contracts with event logging
- **[Security Practices →](../security/security-practices.md)** — Secure your real-time applications
