---
title: JSON-RPC API Reference
description: Complete reference for XDC Network JSON-RPC methods. Parameters, returns, examples in curl, JavaScript, and Python.
---

# JSON-RPC API Reference

XDC Network is fully compatible with the Ethereum JSON-RPC API. This reference documents all supported methods with parameter specifications, return types, and copy-pasteable examples.

**Base URLs:**

| Network | HTTPS | WebSocket |
|---------|-------|-----------|
| Mainnet | `https://rpc.xinfin.network` | `wss://ws.xinfin.network` |
| Apothem (Testnet) | `https://rpc.apothem.network` | `wss://ws.apothem.network` |

---

## Request Format

All requests follow the [JSON-RPC 2.0](https://www.jsonrpc.org/specification) specification:

```json
{
  "jsonrpc": "2.0",
  "method": "method_name",
  "params": [],
  "id": 1
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `jsonrpc` | string | Yes | Must be `"2.0"` |
| `method` | string | Yes | Method name to invoke |
| `params` | array or object | Yes | Method parameters (empty array if none) |
| `id` | number or string | Yes | Request identifier ( echoed in response) |

---

## Response Format

### Success

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": "..."
}
```

### Error

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32602,
    "message": "Invalid params"
  }
}
```

---

## Common Parameters

### Block Parameter

Many methods accept a block identifier:

| Value | Type | Description |
|-------|------|-------------|
| `"latest"` | string | Most recent block |
| `"earliest"` | string | Genesis block (block 0) |
| `"pending"` | string | Pending transactions |
| `"safe"` | string | Latest safe block |
| `"finalized"` | string | Latest finalized block |
| `"0x..."` | hex string | Specific block number |

### Address Format

XDC supports two address formats. Use `0x` format in RPC calls:

| Format | Example | Usage |
|--------|---------|-------|
| `0x` | `0x71C7656EC7ab88b098defB751B7401B5f6d8976F` | RPC requests |
| `xdc` | `xdc71C7656EC7ab88b098defB751B7401B5f6d8976F` | Display only |

---

## Ethereum Namespace (`eth_`)

### eth_blockNumber

Returns the number of the most recent block.

**Parameters:** None

**Returns:** `QUANTITY` — Integer block number (hex)

=== "cURL"
    ```bash
    curl -X POST https://rpc.xinfin.network \
      -H "Content-Type: application/json" \
      -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
    ```

=== "JavaScript (Web3.js)"
    ```javascript
    const Web3 = require('web3');
    const web3 = new Web3('https://rpc.xinfin.network');
    const blockNumber = await web3.eth.getBlockNumber();
    console.log(blockNumber);
    ```

=== "JavaScript (Ethers.js)"
    ```javascript
    const { ethers } = require('ethers');
    const provider = new ethers.JsonRpcProvider('https://rpc.xinfin.network');
    const blockNumber = await provider.getBlockNumber();
    console.log(blockNumber);
    ```

=== "Python"
    ```python
    from web3 import Web3
    w3 = Web3(Web3.HTTPProvider('https://rpc.xinfin.network'))
    block_number = w3.eth.block_number
    print(block_number)
    ```

=== "Response"
    ```json
    {
      "jsonrpc": "2.0",
      "id": 1,
      "result": "0x5e4b8c3"
    }
    ```

---

### eth_chainId

Returns the chain ID of the current network.

**Parameters:** None

**Returns:** `QUANTITY` — Chain ID (hex)

=== "cURL"
    ```bash
    curl -X POST https://rpc.xinfin.network \
      -H "Content-Type: application/json" \
      -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
    ```

=== "JavaScript (Ethers.js)"
    ```javascript
    const chainId = await provider.getNetwork();
    console.log(chainId.chainId);  // 50n
    ```

=== "Python"
    ```python
    chain_id = w3.eth.chain_id
    print(chain_id)  # 50
    ```

=== "Response"
    ```json
    {
      "jsonrpc": "2.0",
      "id": 1,
      "result": "0x32"
    }
    ```

| Network | Chain ID (hex) | Chain ID (decimal) |
|---------|----------------|-------------------|
| Mainnet | `0x32` | 50 |
| Apothem | `0x33` | 51 |
| Devnet | `0x227` | 551 |

---

### eth_getBalance

Returns the balance of an address in wei.

**Parameters:**

| # | Type | Required | Description |
|---|------|----------|-------------|
| 1 | `ADDRESS` | Yes | Account address (`0x...` format) |
| 2 | `BLOCK` | Yes | Block number or tag (see Common Parameters) |

**Returns:** `QUANTITY` — Balance in wei (hex)

=== "cURL"
    ```bash
    curl -X POST https://rpc.xinfin.network \
      -H "Content-Type: application/json" \
      -d '{
        "jsonrpc":"2.0",
        "method":"eth_getBalance",
        "params":["0x71C7656EC7ab88b098defB751B7401B5f6d8976F","latest"],
        "id":1
      }'
    ```

=== "JavaScript (Web3.js)"
    ```javascript
    const balance = await web3.eth.getBalance('0x71C7656EC7ab88b098defB751B7401B5f6d8976F');
    console.log(web3.utils.fromWei(balance, 'ether'), 'XDC');
    ```

=== "JavaScript (Ethers.js)"
    ```javascript
    const balance = await provider.getBalance('0x71C7656EC7ab88b098defB751B7401B5f6d8976F');
    console.log(ethers.formatEther(balance), 'XDC');
    ```

=== "Python"
    ```python
    balance = w3.eth.get_balance('0x71C7656EC7ab88b098defB751B7401B5f6d8976F')
    print(Web3.from_wei(balance, 'ether'), 'XDC')
    ```

=== "Response"
    ```json
    {
      "jsonrpc": "2.0",
      "id": 1,
      "result": "0x8ac7230489e80000"
    }
    ```

---

### eth_getTransactionCount

Returns the number of transactions sent from an address (nonce).

**Parameters:**

| # | Type | Required | Description |
|---|------|----------|-------------|
| 1 | `ADDRESS` | Yes | Account address |
| 2 | `BLOCK` | Yes | Block number or tag |

**Returns:** `QUANTITY` — Transaction count / nonce (hex)

=== "cURL"
    ```bash
    curl -X POST https://rpc.xinfin.network \
      -H "Content-Type: application/json" \
      -d '{
        "jsonrpc":"2.0",
        "method":"eth_getTransactionCount",
        "params":["0x71C7656EC7ab88b098defB751B7401B5f6d8976F","latest"],
        "id":1
      }'
    ```

=== "JavaScript (Web3.js)"
    ```javascript
    const nonce = await web3.eth.getTransactionCount('0x71C7656EC7ab88b098defB751B7401B5f6d8976F');
    console.log(nonce);
    ```

=== "Python"
    ```python
    nonce = w3.eth.get_transaction_count('0x71C7656EC7ab88b098defB751B7401B5f6d8976F')
    print(nonce)
    ```

=== "Response"
    ```json
    {
      "jsonrpc": "2.0",
      "id": 1,
      "result": "0x29"
    }
    ```

---

### eth_gasPrice

Returns the current gas price in wei.

**Parameters:** None

**Returns:** `QUANTITY` — Gas price in wei (hex)

=== "cURL"
    ```bash
    curl -X POST https://rpc.xinfin.network \
      -H "Content-Type: application/json" \
      -d '{"jsonrpc":"2.0","method":"eth_gasPrice","params":[],"id":1}'
    ```

=== "JavaScript (Ethers.js)"
    ```javascript
    const gasPrice = await provider.getFeeData();
    console.log(ethers.formatUnits(gasPrice.gasPrice, 'gwei'), 'gwei');
    ```

=== "Python"
    ```python
    gas_price = w3.eth.gas_price
    print(Web3.from_wei(gas_price, 'gwei'), 'gwei')
    ```

=== "Response"
    ```json
    {
      "jsonrpc": "2.0",
      "id": 1,
      "result": "0x3b9aca00"
    }
    ```

> 💡 **Note:** XDC gas price is typically 0.25 Gwei (`0x3b9aca00` = 1 Gwei). The network may return a higher value; use 0.25 Gwei for standard transactions.

---

### eth_estimateGas

Estimates the gas required for a transaction.

**Parameters:**

| # | Type | Required | Description |
|---|------|----------|-------------|
| 1 | `Transaction Object` | Yes | See table below |

**Transaction Object Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `from` | `ADDRESS` | No | Sender address |
| `to` | `ADDRESS` | No | Recipient address (omit for contract creation) |
| `gas` | `QUANTITY` | No | Gas limit (default: 90000) |
| `gasPrice` | `QUANTITY` | No | Gas price in wei |
| `maxFeePerGas` | `QUANTITY` | No | Max fee per gas (EIP-1559) |
| `maxPriorityFeePerGas` | `QUANTITY` | No | Max priority fee per gas |
| `value` | `QUANTITY` | No | Value in wei |
| `data` | `DATA` | No | Contract data / call data |
| `nonce` | `QUANTITY` | No | Transaction nonce |

**Returns:** `QUANTITY` — Estimated gas (hex)

=== "cURL"
    ```bash
    curl -X POST https://rpc.xinfin.network \
      -H "Content-Type: application/json" \
      -d '{
        "jsonrpc":"2.0",
        "method":"eth_estimateGas",
        "params":[{
          "from": "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
          "to": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
          "value": "0x0",
          "data": "0x70a0823100000000000000000000000071C7656EC7ab88b098defB751B7401B5f6d8976F"
        }],
        "id":1
      }'
    ```

=== "JavaScript (Ethers.js)"
    ```javascript
    const gasEstimate = await provider.estimateGas({
      to: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      data: '0x70a0823100000000000000000000000071C7656EC7ab88b098defB751B7401B5f6d8976F'
    });
    console.log(gasEstimate.toString());
    ```

=== "Python"
    ```python
    gas = w3.eth.estimate_gas({
        'to': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        'data': '0x70a0823100000000000000000000000071C7656EC7ab88b098defB751B7401B5f6d8976F'
    })
    print(gas)
    ```

=== "Response"
    ```json
    {
      "jsonrpc": "2.0",
      "id": 1,
      "result": "0x5208"
    }
    ```

---

### eth_sendRawTransaction

Submits a pre-signed transaction to the network.

**Parameters:**

| # | Type | Required | Description |
|---|------|----------|-------------|
| 1 | `DATA` | Yes | Signed transaction data (RLP-encoded) |

**Returns:** `DATA` — Transaction hash (`0x...`)

=== "cURL"
    ```bash
    curl -X POST https://rpc.xinfin.network \
      -H "Content-Type: application/json" \
      -d '{
        "jsonrpc":"2.0",
        "method":"eth_sendRawTransaction",
        "params":["0xf86c0a8502540be40082520894dAC17F958D2ee523a2206206994597C13D831ec780b844a9059cbb00000000000000000000000071C7656EC7ab88b098defB751B7401B5f6d8976F00000000000000000000000000000000000000000000000000000000000000648202568080"],
        "id":1
      }'
    ```

=== "JavaScript (Ethers.js)"
    ```javascript
    const signedTx = await wallet.signTransaction({
      to: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      value: 0,
      gasLimit: 21000,
      gasPrice: ethers.parseUnits('0.25', 'gwei'),
      nonce: 41
    });
    const txHash = await provider.send('eth_sendRawTransaction', [signedTx]);
    console.log(txHash);
    ```

=== "Python"
    ```python
    signed_tx = w3.eth.account.sign_transaction({
        'to': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        'value': 0,
        'gas': 21000,
        'gasPrice': w3.to_wei('0.25', 'gwei'),
        'nonce': 41,
        'chainId': 50
    }, private_key)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
    print(tx_hash.hex())
    ```

=== "Response"
    ```json
    {
      "jsonrpc": "2.0",
      "id": 1,
      "result": "0xe670ec64341771606e55d6b4ca35a1a6b75ee3d5145a99d05921026d1527331"
    }
    ```

---

### eth_call

Executes a read-only call without creating a transaction.

**Parameters:**

| # | Type | Required | Description |
|---|------|----------|-------------|
| 1 | `Call Object` | Yes | See table below |
| 2 | `BLOCK` | Yes | Block number or tag |

**Call Object Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `from` | `ADDRESS` | No | Sender address |
| `to` | `ADDRESS` | Yes | Contract address |
| `gas` | `QUANTITY` | No | Gas limit |
| `gasPrice` | `QUANTITY` | No | Gas price |
| `value` | `QUANTITY` | No | Value in wei |
| `data` | `DATA` | Yes | Call data (function selector + params) |

**Returns:** `DATA` — Return value of the call

=== "cURL"
    ```bash
    curl -X POST https://rpc.xinfin.network \
      -H "Content-Type: application/json" \
      -d '{
        "jsonrpc":"2.0",
        "method":"eth_call",
        "params":[{
          "to": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
          "data": "0x70a0823100000000000000000000000071C7656EC7ab88b098defB751B7401B5f6d8976F"
        }, "latest"],
        "id":1
      }'
    ```

=== "JavaScript (Ethers.js)"
    ```javascript
    const data = await provider.call({
      to: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      data: '0x70a0823100000000000000000000000071C7656EC7ab88b098defB751B7401B5f6d8976F'
    });
    console.log(data);
    ```

=== "Python"
    ```python
    result = w3.eth.call({
        'to': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        'data': '0x70a0823100000000000000000000000071C7656EC7ab88b098defB751B7401B5f6d8976F'
    })
    print(result.hex())
    ```

=== "Response"
    ```json
    {
      "jsonrpc": "2.0",
      "id": 1,
      "result": "0x0000000000000000000000000000000000000000000000000000000000000064"
    }
    ```

---

### eth_getBlockByNumber

Returns block information by block number.

**Parameters:**

| # | Type | Required | Description |
|---|------|----------|-------------|
| 1 | `BLOCK` | Yes | Block number or tag |
| 2 | `boolean` | Yes | `true` = full transaction objects, `false` = transaction hashes only |

**Returns:** `Block Object` or `null`

=== "cURL"
    ```bash
    curl -X POST https://rpc.xinfin.network \
      -H "Content-Type: application/json" \
      -d '{
        "jsonrpc":"2.0",
        "method":"eth_getBlockByNumber",
        "params":["latest", false],
        "id":1
      }'
    ```

=== "JavaScript (Ethers.js)"
    ```javascript
    const block = await provider.getBlock('latest');
    console.log(block.number, block.hash, block.timestamp);
    ```

=== "Python"
    ```python
    block = w3.eth.get_block('latest')
    print(block.number, block.hash.hex(), block.timestamp)
    ```

=== "Response"
    ```json
    {
      "jsonrpc": "2.0",
      "id": 1,
      "result": {
        "number": "0x5e4b8c3",
        "hash": "0xabc123...",
        "parentHash": "0xdef456...",
        "nonce": "0x0000000000000000",
        "sha3Uncles": "0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347",
        "logsBloom": "0x...",
        "transactionsRoot": "0x...",
        "stateRoot": "0x...",
        "receiptsRoot": "0x...",
        "miner": "0x...",
        "difficulty": "0x1",
        "totalDifficulty": "0x...",
        "extraData": "0x...",
        "size": "0x2b7",
        "gasLimit": "0x5f5e100",
        "gasUsed": "0x5208",
        "timestamp": "0x64a8f0c0",
        "transactions": ["0x88df0164...", "0x..."],
        "uncles": []
      }
    }
    ```

---

### eth_getBlockByHash

Returns block information by block hash.

**Parameters:**

| # | Type | Required | Description |
|---|------|----------|-------------|
| 1 | `DATA` | Yes | Block hash (`0x...`, 32 bytes) |
| 2 | `boolean` | Yes | `true` = full transactions, `false` = hashes only |

**Returns:** `Block Object` or `null`

=== "cURL"
    ```bash
    curl -X POST https://rpc.xinfin.network \
      -H "Content-Type: application/json" \
      -d '{
        "jsonrpc":"2.0",
        "method":"eth_getBlockByHash",
        "params":["0xabc123...", false],
        "id":1
      }'
    ```

=== "JavaScript (Ethers.js)"
    ```javascript
    const block = await provider.getBlock('0xabc123...');
    console.log(block);
    ```

=== "Python"
    ```python
    block = w3.eth.get_block('0xabc123...')
    print(block)
    ```

---

### eth_getTransactionByHash

Returns transaction information by transaction hash.

**Parameters:**

| # | Type | Required | Description |
|---|------|----------|-------------|
| 1 | `DATA` | Yes | Transaction hash (`0x...`, 32 bytes) |

**Returns:** `Transaction Object` or `null`

=== "cURL"
    ```bash
    curl -X POST https://rpc.xinfin.network \
      -H "Content-Type: application/json" \
      -d '{
        "jsonrpc":"2.0",
        "method":"eth_getTransactionByHash",
        "params":["0x88df016429689c079f3b2f6ad39fa052532c56795b733da78a91ebe6a713944b"],
        "id":1
      }'
    ```

=== "JavaScript (Ethers.js)"
    ```javascript
    const tx = await provider.getTransaction('0x88df0164...');
    console.log(tx.hash, tx.from, tx.to, tx.value);
    ```

=== "Python"
    ```python
    tx = w3.eth.get_transaction('0x88df0164...')
    print(tx)
    ```

=== "Response"
    ```json
    {
      "jsonrpc": "2.0",
      "id": 1,
      "result": {
        "hash": "0x88df0164...",
        "nonce": "0x29",
        "blockHash": "0xabc123...",
        "blockNumber": "0x5e4b8c3",
        "transactionIndex": "0x0",
        "from": "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
        "to": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        "value": "0x0",
        "gas": "0x5208",
        "gasPrice": "0x3b9aca00",
        "input": "0x...",
        "v": "0x64",
        "r": "0x...",
        "s": "0x..."
      }
    }
    ```

---

### eth_getTransactionReceipt

Returns the receipt of a mined transaction.

**Parameters:**

| # | Type | Required | Description |
|---|------|----------|-------------|
| 1 | `DATA` | Yes | Transaction hash |

**Returns:** `Receipt Object` or `null`

=== "cURL"
    ```bash
    curl -X POST https://rpc.xinfin.network \
      -H "Content-Type: application/json" \
      -d '{
        "jsonrpc":"2.0",
        "method":"eth_getTransactionReceipt",
        "params":["0x88df016429689c079f3b2f6ad39fa052532c56795b733da78a91ebe6a713944b"],
        "id":1
      }'
    ```

=== "JavaScript (Ethers.js)"
    ```javascript
    const receipt = await provider.getTransactionReceipt('0x88df0164...');
    console.log(receipt.status, receipt.gasUsed, receipt.logs.length);
    ```

=== "Python"
    ```python
    receipt = w3.eth.get_transaction_receipt('0x88df0164...')
    print(receipt.status, receipt.gasUsed, len(receipt.logs))
    ```

=== "Response"
    ```json
    {
      "jsonrpc": "2.0",
      "id": 1,
      "result": {
        "transactionHash": "0x88df0164...",
        "blockHash": "0xabc123...",
        "blockNumber": "0x5e4b8c3",
        "contractAddress": null,
        "cumulativeGasUsed": "0x5208",
        "gasUsed": "0x5208",
        "logs": [],
        "logsBloom": "0x...",
        "status": "0x1",
        "transactionIndex": "0x0"
      }
    }
    ```

> 💡 **Status:** `0x1` = success, `0x0` = failure. Always check `status` after sending a transaction.

---

### eth_getLogs

Returns logs matching filter criteria.

**Parameters:**

| # | Type | Required | Description |
|---|------|----------|-------------|
| 1 | `Filter Object` | Yes | See table below |

**Filter Object Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fromBlock` | `BLOCK` | No | Start block (default: "latest") |
| `toBlock` | `BLOCK` | No | End block (default: "latest") |
| `address` | `ADDRESS` or `array` | No | Contract address(es) |
| `topics` | `array` | No | Array of 32-byte topic hashes |
| `blockhash` | `DATA` | No | Specific block hash (overrides fromBlock/toBlock) |

