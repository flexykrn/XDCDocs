# XDC Block Explorer Guide

XDC block explorers provide transparent access to blockchain data, enabling users to verify transactions, inspect smart contracts, track tokens, and analyze network activity. This guide covers both **XDCScan** (mainnet explorer) and **Apothem Explorer** (testnet explorer), providing comprehensive documentation for developers, validators, and everyday users.

---

## Overview

### What Is a Block Explorer

A block explorer is a web-based tool that indexes and visualizes blockchain data in human-readable format. It serves as the primary interface between users and the underlying blockchain ledger, transforming raw block data, transaction hashes, and contract bytecode into searchable, navigable information.

**Key Capabilities:**

- Transaction verification and status tracking
- Address balance and transaction history lookup
- Smart contract source code verification
- Token supply, holder, and transfer analytics
- Block production and validator monitoring
- Gas price and network congestion analysis
- API access for programmatic data retrieval

### XDCScan vs Apothem Explorer

| Feature | XDCScan (Mainnet) | Apothem Explorer (Testnet) |
|---------|-------------------|---------------------------|
| Network | XDC Mainnet | XDC Apothem Testnet |
| URL | https://xdcscan.io | https://apothem.xdcscan.io |
| Data | Production transactions | Test transactions |
| API | Production API keys | Test API keys |
| Use Case | Production monitoring | Development and testing |
| Value | Real XDC tokens | Test XDC (faucet available) |

Both explorers share identical interfaces and feature sets, making it seamless to transition from testnet development to mainnet deployment.

---

## Getting Started

### Accessing the Explorers

Navigate directly to the explorer URLs in any modern web browser. No authentication is required for basic browsing. For API access and advanced features, account creation and API key generation are necessary.

**XDCScan:** https://xdcscan.io

**Apothem Explorer:** https://apothem.xdcscan.io

### Explorer Interface Overview

The explorer homepage presents a dashboard with the following primary sections:

**Header Navigation:**

- Search bar (supports addresses, transaction hashes, block numbers, and token names)
- Network selector (Mainnet / Testnet toggle on some interfaces)
- API and developer tools links

**Dashboard Panels:**

- Latest blocks with timestamp, validator, and transaction count
- Recent transactions with status, value, and gas used
- Network statistics (current block height, average block time, active validators)
- XDC price and market data (on XDCScan)

**Footer Links:**

- API documentation
- Contract verification portal
- Terms of service and privacy policy

---

## Basic Usage

### Searching the Blockchain

The search bar is the primary entry point for all explorer queries. It accepts multiple input types and automatically routes to the appropriate result page.

**Supported Search Types:**

| Input Type | Example | Result Page |
|------------|---------|-------------|
| Wallet Address | `xdc1234...abcd` | Address detail page |
| Transaction Hash | `0xabcd...1234` | Transaction detail page |
| Block Number | `12345678` | Block detail page |
| Token Name | "XDC Token" | Token search results |
| Token Symbol | "XDC" | Token detail page |

**Search Tips:**

- Addresses must include the `xdc` prefix (not `0x`)
- Transaction hashes must be complete 66-character hex strings
- Block numbers can be entered as plain integers
- Partial token names trigger search results with matching tokens

### Viewing Transaction Details

A transaction detail page provides complete information about a single blockchain transaction.

**Core Fields:**

- **Transaction Hash:** Unique identifier for the transaction
- **Status:** Success, Failed, or Pending
- **Block:** Block number containing the transaction
- **Timestamp:** Exact time of block confirmation
- **From:** Sender address
- **To:** Recipient address (or contract address for contract creation)
- **Value:** Amount of XDC transferred
- **Transaction Fee:** Gas used multiplied by gas price
- **Gas Limit:** Maximum gas allocated by sender
- **Gas Used:** Actual gas consumed
- **Gas Price:** Price per unit of gas in wei
- **Nonce:** Transaction sequence number for the sender
- **Input Data:** Raw transaction payload (hexadecimal)

**Status Indicators:**

- **Success:** Green checkmark; transaction executed without errors
- **Failed:** Red warning; transaction reverted; gas still consumed
- **Pending:** Yellow spinner; transaction in mempool awaiting inclusion

### Inspecting Addresses

An address detail page aggregates all activity for a specific wallet or contract.

**Wallet Address Page:**

