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