**Returns:** `array` — Array of log objects

=== "cURL"
    ```bash
    curl -X POST https://rpc.xinfin.network \
      -H "Content-Type: application/json" \
      -d '{
        "jsonrpc":"2.0",
        "method":"eth_getLogs",
        "params":[{
          "fromBlock": "0x5e4b8c0",
          "toBlock": "latest",
          "address": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
          "topics": ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"]
        }],
        "id":1
      }'
    ```

=== "JavaScript (Ethers.js)"
    ```javascript
    const logs = await provider.getLogs({
      fromBlock: '0x5e4b8c0',
      toBlock: 'latest',
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      topics: ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef']
    });
    console.log(logs);
    ```

=== "Python"
    ```python
    logs = w3.eth.get_logs({
        'fromBlock': '0x5e4b8c0',
        'toBlock': 'latest',
        'address': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        'topics': ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef']
    })
    print(logs)
    ```

=== "Response"
    ```json
    {
      "jsonrpc": "2.0",
      "id": 1,
      "result": [
        {
          "address": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
          "blockHash": "0x...",
          "blockNumber": "0x5e4b8c3",
          "data": "0x0000000000000000000000000000000000000000000000000000000000000064",
          "logIndex": "0x0",
          "removed": false,
          "topics": [
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
            "0x00000000000000000000000071C7656EC7ab88b098defB751B7401B5f6d8976F",
            "0x000000000000000000000000dAC17F958D2ee523a2206206994597C13D831ec7"
          ],
          "transactionHash": "0x...",
          "transactionIndex": "0x0"
        }
      ]
    }
    ```