- **Balance:** Current XDC balance
- **XDC Value:** USD equivalent (XDCScan only)
- **Transaction Count:** Total transactions sent and received
- **Transaction History:** Chronological list with pagination
- **Token Holdings:** List of XRC20 and XRC721 tokens held
- **Token Transfers:** Filterable token transaction history

**Contract Address Page:**

All wallet fields plus:

- **Contract Creator:** Address that deployed the contract
- **Creation Transaction:** Hash of the deployment transaction
- **Verified Source Code:** If contract has been verified
- **Contract ABI:** Application Binary Interface for interaction
- **Read Contract:** Direct read-only function calls
- **Write Contract:** Direct state-changing function calls (requires wallet connection)
- **Contract Transactions:** All transactions targeting the contract

### Browsing Blocks

The block detail page shows aggregate data for a single block in the blockchain.

**Block Fields:**

- **Block Height:** Sequential block number
- **Timestamp:** Exact confirmation time
- **Transactions:** Count and list of included transactions
- **Validator:** Address of the masternode that produced the block
- **Block Hash:** Unique cryptographic hash of the block
- **Parent Hash:** Hash of the previous block
- **Gas Used:** Total gas consumed by all transactions
- **Gas Limit:** Maximum gas allowed for the block
- **Block Size:** Data size in bytes
- **Nonce:** Mining nonce (for XDPoS consensus)

**Block Navigation:**

- Click "Previous Block" or "Next Block" to navigate sequentially
- Jump to any block by entering the number in the search bar

### Tracking Tokens

Token detail pages provide comprehensive analytics for XRC20 fungible tokens and XRC721/XRC1155 non-fungible tokens.

**XRC20 Token Page:**

- **Token Contract:** Contract address
- **Total Supply:** Circulating token supply
- **Holders:** Number of unique holder addresses
- **Transfers:** Total transfer transaction count
- **Price:** Current market price (if listed)
- **Market Cap:** Total supply multiplied by price
- **Holder Distribution:** Top holders with percentages
- **Transfer History:** Recent token transfers with pagination

**XRC721/XRC1155 Token Page:**

- **Collection Name:** NFT collection identifier
- **Total Supply:** Number of minted tokens
- **Unique Holders:** Number of unique owners
- **Transfers:** Total transfer count
- **Token List:** Individual token IDs with metadata links
- **Recent Transfers:** Latest NFT transactions

---

## Contract Verification

Verifying smart contract source code on the explorer is essential for transparency and user trust. Verified contracts display readable source code, ABI, and enable direct interaction through the explorer interface.

### Why Verify Contracts

**Benefits:**

- Users can audit source code before interacting
- Explorer displays function names instead of raw selectors
- Direct contract interaction via Read/Write tabs
- Establishes developer credibility and project legitimacy
- Enables third-party integrations and tooling

### Verification Prerequisites

Before submitting for verification, ensure you have:

1. **Source Code:** Original Solidity or Vyper source files
2. **Compiler Version:** Exact compiler version used for deployment
3. **Optimization Settings:** Whether optimization was enabled and the runs parameter
4. **Constructor Arguments:** ABI-encoded constructor parameters (if any)
5. **Flattened Code:** Single-file version if using multi-file import statements

### Single File Verification

For contracts without external imports or with already-flattened code.

**Steps:**

1. Navigate to the contract address page on the explorer
2. Click the **Verify and Publish** button
3. Select **Solidity (Single File)** as the compiler type
4. Choose the exact compiler version from the dropdown
5. Select the appropriate license type
6. Paste the complete source code into the text area
7. Configure optimization settings to match deployment
8. Enter constructor arguments if the contract required them
9. Click **Verify and Publish**

**Result:** The explorer compiles the submitted code and compares the generated bytecode with the on-chain bytecode. If they match, verification succeeds.

### Multi-File Verification

For contracts using import statements and multiple source files.

**Steps:**

1. Click **Verify and Publish** on the contract page
2. Select **Solidity (Multi-Part Files)**
3. Choose compiler version and license
4. Upload all Solidity files including imported dependencies
5. Ensure the main contract file is clearly identified
6. Configure optimization and constructor arguments
7. Submit for verification

**Tips:**

- Use the same file structure as your development environment
- Include all OpenZeppelin or library imports
- The main contract should match the deployed contract name

