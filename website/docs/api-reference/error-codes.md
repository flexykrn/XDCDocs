---
title: JSON-RPC Error Codes
sidebar_position: 3
description: Reference for standard JSON-RPC error codes and common XDC transaction errors, with causes and fixes.
---

# JSON-RPC Error Codes

Errors you may encounter when calling XDC Network JSON-RPC endpoints, what they mean, and how to fix them. For the full list of supported methods, see the [JSON-RPC API reference](/docs/api-reference/json-rpc).

---

## Standard JSON-RPC Error Codes

These codes are defined by the [JSON-RPC 2.0 specification](https://www.jsonrpc.org/specification) and returned by all XDC nodes.

| Code | Message | Meaning | Common Causes on XDC | Fix |
|---|---|---|---|---|
| -32700 | Parse error | The request body is not valid JSON | Truncated payload, wrong content type, malformed string | Validate your JSON before sending; set `Content-Type: application/json` |
| -32600 | Invalid request | The request is not a valid JSON-RPC object | Missing `jsonrpc`, `method`, or `id` fields | Include `"jsonrpc":"2.0"`, a `method` string, and an `id` in every request |
| -32601 | Method not found | The RPC method does not exist or is not enabled | Typo in method name; calling a namespace (e.g. `admin_`, `debug_`) not exposed on public endpoints | Check spelling against the [JSON-RPC reference](/docs/api-reference/json-rpc); public endpoints only expose standard namespaces |
| -32602 | Invalid params | The parameters are wrong for the method | Wrong number of arguments; invalid block tag; malformed address or hex value | Check the method signature; use `0x`-prefixed hex for quantities and a valid block tag (`latest`, `earliest`, `pending`) |
| -32603 | Internal error | The node hit an internal failure | Node overload, corrupted state, transient infrastructure issue | Retry after a short wait; if persistent, switch to a backup endpoint (e.g. `https://erpc.xinfin.network`) and report the issue |
| -32000 | Server error | Generic server-side error (range -32000 to -32099 is reserved) | Node-specific failures such as missing trie nodes on non-archive nodes | For historical state queries, use an archive node; otherwise retry or change endpoint |

---

## Transaction Errors

These errors appear when sending transactions via `eth_sendRawTransaction` or when a call reverts.

### Insufficient funds

The sender does not have enough XDC to cover the transfer value plus gas.

- Get test XDC from the [faucet](https://faucet.apothem.network)
- For mainnet, purchase XDC from exchanges (KuCoin, Gate.io, Bitfinex)
- Check you're on the right network (testnet vs mainnet)

### Nonce too low

The transaction nonce has already been used by a confirmed transaction. Common when resubmitting or when using a cached nonce.

- Query the current nonce with `eth_getTransactionCount` using the `pending` block tag
- Resubmit the transaction with the correct nonce

### Nonce too high

The transaction nonce skips ahead of the account's next expected nonce, so the node holds or rejects it. Often caused by a stale local nonce cache in the wallet.

Reset your MetaMask account:

1. Settings → Advanced
2. Click **Reset Account**
3. This clears transaction history without affecting funds

### Gas too low / intrinsic gas too low

The gas limit supplied is below the minimum required to execute the transaction.

- Check you have enough gas
- Increase the gas limit in your config
- Estimate first with `eth_estimateGas` and add a margin

### Execution reverted

The EVM executed the transaction but the contract reverted. The call failed, and any gas consumed up to the revert is spent.

- Match exact compiler version when verifying or redeploying
- Check the revert reason returned in the error data (most contracts include a message)
- Ensure contract has no syntax errors and required preconditions (balances, allowances, roles) are met
- Simulate the call with `eth_call` before sending the transaction

---

## Node and Network Errors

### Rate limit or timeout from public RPC

Public endpoints throttle heavy usage.

- Retry with exponential backoff
- Cache results instead of polling
- Run your own node for production workloads

### Stale or missing data

- Ensure the node is synced to the latest block
- Historical state queries (old blocks with `eth_call` or `eth_getBalance`) require an archive node

---

## Debugging Tips

Test any endpoint directly with curl:

```bash
curl -X POST https://rpc.apothem.network \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

Expected response:

```json
{"jsonrpc":"2.0","id":1,"result":"0x1234abcd"}
```

If the RPC is down, use backup endpoints:

- Mainnet: `https://erpc.xinfin.network`
- Apothem: `https://erpc.apothem.network`

---

## See Also

- [JSON-RPC API Reference](/docs/api-reference/json-rpc) — full method list
- [FAQ: Troubleshooting](/docs/xdc-chain/faq#troubleshooting) — wallet, deployment, and network fixes