---

### eth_getCode

Returns code at a given address.

**Parameters:**

| # | Type | Required | Description |
|---|------|----------|-------------|
| 1 | `ADDRESS` | Yes | Contract address |
| 2 | `BLOCK` | Yes | Block number or tag |

**Returns:** `DATA` — Bytecode at the address (`0x` for EOA)

=== "cURL"
    ```bash
    curl -X POST https://rpc.xinfin.network \
      -H "Content-Type: application/json" \
      -d '{
        "jsonrpc":"2.0",
        "method":"eth_getCode",
        "params":["0xdAC17F958D2ee523a2206206994597C13D831ec7","latest"],
        "id":1
      }'
    ```

=== "JavaScript (Ethers.js)"
    ```javascript
    const code = await provider.getCode('0xdAC17F958D2ee523a2206206994597C13D831ec7');
    console.log(code);  // Returns bytecode or "0x" for EOA
    ```

=== "Python"
    ```python
    code = w3.eth.get_code('0xdAC17F958D2ee523a2206206994597C13D831ec7')
    print(code.hex())
    ```

=== "Response"
    ```json
    {
      "jsonrpc": "2.0",
      "id": 1,
      "result": "0x608060405234801561001057600080fd5b50..."
    }
    ```

---

### eth_getStorageAt