### Flattening Code

Flattening combines all imports into a single file for easier single-file verification.

**Using Hardhat:**

```bash
npm install --save-dev hardhat-abi-exporter
npx hardhat flatten contracts/MyContract.sol > flattened.sol
```

**Using Foundry:**

```bash
forge flatten --output flattened.sol src/MyContract.sol
```

**Using Remix IDE:**

1. Open the contract in Remix
2. Right-click in the file explorer
3. Select **Flatten** option
4. Copy the flattened output

### Constructor Arguments

Contracts with constructors require ABI-encoded arguments for verification.

**Encoding Manually:**

Use the online ABI encoder or web3.js:

```javascript
const Web3 = require('web3');
const web3 = new Web3();

const args = [
  "MyToken",           // string
  "MTK",               // string
  18,                  // uint8
  web3.utils.toWei("1000000", "ether")  // uint256
];

const encoded = web3.eth.abi.encodeParameters(
  ['string', 'string', 'uint8', 'uint256'],
  args
);
console.log(encoded);
```

**Common Patterns:**

- No constructor: Leave blank
- Single address: `0x0000000000000000000000001234...abcd`
- Multiple values: Concatenate ABI-encoded values

### Proxy Contract Verification

Proxy patterns (Transparent Proxy, UUPS, Beacon) require special verification steps.

**Verification Process:**

1. Verify the implementation contract first
2. Navigate to the proxy contract address
3. Select **Solidity (Single File)** or appropriate option
4. Paste the proxy contract source code (minimal proxy code)
5. In the **More Options** section, mark as proxy
6. Enter the implementation contract address
7. Submit for verification

**Reading Proxy Contracts:**

Once verified as a proxy, the explorer automatically routes Read/Write calls to the implementation contract while displaying the proxy address.

### Troubleshooting Verification Failures

| Error | Cause | Solution |
|-------|-------|----------|
| Bytecode mismatch | Wrong compiler version | Verify exact version from deployment logs |
| Bytecode mismatch | Optimization mismatch | Match optimization enabled/disabled and runs |
| Bytecode mismatch | Extra metadata | Ensure no metadata hash differences |
| Missing constructor args | Empty constructor field | Provide ABI-encoded constructor arguments |
| Import not found | Missing dependency file | Use multi-file verification or flatten |
| SPDX license mismatch | Wrong license selected | Match license from source code comments |

---

## API Documentation

Both XDCScan and Apothem Explorer provide REST APIs for programmatic access to blockchain data. The API enables integration with wallets, dashboards, trading bots, and analytics platforms.

### API Key Setup

**Creating an API Key:**

1. Create an account on XDCScan (registration required)
2. Navigate to **API Keys** in account settings
3. Click **Create API Key**
4. Name your key (e.g., "Production Dashboard")
5. Copy the generated key immediately (shown only once)

**Rate Limits:**

| Plan | Requests per Second | Daily Limit |
|------|---------------------|-------------|
| Free | 5 | 10,000 |
| Standard | 10 | 100,000 |
| Professional | 25 | 500,000 |
| Enterprise | Custom | Custom |

**Authentication:**

Include the API key as a query parameter:

```
https://xdcscan.io/api?module=account&action=balance&address=xdc1234...&apikey=YourApiKey
```

### Core API Endpoints

#### Account Module

**Get XDC Balance:**

```
GET /api?module=account&action=balance&address={address}&tag=latest&apikey={key}
```

Response:

```json
{
  "status": "1",
  "message": "OK",
  "result": "1000000000000000000"
}
```

**Get Transaction List:**

```
GET /api?module=account&action=txlist&address={address}&startblock=0&endblock=99999999&sort=asc&apikey={key}
```

**Get Token Transfer Events:**

```
GET /api?module=account&action=tokentx&contractaddress={token}&address={holder}&page=1&offset=100&apikey={key}
```

**Get Token Balance:**

```
GET /api?module=account&action=tokenbalance&contractaddress={token}&address={holder}&tag=latest&apikey={key}
```

#### Contract Module

**Get Contract ABI:**

```
GET /api?module=contract&action=getabi&address={contract}&apikey={key}
```

Response:

```json
{
  "status": "1",
  "message": "OK",
  "result": "[{...}]"
}
```

**Get Contract Source Code:**

