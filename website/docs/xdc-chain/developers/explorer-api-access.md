---
title: "Explorer API Access"
sidebar_position: 18
description: "Programmatic access to XDC explorers via the Etherscan-compatible REST API — query parameters, common modules, a JavaScript example, rate-limit etiquette, and when to use raw JSON-RPC instead."
---

# Explorer API Access

The [Block Explorer Usage Guide](/docs/xdc-chain/developers/explorer-guide) covers reading the explorer UI. This page covers the other half: pulling the same indexed data into scripts, backends, and CI jobs over HTTP.

## The Etherscan-Compatible API Pattern

XDCScan and BlocksScan both expose REST endpoints that mirror the Etherscan API, so any tool or script written against Etherscan works against the XDC explorers by changing the base URL and API key.

Every request follows the same shape:

```
GET {BASE_URL}/api?module={MODULE}&action={ACTION}&{PARAMS}&apikey={YOUR_KEY}
```

| Component | Meaning | Examples |
|---|---|---|
| `BASE_URL` | Explorer API root | Get the exact base URL and an API key from the explorer you use — see the endpoint documentation linked from [Deployment & Verification](/docs/smart-contracts/deployment-verification) |
| `module` | API namespace | `account`, `transaction`, `contract`, `stats`, `logs` |
| `action` | Operation within the module | `balance`, `txlist`, `tokentx`, `getabi`, `verifysourcecode` |
| `PARAMS` | Action-specific arguments | `address`, `startblock`, `endblock`, `sort`, `contractaddress` |
| `apikey` | Your API key | Some calls work keyless at a lower rate limit; register for a key for anything automated |

Responses are JSON with a common envelope:

```json
{
  "status": "1",
  "message": "OK",
  "result": [ ... ]
}
```

`status: "1"` means success; `"0"` means the call failed and `result` contains an error string. Always check `status` before using `result` — the API returns HTTP 200 for both.

## Common Calls

| Task | Module / Action | Key parameters |
|---|---|---|
| XDC balance of one address | `account` / `balance` | `address`, `tag=latest` |
| Balances of up to 20 addresses | `account` / `balancemulti` | comma-separated `address` list |
| Normal transactions for an address | `account` / `txlist` | `address`, `startblock`, `endblock`, `sort` |
| Internal transactions | `account` / `txlistinternal` | `address` or `txhash` |
| XRC20 token transfers | `account` / `tokentx` | `address`, `contractaddress`, `startblock` |
| Verified contract ABI | `contract` / `getabi` | `address` |
| Verified contract source | `contract` / `getsourcecode` | `address` |
| Verify source code | `contract` / `verifysourcecode` | POST with source, compiler version, settings |
| XDC supply / price stats | `stats` / `xdcsupply`, `xdcprice` | none |

Note the address format: the API accepts both `xdc`-prefixed and `0x`-prefixed addresses on most endpoints, but results return the `0x` form — normalize before comparing.

## Example: Fetch an Account Balance

```javascript
const BASE_URL = "https://{explorer-api-base}/api"; // exact base URL from your explorer
const API_KEY = process.env.EXPLORER_API_KEY;

async function getBalance(address) {
  const params = new URLSearchParams({
    module: "account",
    action: "balance",
    address,
    tag: "latest",
    apikey: API_KEY,
  });
  const res = await fetch(`${BASE_URL}?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json();
  if (body.status !== "1") throw new Error(`API error: ${body.result}`);
  return BigInt(body.result); // wei
}

const wei = await getBalance("0xYourAddressHere");
console.log(`Balance: ${Number(wei) / 1e18} XDC`);
```

The same pattern applies to every other module — swap `module`/`action` and add the action's parameters.

## Verifying Contracts via API

The `contract` module's `verifysourcecode` / `checkverifystatus` actions let you automate verification from a deploy script instead of using the UI. The full walkthrough — including flattened and Standard JSON input formats, and the Hardhat plugin that wraps these calls — is in [Deployment & Verification](/docs/smart-contracts/deployment-verification).

## Rate-Limit Etiquette

Explorer APIs are shared infrastructure. To stay a good citizen:

- **Register for an API key** — keyless access is throttled hard and may be cut first under load.
- **Cache aggressively.** Balances and transaction lists change per block at most; polling the same address every second wastes quota.
- **Batch where possible.** `balancemulti` returns up to 20 balances per call.
- **Back off on errors.** On HTTP 429 or repeated `status: "0"` responses, retry with exponential backoff, not in a tight loop.
- **Narrow your ranges.** Pass `startblock`/`endblock` to `txlist` and `tokentx` instead of scanning an address's full history on every call.

## When to Use Raw JSON-RPC Instead

The explorer API is an index of *someone else's* view of the chain. Use the native JSON-RPC directly when:

- You need **real-time data** — explorer indexing lags the tip by a few blocks.
- You need **state at an arbitrary block**, raw traces, or anything outside the explorer's fixed module set.
- You are **sending transactions** — the explorer API is read-only.
- Your volume exceeds the explorer's rate limits and you can run or rent an RPC endpoint.

See the [JSON-RPC Reference](/docs/api-reference/json-rpc) for available methods and [Mainnet RPC Endpoints](/docs/xdc-chain/developers/mainnetrpc) for public endpoints.

## See Also

- [Block Explorer Usage Guide](/docs/xdc-chain/developers/explorer-guide) — reading explorer pages in the UI
- [Advanced Explorer Usage](/docs/xdc-chain/developers/explorer-advanced) — internal transactions, event logs, approvals
- [Deployment & Verification](/docs/smart-contracts/deployment-verification) — automated contract verification
- [JSON-RPC Reference](/docs/api-reference/json-rpc) — direct chain access without an API key