Returns the value from a storage position at a given address.

**Parameters:**

| # | Type | Required | Description |
|---|------|----------|-------------|
| 1 | `ADDRESS` | Yes | Contract address |
| 2 | `QUANTITY` | Yes | Storage slot position (hex) |
| 3 | `BLOCK` | Yes | Block number or tag |

**Returns:** `DATA` — Storage value at the position

=== "cURL"
    ```bash
    curl -X POST https://rpc.xinfin.network \
      -H "Content-Type: application/json" \
      -d '{
        "jsonrpc":"2.0",
        "method":"eth_getStorageAt",
        "params":["0xdAC17F958D2ee523a2206206994597C13D831ec7","0x0","latest"],
        "id":1
      }'
    ```

=== "Python"
    ```python
    value = w3.eth.get_storage_at('0xdAC17F958D2ee523a2206206994597C13D831ec7', 0)
    print(value.hex())
    ```

=== "Response"
    ```json
    {
      "jsonrpc": "2.0",
      "id": 1,
      "result": "0x0000000000000000000000000000000000000000000000000000000000000000"
    }
    ```

---

### eth_getBlockTransactionCountByNumber

Returns the number of transactions in a block by block number.

**Parameters:**

| # | Type | Required | Description |
|---|------|----------|-------------|
| 1 | `BLOCK` | Yes | Block number or tag |