```
GET /api?module=contract&action=getsourcecode&address={contract}&apikey={key}
```

#### Transaction Module

**Get Transaction Receipt Status:**

```
GET /api?module=transaction&action=gettxreceiptstatus&txhash={hash}&apikey={key}
```

**Get Transaction Status:**

```
GET /api?module=transaction&action=getstatus&txhash={hash}&apikey={key}
```

#### Block Module

**Get Block Reward:**

```
GET /api?module=block&action=getblockreward&blockno={number}&apikey={key}
```

**Get Block Countdown:**

```
GET /api?module=block&action=getblockcountdown&blockno={number}&apikey={key}
```

#### Stats Module

**Get XDC Supply:**

```
GET /api?module=stats&action=xdcsupply&apikey={key}
```

**Get Validators:**

```
GET /api?module=stats&action=validators&apikey={key}
```

### API Response Format

All API responses follow a standard JSON structure:

```json
{
  "status": "1",
  "message": "OK",
  "result": "..."
}
```

**Status Codes:**

| Status | Meaning |
|--------|---------|
| "1" | Success |
| "0" | Error or no data |

**Error Handling:**

```javascript
const response = await fetch(apiUrl);
const data = await response.json();

if (data.status === "0") {
  console.error("API Error:", data.message);
  // Handle error: rate limit, invalid parameters, etc.
} else {
  // Process data.result
}
```

### Python API Client Example

```python
import requests

API_KEY = "YourApiKey"
BASE_URL = "https://xdcscan.io/api"

def get_balance(address):
    params = {
        "module": "account",
        "action": "balance",
        "address": address,
        "tag": "latest",
        "apikey": API_KEY
    }
    response = requests.get(BASE_URL, params=params)
    data = response.json()
    
    if data["status"] == "1":
        # Convert wei to XDC
        balance_xdc = int(data["result"]) / 10**18
        return balance_xdc
    else:
        raise Exception(f"API Error: {data['message']}")

# Example usage
address = "xdc1234567890abcdef1234567890abcdef12345678"
balance = get_balance(address)
print(f"Balance: {balance} XDC")
```

### JavaScript API Client Example

```javascript
const API_KEY = "YourApiKey";
const BASE_URL = "https://xdcscan.io/api";

async function getTransactions(address, page = 1, offset = 10) {
  const params = new URLSearchParams({
    module: "account",
    action: "txlist",
    address: address,
    startblock: "0",
    endblock: "99999999",
    page: page.toString(),
    offset: offset.toString(),
    sort: "desc",
    apikey: API_KEY
  });
  
  const response = await fetch(`${BASE_URL}?${params}`);
  const data = await response.json();
  
  if (data.status === "1") {
    return data.result.map(tx => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: parseInt(tx.value) / 1e18,
      timestamp: new Date(parseInt(tx.timeStamp) * 1000),
      gasUsed: tx.gasUsed,
      status: tx.txreceipt_status === "1" ? "Success" : "Failed"
    }));
  } else {
    throw new Error(data.message);
  }
}

// Example usage
getTransactions("xdc1234...abcd", 1, 5)
  .then(txs => console.log(txs))
  .catch(err => console.error(err));
```

---

## Advanced Features

### Event Log Decoding

Event logs are emitted by smart contracts during transaction execution. The explorer decodes these logs when the contract is verified, displaying human-readable event names and parameters.

**Viewing Event Logs:**

1. Navigate to a transaction detail page
2. Scroll to the **Logs** section
3. View decoded event names (e.g., `Transfer`, `Approval`)
4. Expand individual logs to see parameter names and values

**Topics Structure:**

- **Topic 0:** Event signature hash (keccak256 of event definition)
- **Topic 1-3:** Indexed parameters (up to 3)
- **Data:** Non-indexed parameters (ABI-encoded)

**Example Transfer Event:**

```solidity
event Transfer(address indexed from, address indexed to, uint256 value);
```

Decoded display:

- Topic 0: `0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef`
- Topic 1 (from): `0x000...0001234...abcd`
- Topic 2 (to): `0x000...0005678...efgh`
- Data (value): `1000000000000000000`

### Internal Transactions

Internal transactions are value transfers and contract calls triggered by external transactions. They are not recorded as separate transactions on the blockchain but can be traced through execution.

**Accessing Internal Transactions:**

