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