**Returns:** `QUANTITY` — Transaction count

=== "cURL"
    ```bash
    curl -X POST https://rpc.xinfin.network \
      -H "Content-Type: application/json" \
      -d '{
        "jsonrpc":"2.0",
        "method":"eth_getBlockTransactionCountByNumber",
        "params":["latest"],
        "id":1
      }'
    ```

=== "JavaScript (Ethers.js)"
    ```javascript
    const count = await provider.send('eth_getBlockTransactionCountByNumber', ['latest']);
    console.log(count);
    ```

=== "Response"
    ```json
    {
      "jsonrpc": "2.0",
      "id": 1,
      "result": "0x5"
    }
    ```

---

### eth_getBlockTransactionCountByHash

Returns the number of transactions in a block by block hash.

**Parameters:**

| # | Type | Required | Description |
|---|------|----------|-------------|
| 1 | `DATA` | Yes | Block hash |

**Returns:** `QUANTITY` — Transaction count

=== "cURL"
    ```bash
    curl -X POST https://rpc.xinfin.network \
      -H "Content-Type: application/json" \
      -d '{
        "jsonrpc":"2.0",
        "method":"eth_getBlockTransactionCountByHash",
        "params":["0xabc123..."],
        "id":1
      }'
    ```

---

### eth_getTransactionByBlockNumberAndIndex

Returns a transaction by block number and transaction index.

**Parameters:**

| # | Type | Required | Description |
|---|------|----------|-------------|
| 1 | `BLOCK` | Yes | Block number or tag |
| 2 | `QUANTITY` | Yes | Transaction index (hex) |

**Returns:** `Transaction Object` or `null`

=== "cURL"
    ```bash
    curl -X POST https://rpc.xinfin.network \
      -H "Content-Type: application/json" \
      -d '{
        "jsonrpc":"2.0",
        "method":"eth_getTransactionByBlockNumberAndIndex",
        "params":["latest","0x0"],
        "id":1
      }'
    ```

---

### eth_getTransactionByBlockHashAndIndex

Returns a transaction by block hash and transaction index.

**Parameters:**

| # | Type | Required | Description |
|---|------|----------|-------------|
| 1 | `DATA` | Yes | Block hash |
| 2 | `QUANTITY` | Yes | Transaction index (hex) |

**Returns:** `Transaction Object` or `null`

=== "cURL"
    ```bash
    curl -X POST https://rpc.xinfin.network \
      -H "Content-Type: application/json" \
      -d '{
        "jsonrpc":"2.0",
        "method":"eth_getTransactionByBlockHashAndIndex",
        "params":["0xabc123...","0x0"],
        "id":1
      }'
    ```

---

### eth_getUncleCountByBlockNumber

Returns the number of uncles in a block by block number.

**Parameters:**

| # | Type | Required | Description |
|---|------|----------|-------------|
| 1 | `BLOCK` | Yes | Block number or tag |

**Returns:** `QUANTITY` — Uncle count

=== "cURL"
    ```bash
    curl -X POST https://rpc.xinfin.network \
      -H "Content-Type: application/json" \
      -d '{
        "jsonrpc":"2.0",
        "method":"eth_getUncleCountByBlockNumber",
        "params":["latest"],
        "id":1
      }'
    ```

---

### eth_getUncleCountByBlockHash

Returns the number of uncles in a block by block hash.

**Parameters:**

| # | Type | Required | Description |
|---|------|----------|-------------|
| 1 | `DATA` | Yes | Block hash |

**Returns:** `QUANTITY` — Uncle count

---

### eth_getUncleByBlockNumberAndIndex

Returns an uncle block by block number and uncle index.

**Parameters:**

| # | Type | Required | Description |
|---|------|----------|-------------|
| 1 | `BLOCK` | Yes | Block number or tag |
| 2 | `QUANTITY` | Yes | Uncle index |

**Returns:** `Block Object` or `null`

---

### eth_getUncleByBlockHashAndIndex

Returns an uncle block by block hash and uncle index.

**Parameters:**

| # | Type | Required | Description |
|---|------|----------|-------------|
| 1 | `DATA` | Yes | Block hash |
| 2 | `QUANTITY` | Yes | Uncle index |

**Returns:** `Block Object` or `null`

---

### eth_getFilterChanges

Returns new log entries since the last poll for a filter created with `eth_newFilter`.

**Parameters:**

| # | Type | Required | Description |
|---|------|----------|-------------|
| 1 | `QUANTITY` | Yes | Filter ID |

**Returns:** `array` — Array of log objects