1. Open a transaction detail page
2. Click the **Internal Transactions** tab
3. View the call trace showing:
   - Call depth and type (CALL, DELEGATECALL, STATICCALL)
   - From and to addresses
   - Value transferred
   - Gas used by each internal call

**Use Cases:**

- Tracking multi-hop transfers
- Debugging contract interactions
- Analyzing DeFi protocol flows
- Verifying token swap paths

### Gas Tracker

The gas tracker provides real-time and historical gas price data, helping users optimize transaction costs.

**Metrics Available:**

- **Safe Gas Price:** Confirmed within expected time
- **Propose Gas Price:** Standard confirmation speed
- **Fast Gas Price:** Priority confirmation
- **Average Block Time:** Current network block interval
- **Average Gas Limit:** Typical block capacity

**Historical Gas Charts:**

View gas price trends over time to identify optimal transaction windows and network congestion patterns.

### Analytics Dashboard

The explorer provides network-wide analytics for macro-level blockchain analysis.

**Available Charts:**

- Daily transaction count
- Active address count
- XDC transfer volume
- Smart contract deployments
- Validator performance metrics
- Token transfer volume by category

**Export Options:**

Most charts support CSV export for custom analysis in spreadsheet or data science tools.

---

## Troubleshooting

### Common Issues

**Transaction Not Found:**

- Verify the transaction hash is complete (66 characters)
- Check if the transaction was broadcast to the correct network (mainnet vs testnet)
- Pending transactions may take time to appear; wait for block inclusion
- If recently submitted, the transaction may still be in the mempool

**Balance Discrepancy:**

- Ensure you are viewing the correct network explorer
- Check for pending outgoing transactions that reduce available balance
- Verify the address format includes the `xdc` prefix
- Remember that token balances are separate from XDC native balance

**Contract Verification Failed:**

- Double-check compiler version matches deployment exactly
- Verify optimization settings are identical
- Ensure constructor arguments are properly ABI-encoded
- Try flattening multi-file contracts into a single file
- Check for SPDX license comment mismatches

**API Rate Limit Exceeded:**

- Implement request throttling in your application
- Cache responses for frequently accessed data
- Consider upgrading to a paid API plan for higher limits
- Use batch requests where supported

### Explorer-Specific Notes

**XDCScan Mainnet:**

- Serves production data; all values are real
- API keys are shared with Apothem for convenience
- Price data sourced from aggregated exchange APIs

**Apothem Testnet:**

- Test XDC has no real value
- Faucet available at https://faucet.apothem.network
- Same API structure as mainnet for seamless testing
- Useful for verifying contracts before mainnet deployment

---

## Best Practices

### For Developers

1. **Verify All Production Contracts:** Always verify source code for contracts users interact with
2. **Use APIs for Dashboards:** Build monitoring dashboards using explorer APIs instead of direct RPC for better performance
3. **Monitor Gas Prices:** Check gas tracker before submitting large batches of transactions
4. **Test on Apothem First:** Verify contracts and test integrations on testnet before mainnet
5. **Implement Caching:** Cache API responses to reduce load and improve application responsiveness

### For Users

1. **Verify Before Trusting:** Check contract verification status before interacting with DeFi protocols
2. **Double-Check Addresses:** Always verify recipient addresses on the explorer before large transfers
3. **Monitor Transactions:** Track pending transactions and confirm successful execution
4. **Review Event Logs:** For complex interactions, review decoded event logs to confirm expected outcomes

### For Validators

1. **Monitor Block Production:** Use explorer to verify your masternode is producing blocks correctly
2. **Track Rewards:** Monitor block rewards and transaction fee accumulation
3. **Analyze Performance:** Review missed blocks and optimize node connectivity

---

## Related Topics

- [Smart Contract Verification](../smartcontract/verify.md): Detailed contract verification workflow
- [API Reference](../api/index.md): Complete API endpoint documentation
- [Developer Quick Start](../xdcchain/developers/quick-guide.md): Getting started with XDC development
- [Wallet Configuration](../xdcchain/developers/wallet-configuration.md): Setting up wallets for development
- [XDC3.js SDK](../sdks/xdc3js.md): JavaScript SDK for blockchain interaction
- [Token Standards](../smartcontract/tokens/index.md): XRC20, XRC721, and XRC1155 specifications
