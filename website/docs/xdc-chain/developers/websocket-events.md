---
title: "WebSocket & Real-Time Events"
sidebar_position: 11
---

# WebSocket & Real-Time Events

The XDC Network supports real-time event subscriptions over WebSocket in addition to standard HTTP JSON-RPC. Subscriptions push new block headers, pending transactions, and contract event logs to your application as they happen — essential for dApps, indexers, and monitoring services. This page covers when to use WebSockets, how to subscribe with ethers.js and xdc3.js, the raw `eth_subscribe` protocol, and production hardening patterns.

## WebSocket vs HTTP Polling

Use a WebSocket subscription instead of polling when you need:

- **Real-time delivery:** events arrive the moment a block is mined — with XDC's 2-second block times, polling `eth_getLogs` in a loop always lags behind.
- **Lower latency:** no round-trip per check; the node pushes data as soon as it is available.
- **Lower RPC load:** one persistent connection replaces thousands of polling requests, keeping you well clear of public RPC rate limits.
- **Simpler logic:** no need to track "last processed block" cursors just to avoid duplicates.

Polling over HTTP is still fine for one-off queries, historical backfills (use `eth_getLogs` over block ranges), and serverless environments where long-lived connections are impractical.

## WebSocket Endpoints

| Network | Chain ID | WebSocket URL |
|---|---|---|
| **Mainnet** | 50 | `wss://ws.xinfin.network` |
| **Apothem Testnet** | 51 | `wss://ws.apothem.network` |