=== "cURL"
    ```bash
    curl -X POST https://rpc.xinfin.network \
      -H "Content-Type: application/json" \
      -d '{
        "jsonrpc":"2.0",
        "method":"eth_getFilterChanges",
        "params":["0x1"],
        "id":1
      }'
    ```

---

### eth_getFilterLogs

Returns all log entries matching a filter.

**Parameters:**

| # | Type | Required | Description |
|---|------|----------|-------------|
| 1 | `QUANTITY` | Yes | Filter ID |

**Returns:** `array` — Array of log objects

---

### eth_newFilter

Creates a new event filter.

**Parameters:**

| # | Type | Required | Description |
|---|------|----------|-------------|
| 1 | `Filter Object` | Yes | Same as `eth_getLogs` filter object |

**Returns:** `QUANTITY` — Filter ID

=== "cURL"
    ```bash
    curl -X POST https://rpc.xinfin.network \
      -H "Content-Type: application/json" \
      -d '{
        "jsonrpc":"2.0",
        "method":"eth_newFilter",
        "params":[{
          "fromBlock": "latest",
          "address": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
          "topics": ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"]
        }],
        "id":1
      }'
    ```

=== "Response"
    ```json
    {
      "jsonrpc": "2.0",
      "id": 1,
      "result": "0x1"
    }
    ```

---

### eth_newBlockFilter

Creates a new block filter.

**Parameters:** None

**Returns:** `QUANTITY` — Filter ID

=== "cURL"
    ```bash
    curl -X POST https://rpc.xinfin.network \
      -H "Content-Type: application/json" \
      -d '{"jsonrpc":"2.0","method":"eth_newBlockFilter","params":[],"id":1}'
    ```

=== "Response"
    ```json
    {
      "jsonrpc": "2.0",
      "id": 1,
      "result": "0x2"
    }
    ```

---

### eth_newPendingTransactionFilter

Creates a new pending transaction filter.

**Parameters:** None

**Returns:** `QUANTITY` — Filter ID

=== "cURL"
    ```bash
    curl -X POST https://rpc.xinfin.network \
      -H "Content-Type: application/json" \
      -d '{"jsonrpc":"2.0","method":"eth_newPendingTransactionFilter","params":[],"id":1}'
    ```

---

### eth_uninstallFilter

Uninstalls a filter.

**Parameters:**

| # | Type | Required | Description |
|---|------|----------|-------------|
| 1 | `QUANTITY` | Yes | Filter ID |

**Returns:** `boolean` — `true` if filter was removed

=== "cURL"
    ```bash
    curl -X POST https://rpc.xinfin.network \
      -H "Content-Type: application/json" \
      -d '{
        "jsonrpc":"2.0",
        "method":"eth_uninstallFilter",
        "params":["0x1"],
        "id":1
      }'
    ```

---

### eth_sendTransaction

Sends a transaction (requires unlocked account — **not available on public RPC**).

> ⚠️ **Note:** Public RPC endpoints do not support `eth_sendTransaction`. Use `eth_sendRawTransaction` with a locally signed transaction instead.

**Parameters:**

| # | Type | Required | Description |
|---|------|----------|-------------|
| 1 | `Transaction Object` | Yes | Same as `eth_estimateGas` |

**Returns:** `DATA` — Transaction hash

---

### eth_accounts

Returns a list of addresses owned by the client.

> ⚠️ **Note:** Returns empty array on public RPC. Only returns accounts when connected to a local node with unlocked accounts.

**Parameters:** None

**Returns:** `array` — Array of addresses

=== "cURL"
    ```bash
    curl -X POST https://rpc.xinfin.network \
      -H "Content-Type: application/json" \
      -d '{"jsonrpc":"2.0","method":"eth_accounts","params":[],"id":1}'
    ```

=== "Response"
    ```json
    {
      "jsonrpc": "2.0",
      "id": 1,
      "result": []
    }
    ```

---

### eth_syncing

Returns sync status of the node.

**Parameters:** None

**Returns:** `object` or `boolean`

- `false` — Not syncing
- Object with sync progress:
  - `startingBlock`: Starting block
  - `currentBlock`: Current block
  - `highestBlock`: Highest known block

=== "cURL"
    ```bash
    curl -X POST https://rpc.xinfin.network \
      -H "Content-Type: application/json" \
      -d '{"jsonrpc":"2.0","method":"eth_syncing","params":[],"id":1}'
    ```

=== "Response"
    ```json
    {
      "jsonrpc": "2.0",
      "id": 1,
      "result": false
    }
    ```

---

### eth_coinbase

Returns the coinbase address (block reward recipient).

**Parameters:** None

**Returns:** `ADDRESS` — Coinbase address

---

### eth_mining

Returns `true` if client is actively mining.

**Parameters:** None

**Returns:** `boolean`

---

### eth_hashrate

Returns the number of hashes per second.

**Parameters:** None

**Returns:** `QUANTITY` — Hashes per second

---

### eth_protocolVersion

Returns the current Ethereum protocol version.

**Parameters:** None

**Returns:** `string` — Protocol version

---

## Net Namespace (`net_`)

### net_version

Returns the network ID.

**Parameters:** None

**Returns:** `string` — Network ID ("50" for mainnet)

=== "cURL"
    ```bash
    curl -X POST https://rpc.xinfin.network \
      -H "Content-Type: application/json" \
      -d '{"jsonrpc":"2.0","method":"net_version","params":[],"id":1}'
    ```

=== "Response"
    ```json
    {
      "jsonrpc": "2.0",
      "id": 1,
      "result": "50"
    }
    ```

---

### net_listening

Returns `true` if client is listening for connections.

**Parameters:** None

**Returns:** `boolean`

=== "cURL"
    ```bash
    curl -X POST https://rpc.xinfin.network \
      -H "Content-Type: application/json" \
      -d '{"jsonrpc":"2.0","method":"net_listening","params":[],"id":1}'
    ```

=== "Response"
    ```json
    {
      "jsonrpc": "2.0",
      "id": 1,
      "result": true
    }
    ```

---

### net_peerCount

Returns the number of connected peers.

**Parameters:** None

**Returns:** `QUANTITY` — Peer count (hex)

=== "cURL"
    ```bash
    curl -X POST https://rpc.xinfin.network \
      -H "Content-Type: application/json" \
      -d '{"jsonrpc":"2.0","method":"net_peerCount","params":[],"id":1}'
    ```

=== "Response"
    ```json
    {
      "jsonrpc": "2.0",
      "id": 1,
      "result": "0x19"
    }
    ```

---

## Web3 Namespace (`web3_`)

### web3_clientVersion

Returns the current client version.

**Parameters:** None

**Returns:** `string` — Client version string

=== "cURL"
    ```bash
    curl -X POST https://rpc.xinfin.network \
      -H "Content-Type: application/json" \
      -d '{"jsonrpc":"2.0","method":"web3_clientVersion","params":[],"id":1}'
    ```

=== "Response"
    ```json
    {
      "jsonrpc": "2.0",
      "id": 1,
      "result": "XDC/v1.4.6/linux-amd64/go1.21.0"
    }
    ```

---

### web3_sha3

Returns Keccak-256 hash of the given data.

**Parameters:**

| # | Type | Required | Description |
|---|------|----------|-------------|
| 1 | `DATA` | Yes | Data to hash |

**Returns:** `DATA` — 32-byte hash

=== "cURL"
    ```bash
    curl -X POST https://rpc.xinfin.network \
      -H "Content-Type: application/json" \
      -d '{
        "jsonrpc":"2.0",
        "method":"web3_sha3",
        "params":["0x68656c6c6f20776f726c64"],
        "id":1
      }'
    ```

=== "Response"
    ```json
    {
      "jsonrpc": "2.0",
      "id": 1,
      "result": "0x47173285a8d7341e5e972fc677286384f802f8ef42a5ec5f03bbfa254cb01fad"
    }
    ```

---

## WebSocket Subscriptions (`eth_subscribe`)

Subscribe to real-time events via WebSocket.

### Connect

=== "JavaScript (Ethers.js)"
    ```javascript
    const wsProvider = new ethers.WebSocketProvider('wss://ws.xinfin.network');
    ```

=== "Python (web3.py)"
    ```python
    w3_ws = Web3(Web3.WebsocketProvider('wss://ws.xinfin.network'))
    ```

---

### eth_subscribe / newHeads

Subscribe to new block headers.

=== "JavaScript (Ethers.js)"
    ```javascript
    wsProvider.on('block', (blockNumber) => {
      console.log('New block:', blockNumber);
    });
    ```

=== "cURL (WebSocket)"
    ```bash
    wscat -c wss://ws.xinfin.network -x '{
      "jsonrpc":"2.0",
      "method":"eth_subscribe",
      "params":["newHeads"],
      "id":1
    }'
    ```

=== "Response"
    ```json
    {
      "jsonrpc": "2.0",
      "method": "eth_subscription",
      "params": {
        "subscription": "0x1",
        "result": {
          "number": "0x5e4b8c4",
          "hash": "0x...",
          "parentHash": "0x...",
          "timestamp": "0x64a8f0d0"
        }
      }
    }
    ```

---

### eth_subscribe / logs

Subscribe to contract event logs.

=== "JavaScript (Ethers.js)"
    ```javascript
    const filter = {
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      topics: [ethers.id('Transfer(address,address,uint256)')]
    };
    wsProvider.on(filter, (log) => {
      console.log('Transfer event:', log);
    });
    ```

=== "cURL (WebSocket)"
    ```bash
    wscat -c wss://ws.xinfin.network -x '{
      "jsonrpc":"2.0",
      "method":"eth_subscribe",
      "params":["logs",{"address":"0xdAC17F958D2ee523a2206206994597C13D831ec7"}],
      "id":1
    }'
    ```

---

### eth_subscribe / newPendingTransactions

Subscribe to pending transaction hashes.

=== "JavaScript (Ethers.js)"
    ```javascript
    wsProvider.on('pending', (txHash) => {
      console.log('Pending tx:', txHash);
    });
    ```

=== "cURL (WebSocket)"
    ```bash
    wscat -c wss://ws.xinfin.network -x '{
      "jsonrpc":"2.0",
      "method":"eth_subscribe",
      "params":["newPendingTransactions"],
      "id":1
    }'
    ```

---

### eth_unsubscribe

Unsubscribe from a subscription.

**Parameters:**

| # | Type | Required | Description |
|---|------|----------|-------------|
| 1 | `string` | Yes | Subscription ID |

**Returns:** `boolean` — `true` if unsubscribed

=== "cURL (WebSocket)"
    ```bash
    wscat -c wss://ws.xinfin.network -x '{
      "jsonrpc":"2.0",
      "method":"eth_unsubscribe",
      "params":["0x1"],
      "id":1
    }'
    ```

=== "Response"
    ```json
    {
      "jsonrpc": "2.0",
      "id": 1,
      "result": true
    }
    ```

---

## Error Codes

### Standard JSON-RPC Errors

| Code | Message | Meaning |
|------|---------|---------|
| -32700 | Parse error | Invalid JSON was received |
| -32600 | Invalid Request | JSON is not a valid request object |
| -32601 | Method not found | Method does not exist |
| -32602 | Invalid params | Invalid method parameters |
| -32603 | Internal error | Internal JSON-RPC error |
| -32000 | Server error | Generic server error |
| -32001 | Resource not found | Requested resource not found |

### Ethereum-Specific Errors