Additional public mainnet endpoints are listed on the [Mainnet RPC Endpoints](/docs/xdc-chain/developers/mainnetrpc) page. Always test against Apothem first — free test XDC is available from the [faucet](https://faucet.blocksscan.io/).

## Subscribing with ethers.js v6

ethers.js ships a `WebSocketProvider` that manages subscriptions for you:

```javascript
const { WebSocketProvider, Contract } = require("ethers");

const provider = new WebSocketProvider("wss://ws.xinfin.network");

// New block headers
provider.on("block", (blockNumber) => {
  console.log("New block:", blockNumber);
});

// Pending transactions (where supported by the node)
provider.on("pending", (txHash) => {
  console.log("Pending tx:", txHash);
});

// Contract event filter
const abi = ["event Transfer(address indexed from, address indexed to, uint256 value)"];
const contract = new Contract("0xTokenAddress", abi, provider);
contract.on("Transfer", (from, to, value, event) => {
  console.log(`Transfer of ${value} from ${from} to ${to} in tx ${event.log.transactionHash}`);
});
```

Note that `pending` transaction streams depend on node support and may not be available on every public endpoint — new block and log subscriptions are the reliable baseline.

## Subscribing with xdc3.js

If you already use [xdc3.js](/docs/xdc-chain/developers/xdc3js-sdk), pass the WebSocket URL to the constructor and use `xdc3.eth.subscribe`:

```javascript
const Xdc3 = require("xdc3");

const xdc3 = new Xdc3("wss://ws.xinfin.network");

const subscription = xdc3.eth.subscribe(
  "logs",
  {
    address: "0x9876543210abcdef1234567890abcdef12345678", // use the 0x form
    topics: [
      "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef", // Transfer(address,address,uint256)
    ],
  },
  (error, log) => {
    if (error) return console.error("Subscription error:", error);
    console.log("Log:", log.blockNumber, log.transactionHash);
  }
);

// Later: stop the subscription
// subscription.unsubscribe();
```

xdc3.js also supports `xdc3.eth.subscribe("newBlockHeaders")` and typed contract event streams via `contract.events` — see the [xdc3.js SDK page](/docs/xdc-chain/developers/xdc3js-sdk) for contract interaction basics.

## Raw JSON-RPC over WebSocket

Under the hood, every library uses `eth_subscribe` and `eth_unsubscribe` from the [JSON-RPC reference](/docs/api-reference/json-rpc). Send a subscribe request on the open socket:

```json
{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "eth_subscribe",
    "params": ["newHeads"]
}
```

The node replies with a subscription ID:

```json
{
    "jsonrpc": "2.0",
    "id": 1,
    "result": "0x9cef478923ff08bf67fde6c64013158d"
}
```

From then on, matching events arrive as notifications on the same connection. For a log filter:

```json
{
    "jsonrpc": "2.0",
    "method": "eth_subscription",
    "params": {
        "subscription": "0x9cef478923ff08bf67fde6c64013158d",
        "result": {
            "address": "0x9876543210abcdef1234567890abcdef12345678",
            "topics": ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"],
            "data": "0x0000000000000000000000000000000000000000000000000de0b6b3a7640000",
            "blockNumber": "0x5e4b8c3",
            "transactionHash": "0x...",
            "logIndex": "0x0"
        }
    }
}
```

To subscribe to logs directly, use `params: ["logs", {"address": "...", "topics": [...]}]`. Cancel with `eth_unsubscribe` and the subscription ID.

## Production Patterns

Real-time feeds fail silently if you treat a WebSocket as set-and-forget. Harden your listener:

- **Reconnect with backoff:** connections drop. Reconnect with exponential backoff and jitter (e.g., 1s, 2s, 4s, ... capped around 30–60s), and re-create all subscriptions after each reconnect — subscription IDs do not survive a disconnect.
- **Heartbeat:** track the timestamp of the last received message. Since blocks arrive roughly every 2 seconds on XDC, treat a silence of a few block intervals as a dead connection and reconnect proactively rather than waiting for a TCP timeout.
- **Gap recovery:** record the last processed block number. On reconnect, backfill with `eth_getLogs` (or `eth_getBlockByNumber`) from that block to the current head before resuming the live subscription, so no events are missed.
- **Mind subscription limits:** public endpoints may cap subscriptions per connection or log filters per request. Keep filters narrow (specific `address` and `topics`), and run your own node for heavy indexing workloads — see the [node operator guides](/docs/xdc-chain/developers/node-operators/node-architecture).

## Example: XRC20 Transfer Listener

A minimal, dependency-light listener for XRC20 `Transfer` events using xdc3.js:

```javascript
const Xdc3 = require("xdc3");

const TOKEN = "0x9876543210abcdef1234567890abcdef12345678";
const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

const xdc3 = new Xdc3("wss://ws.xinfin.network");

function decodeTransfer(log) {
  const from = "0x" + log.topics[1].slice(26);
  const to = "0x" + log.topics[2].slice(26);
  const value = xdc3.utils.toBN(log.data);
  return { from, to, value };
}

const sub = xdc3.eth.subscribe(
  "logs",
  { address: TOKEN, topics: [TRANSFER_TOPIC] },
  (error, log) => {
    if (error) return reconnect();
    const { from, to, value } = decodeTransfer(log);
    console.log(
      `Block ${log.blockNumber}: ${from} -> ${to} value ${value.toString()}`
    );
  }
);

function reconnect() {
  sub.unsubscribe(() => process.exit(1)); // supervisor restarts the process
}
```

Swap in your token address and scale `value` by the token's `decimals` for human-readable amounts.

## Troubleshooting

- **Silent disconnects:** intermediaries (load balancers, NATs) drop idle connections without a close frame. Use the heartbeat pattern above — absence of expected block notifications is the most reliable dead-connection signal.
- **Proxy timeouts:** if you sit behind a corporate proxy or ingress, confirm it allows long-lived WebSocket upgrades and raise idle timeouts where configurable.
- **Events stop after running fine:** check for rate limiting on public endpoints — reduce polling chatter, narrow your filters, or switch to a dedicated endpoint or your own node.
- **Wrong network:** subscriptions are chain-specific; confirm Chain ID 50 (mainnet) vs 51 (Apothem) before debugging "missing" events.

## See Also

- [API Reference](/docs/api-reference/) — JSON-RPC methods including `eth_subscribe`
- [xdc3.js SDK](/docs/xdc-chain/developers/xdc3js-sdk) — connecting, contracts, and address formats
- [Frontend Integration](/docs/smart-contracts/frontend-integration) — wiring contracts into dApp frontends