| Code | Message | Meaning |
|------|---------|---------|
| -32002 | Transaction rejected | Transaction could not be processed |
| -32003 | Limit exceeded | Request limit exceeded |
| -32004 | Method not supported | Method not supported by this endpoint |
| -32005 | Invalid input | Invalid input data |

### Common Error Scenarios

**Invalid Address Format:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32602,
    "message": "invalid argument 0: json: cannot unmarshal hex string without 0x prefix"
  }
}
```

**Method Not Found:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32601,
    "message": "the method eth_sign does not exist/is not available"
  }
}
```

**Rate Limit Exceeded:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32003,
    "message": "request limit exceeded"
  }
}
```

---

## Rate Limiting

Public RPC endpoints have rate limits to ensure fair usage:

| Endpoint Type | Limit | Notes |
|--------------|-------|-------|
| Public (rpc.xinfin.network) | ~100 req/sec | No authentication required |
| Public (rpc.apothem.network) | ~100 req/sec | No authentication required |
| Ankr | Tiered | Free tier: 10M requests/month |
| Custom Node | Unlimited | Run your own XDC node |

**Best practices:**
- Use request batching for multiple queries
- Cache responses when possible
- Use WebSocket for real-time data instead of polling
- Implement exponential backoff on rate limit errors

---

## Batch Requests

Send multiple requests in a single HTTP call:

=== "cURL"
    ```bash
    curl -X POST https://rpc.xinfin.network \
      -H "Content-Type: application/json" \
      -d '[
        {"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1},
        {"jsonrpc":"2.0","method":"eth_gasPrice","params":[],"id":2},
        {"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":3}
      ]'
    ```

=== "JavaScript (Ethers.js)"
    ```javascript
    const [blockNumber, gasPrice, chainId] = await Promise.all([
      provider.getBlockNumber(),
      provider.getFeeData(),
      provider.getNetwork()
    ]);
    ```

=== "Python"
    ```python
    batch = [
        {'jsonrpc': '2.0', 'method': 'eth_blockNumber', 'params': [], 'id': 1},
        {'jsonrpc': '2.0', 'method': 'eth_gasPrice', 'params': [], 'id': 2},
    ]
    response = w3.provider.make_request('eth_batch', batch)
    ```

=== "Response"
    ```json
    [
      {"jsonrpc":"2.0","id":1,"result":"0x5e4b8c3"},
      {"jsonrpc":"2.0","id":2,"result":"0x3b9aca00"},
      {"jsonrpc":"2.0","id":3,"result":"0x32"}
    ]
    ```

---

## Method Quick Reference

| Method | Namespace | Description |
|--------|-----------|-------------|
| `eth_blockNumber` | eth | Current block number |
| `eth_chainId` | eth | Chain ID |
| `eth_getBalance` | eth | Account balance |
| `eth_getTransactionCount` | eth | Account nonce |
| `eth_gasPrice` | eth | Current gas price |
| `eth_estimateGas` | eth | Estimate gas |
| `eth_sendRawTransaction` | eth | Submit signed tx |
| `eth_sendTransaction` | eth | Submit tx (local only) |
| `eth_call` | eth | Read-only call |
| `eth_getBlockByNumber` | eth | Block by number |
| `eth_getBlockByHash` | eth | Block by hash |
| `eth_getTransactionByHash` | eth | Transaction by hash |
| `eth_getTransactionReceipt` | eth | Transaction receipt |
| `eth_getBlockTransactionCountByNumber` | eth | Tx count by block number |
| `eth_getBlockTransactionCountByHash` | eth | Tx count by block hash |
| `eth_getTransactionByBlockNumberAndIndex` | eth | Tx by block + index |
| `eth_getTransactionByBlockHashAndIndex` | eth | Tx by block hash + index |
| `eth_getLogs` | eth | Event logs |
| `eth_getCode` | eth | Contract bytecode |
| `eth_getStorageAt` | eth | Storage value |
| `eth_getUncleCountByBlockNumber` | eth | Uncle count |
| `eth_getUncleCountByBlockHash` | eth | Uncle count |
| `eth_getUncleByBlockNumberAndIndex` | eth | Uncle by block + index |
| `eth_getUncleByBlockHashAndIndex` | eth | Uncle by hash + index |
| `eth_newFilter` | eth | Create log filter |
| `eth_newBlockFilter` | eth | Create block filter |
| `eth_newPendingTransactionFilter` | eth | Create pending tx filter |
| `eth_getFilterChanges` | eth | Poll filter changes |
| `eth_getFilterLogs` | eth | Get all filter logs |
| `eth_uninstallFilter` | eth | Remove filter |
| `eth_accounts` | eth | List accounts (local only) |
| `eth_syncing` | eth | Sync status |
| `eth_coinbase` | eth | Coinbase address |
| `eth_mining` | eth | Mining status |
| `eth_hashrate` | eth | Hash rate |
| `eth_protocolVersion` | eth | Protocol version |
| `net_version` | net | Network ID |
| `net_listening` | net | Listening status |
| `net_peerCount` | net | Peer count |
| `web3_clientVersion` | web3 | Client version |
| `web3_sha3` | web3 | Keccak-256 hash |
| `eth_subscribe` | eth | WebSocket subscription |
| `eth_unsubscribe` | eth | Remove subscription |

---

## 🚀 Next Steps

1. **[JavaScript SDK →](../sdks/javascript.md)** — Higher-level library for dApp development (⏱️ 15 min)
2. **[Smart Contract Monitoring →](../smartcontract/monitoring.md)** — Track events programmatically (⏱️ 20 min)
3. **[Wallet Configuration →](../xdcchain/developers/wallet-configuration.md)** — Connect wallets to your dApp (⏱️ 10 min)

Or explore:
- [WebSocket Endpoints →](../index.md#websocket-endpoints) — Real-time event subscriptions
- [Error Handling →](../index.md#error-handling) — Common errors and fixes
- [Rate Limiting →](#rate-limiting) — Optimize your API usage
